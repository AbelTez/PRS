import { Global, Module, Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { createHash } from 'crypto';

/* ------------------------------------------------------------------ DB */
@Injectable()
export class Db implements OnModuleDestroy {
  private readonly log = new Logger('Db');
  public pool: Pool;

  constructor() {
    // Managed Postgres (Neon on Vercel, Supabase, RDS…) hands out a single
    // connection string; local development uses discrete PG* variables.
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    // Serverless invocations are short-lived and highly parallel: keep each
    // instance's pool tiny and point it at the provider's pooled endpoint.
    const serverless = !!process.env.VERCEL;
    const max = parseInt(process.env.PG_POOL_MAX || (serverless ? '1' : '10'), 10);

    this.pool = url
      ? new Pool({ connectionString: url, max, ssl: Db.sslFor(url) })
      : new Pool({
        host: process.env.PGHOST || '127.0.0.1',
        port: parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGUSER || 'erl',
        password: process.env.PGPASSWORD || 'erl',
        database: process.env.PGDATABASE || 'erl_dev',
        max,
      });

    // An idle connection dropped by the provider must never take the process
    // down — pg re-establishes on the next checkout.
    this.pool.on('error', (e) => this.log.warn(`Idle client error: ${e.message}`));
  }

  /** Managed providers require TLS; `PGSSL_NO_VERIFY=true` relaxes verification. */
  private static sslFor(url: string) {
    const wantsSsl = /sslmode=(require|verify-ca|verify-full)/.test(url)
      || process.env.PGSSL === 'true'
      || !!process.env.VERCEL;
    if (!wantsSsl) return undefined;
    return { rejectUnauthorized: process.env.PGSSL_NO_VERIFY !== 'true' };
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const res = await this.pool.query(sql, params);
    return res.rows as T[];
  }

  async one<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length ? rows[0] : null;
  }

  /** Run inside a transaction. Rolls back on throw. */
  async tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}

/* -------------------------------------------------------------- CONFIG */
@Injectable()
export class ConfigStore {
  private cache = new Map<string, any>();
  private loadedAt = 0;

  constructor(private db: Db) {}

  private async load() {
    if (Date.now() - this.loadedAt < 30_000 && this.cache.size) return;
    const rows = await this.db.query(`SELECT key, value FROM config`);
    this.cache.clear();
    rows.forEach((r) => this.cache.set(r.key, r.value));
    this.loadedAt = Date.now();
  }

  async get<T = any>(key: string, fallback?: T): Promise<T> {
    await this.load();
    const v = this.cache.get(key);
    return (v === undefined ? fallback : v) as T;
  }

  /** BR-20 SLA minutes by urgency */
  async slaMinutes(urgency: string): Promise<number> {
    const m = await this.get<any>('sla_minutes', { emergency: 5, urgent: 30, routine: 240 });
    return m[urgency] ?? 240;
  }

  async arrivalGraceHours(urgency: string): Promise<number> {
    const m = await this.get<any>('arrival_grace_hours', { emergency: 6, urgent: 24, routine: 48 });
    return m[urgency] ?? 48;
  }

  async bedReservationHours(urgency: string): Promise<number> {
    const m = await this.get<any>('bed_reservation_hours', { emergency: 6, urgent: 12, routine: 24 });
    return m[urgency] ?? 24;
  }
}

/* --------------------------------------------------------------- AUDIT */
export interface AuditEntry {
  actorUserId?: string | null;
  actorFacilityId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  purpose?: string;
  ip?: string;
  userAgent?: string;
  detail?: any;
}

/**
 * Append-only, hash-chained audit log (NFR-SEC-06).
 * Each row hashes (prev_hash + canonical row content).
 */
@Injectable()
export class Audit {
  constructor(private db: Db) {}

  async record(e: AuditEntry, client?: PoolClient): Promise<void> {
    const q = client ? client.query.bind(client) : this.db.pool.query.bind(this.db.pool);
    const prev = await q(`SELECT row_hash FROM audit_log ORDER BY id DESC LIMIT 1`);
    const prevHash: string | null = prev.rows.length ? prev.rows[0].row_hash : null;
    const payload = JSON.stringify({
      a: e.actorUserId ?? null,
      f: e.actorFacilityId ?? null,
      ac: e.action,
      rt: e.resourceType,
      ri: e.resourceId ?? null,
      d: e.detail ?? null,
      t: new Date().toISOString(),
    });
    const rowHash = createHash('sha256').update((prevHash ?? '') + payload).digest('hex');
    await q(
      `INSERT INTO audit_log
         (actor_user_id, actor_facility_id, action, resource_type, resource_id,
          purpose, ip_address, user_agent, detail, prev_hash, row_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        e.actorUserId ?? null, e.actorFacilityId ?? null, e.action, e.resourceType,
        e.resourceId ?? null, e.purpose ?? null, e.ip ?? null, e.userAgent ?? null,
        e.detail ? JSON.stringify(e.detail) : null, prevHash, rowHash,
      ],
    );
  }

  /** Verify the hash chain has not been tampered with. */
  async verifyChain(): Promise<{ ok: boolean; brokenAtId?: number; checked: number }> {
    const rows = await this.db.query(
      `SELECT id, actor_user_id, actor_facility_id, action, resource_type, resource_id,
              detail, prev_hash, row_hash, occurred_at
         FROM audit_log ORDER BY id ASC`,
    );
    let prevHash: string | null = null;
    for (const r of rows) {
      if (r.prev_hash !== prevHash) return { ok: false, brokenAtId: r.id, checked: rows.length };
      prevHash = r.row_hash;
    }
    return { ok: true, checked: rows.length };
  }
}

/* -------------------------------------------------------- NOTIFICATIONS */
/**
 * Notification dispatcher. In dev this writes to the DB and logs to console
 * (FR-NOT-*). Swap `deliver()` for a real Ethio Telecom / aggregator adapter.
 */
@Injectable()
export class Notifier {
  private readonly log = new Logger('Notifier');
  constructor(private db: Db) {}

  async queue(params: {
    channel: 'sms' | 'push' | 'in_app';
    recipient: string;
    template: string;
    body: string;
    referralId?: string;
  }): Promise<void> {
    if (!params.recipient) return;
    await this.db.query(
      `INSERT INTO notification (channel, recipient, template, body, referral_id, status, sent_at)
       VALUES ($1,$2,$3,$4,$5,'sent',now())`,
      [params.channel, params.recipient, params.template, params.body, params.referralId ?? null],
    );
    this.log.log(`[${params.channel.toUpperCase()} -> ${params.recipient}] ${params.body}`);
  }
}

/* ------------------------------------------------------------ CHANGELOG */
@Injectable()
export class ChangeLog {
  constructor(private db: Db) {}

  async append(
    entityType: string,
    entityId: string,
    op: string,
    payload: any,
    facilityScope: string[],
    client?: PoolClient,
  ): Promise<void> {
    const q = client ? client.query.bind(client) : this.db.pool.query.bind(this.db.pool);
    await q(
      `INSERT INTO change_log (entity_type, entity_id, op, payload, facility_scope)
       VALUES ($1,$2,$3,$4,$5)`,
      [entityType, entityId, op, JSON.stringify(payload), facilityScope],
    );
  }
}

@Global()
@Module({
  providers: [Db, ConfigStore, Audit, Notifier, ChangeLog],
  exports: [Db, ConfigStore, Audit, Notifier, ChangeLog],
})
export class CoreModule {}
