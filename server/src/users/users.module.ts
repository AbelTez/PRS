import {
  Module, Injectable, Controller, Get, Post, Body, Param,
  BadRequestException, NotFoundException, ForbiddenException, ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Db, Audit } from '../common/core.module';
import { User, CurrentUser, Roles } from '../auth/auth.module';

/**
 * Facility staff administration.
 *
 * Trust model of the exchange: an account only acts in a hospital's name if
 * that hospital's OWN IT administrator registered it AND verified it. Clinical
 * roles must carry the MoH professional license number, checked against the
 * national register during verification. Everything here is audited.
 */

const MANAGED_ROLES = ['hew', 'clinician', 'doctor', 'liaison', 'triage',
  'specialist', 'facility_admin', 'it_admin'];
const CLINICAL_ROLES = ['doctor', 'clinician', 'specialist'];
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || 'Password123!';

@Injectable()
export class UsersService {
  constructor(private db: Db, private audit: Audit) {}

  private present(u: any) {
    return {
      id: u.id, username: u.username, fullName: u.full_name, role: u.role,
      facilityId: u.facility_id, facilityName: u.facility_name ?? null,
      phone: u.phone, title: u.title, department: u.department,
      licenseNumber: u.license_number, status: u.status,
      createdAt: u.created_at, verifiedAt: u.verified_at, verifiedByName: u.verified_by_name ?? null,
    };
  }

  /** IT admin sees exactly the staff of their own facility; sysadmin sees all. */
  async list(user: CurrentUser) {
    const scoped = user.role !== 'sysadmin';
    const rows = await this.db.query(
      `SELECT u.*, f.name_lat AS facility_name, v.full_name AS verified_by_name
         FROM app_user u
         LEFT JOIN facility f ON f.id = u.facility_id
         LEFT JOIN app_user v ON v.id = u.verified_by
        WHERE u.role <> 'patient'
          ${scoped ? 'AND u.facility_id = $1' : ''}
        ORDER BY CASE u.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END,
                 u.full_name`,
      scoped ? [user.facilityId] : [],
    );
    return rows.map((u) => this.present(u));
  }

  async register(body: any, user: CurrentUser) {
    // IT admins can only ever register staff for their OWN facility.
    const facilityId = user.role === 'sysadmin'
      ? (body.facilityId || user.facilityId) : user.facilityId;
    if (!facilityId) throw new BadRequestException('No facility to register the account under');
    if (!body?.username || !body?.fullName || !body?.role) {
      throw new BadRequestException('username, fullName and role are required');
    }
    if (!MANAGED_ROLES.includes(body.role)) {
      throw new BadRequestException({ message: 'That role cannot be created here', allowed: MANAGED_ROLES });
    }
    if (CLINICAL_ROLES.includes(body.role) && !body.licenseNumber) {
      throw new BadRequestException({
        message: 'A clinical role requires the MoH professional license number',
        hint: 'The license is checked against the national register during verification.',
      });
    }
    const username = String(body.username).trim().toLowerCase();
    const existing = await this.db.one(`SELECT id FROM app_user WHERE username = $1`, [username]);
    if (existing) throw new ConflictException('Username already taken');

    const hash = await bcrypt.hash(body.password || DEFAULT_PASSWORD, 10);
    const row = await this.db.one(
      `INSERT INTO app_user (username, password_hash, full_name, role, facility_id, phone,
                             title, department, license_number, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')
       RETURNING *`,
      [username, hash, body.fullName, body.role, facilityId, body.phone ?? null,
       body.title ?? null, body.department ?? null, body.licenseNumber ?? null],
    );
    await this.audit.record({
      actorUserId: user.id, actorFacilityId: user.facilityId,
      action: 'user_register', resourceType: 'app_user', resourceId: row.id,
      detail: { role: body.role, facilityId },
    });
    return {
      ...this.present(row),
      note: `Account created in PENDING state — verify to activate.${body.password ? '' : ` Initial password: ${DEFAULT_PASSWORD}`}`,
    };
  }

  private async loadScoped(id: string, user: CurrentUser) {
    const target = await this.db.one(`SELECT * FROM app_user WHERE id = $1`, [id]);
    if (!target) throw new NotFoundException('User not found');
    if (user.role !== 'sysadmin' && target.facility_id !== user.facilityId) {
      throw new ForbiddenException('You can only manage accounts registered to your own facility');
    }
    if (target.role === 'sysadmin' && user.role !== 'sysadmin') {
      throw new ForbiddenException('System accounts are not facility-managed');
    }
    return target;
  }

  async verify(id: string, user: CurrentUser) {
    const target = await this.loadScoped(id, user);
    const row = await this.db.one(
      `UPDATE app_user SET status = 'active', verified_at = now(), verified_by = $2
        WHERE id = $1 RETURNING *`,
      [target.id, user.id],
    );
    await this.audit.record({
      actorUserId: user.id, actorFacilityId: user.facilityId,
      action: 'user_verify', resourceType: 'app_user', resourceId: id,
      detail: { license: target.license_number },
    });
    return this.present(row);
  }

  async deactivate(id: string, user: CurrentUser) {
    const target = await this.loadScoped(id, user);
    if (target.id === user.id) throw new BadRequestException('You cannot deactivate your own account');
    const row = await this.db.one(
      `UPDATE app_user SET status = 'disabled' WHERE id = $1 RETURNING *`, [target.id],
    );
    await this.audit.record({
      actorUserId: user.id, actorFacilityId: user.facilityId,
      action: 'user_deactivate', resourceType: 'app_user', resourceId: id,
    });
    return this.present(row);
  }

  async reactivate(id: string, user: CurrentUser) {
    const target = await this.loadScoped(id, user);
    const row = await this.db.one(
      `UPDATE app_user SET status = 'active', verified_at = COALESCE(verified_at, now()),
                           verified_by = COALESCE(verified_by, $2)
        WHERE id = $1 RETURNING *`,
      [target.id, user.id],
    );
    await this.audit.record({
      actorUserId: user.id, actorFacilityId: user.facilityId,
      action: 'user_reactivate', resourceType: 'app_user', resourceId: id,
    });
    return this.present(row);
  }
}

@Controller('v1/users')
export class UsersController {
  constructor(private svc: UsersService) {}

  @Get()
  @Roles('it_admin', 'facility_admin', 'sysadmin')
  list(@User() u: CurrentUser) { return this.svc.list(u); }

  @Post()
  @Roles('it_admin', 'sysadmin')
  register(@Body() b: any, @User() u: CurrentUser) { return this.svc.register(b, u); }

  @Post(':id/verify')
  @Roles('it_admin', 'sysadmin')
  verify(@Param('id') id: string, @User() u: CurrentUser) { return this.svc.verify(id, u); }

  @Post(':id/deactivate')
  @Roles('it_admin', 'sysadmin')
  deactivate(@Param('id') id: string, @User() u: CurrentUser) { return this.svc.deactivate(id, u); }

  @Post(':id/reactivate')
  @Roles('it_admin', 'sysadmin')
  reactivate(@Param('id') id: string, @User() u: CurrentUser) { return this.svc.reactivate(id, u); }
}

@Module({
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
