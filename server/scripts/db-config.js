/**
 * Connection config shared by the migrate/seed/e2e scripts.
 *
 * Accepts either a managed-provider connection string (`DATABASE_URL` — Neon,
 * Supabase, RDS) or the discrete PG* variables used in local development, so
 * the same commands work against a laptop container and against production.
 */
const path = require('path');

// Load server/.env regardless of the directory the command was started from
// (root package.json scripts run these from the repo root), then fall back to
// a .env in the current working directory. dotenv never overwrites variables
// that are already set, so real environment variables always win.
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;

/** Managed providers require TLS; `PGSSL_NO_VERIFY=true` relaxes verification. */
function sslFor(connectionString) {
  const wantsSsl = /sslmode=(require|verify-ca|verify-full)/.test(connectionString || '')
    || process.env.PGSSL === 'true';
  if (!wantsSsl) return undefined;
  return { rejectUnauthorized: process.env.PGSSL_NO_VERIFY !== 'true' };
}

/**
 * Expand a connection string into explicit fields rather than handing `pg` the
 * raw string.
 *
 * `pg` merges the parsed connection string OVER the config object and treats a
 * missing port as absent, so any stray PGPORT/PGHOST in the environment (for
 * example the local Docker port in server/.env) silently wins over the URL —
 * which makes a remote database time out with an empty error message. Passing
 * discrete values leaves nothing for the environment to fill in.
 */
function fromUrl(connectionString) {
  const u = new URL(connectionString);
  const cfg = {
    host: u.hostname,
    port: u.port ? Number(u.port) : 5432,
    database: decodeURIComponent(u.pathname.replace(/^\//, '')) || undefined,
    user: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    ssl: sslFor(connectionString),
  };
  // Some providers pin the endpoint through a libpq options string.
  const options = u.searchParams.get('options');
  if (options) cfg.options = options;
  return cfg;
}

module.exports = url
  ? fromUrl(url)
  : {
    host: process.env.PGHOST || '127.0.0.1',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'erl',
    password: process.env.PGPASSWORD || 'erl',
    database: process.env.PGDATABASE || 'erl_dev',
  };
