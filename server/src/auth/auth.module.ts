import {
  Module, Injectable, Controller, Post, Body, Get, UnauthorizedException,
  CanActivate, ExecutionContext, SetMetadata, ForbiddenException, createParamDecorator,
} from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import * as bcrypt from 'bcryptjs';
import { Db, Audit } from '../common/core.module';

export interface CurrentUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  facilityId: string;
  facilityName?: string;
  facilityTier?: number;
  phone?: string;
  title?: string | null;
  department?: string | null;
  licenseNumber?: string | null;
  /** Set only for role 'patient': the patient row this account belongs to. */
  patientId?: string | null;
}

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';

/* ------------------------------------------------------------ decorators */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
export const PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(PUBLIC_KEY, true);

export const User = createParamDecorator((_data, ctx: ExecutionContext): CurrentUser => {
  return ctx.switchToHttp().getRequest().user;
});

/* ---------------------------------------------------------------- guard */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private reflector: Reflector,
    private db: Db,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('Missing bearer token');

    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token, { secret: JWT_SECRET });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const row = await this.db.one(
      `SELECT u.id, u.username, u.full_name, u.role, u.facility_id, u.phone, u.status,
              u.title, u.department, u.license_number, u.patient_id,
              f.name_lat AS facility_name, f.tier AS facility_tier
         FROM app_user u LEFT JOIN facility f ON f.id = u.facility_id
        WHERE u.id = $1`,
      [payload.sub],
    );
    if (!row || row.status !== 'active') throw new UnauthorizedException('User inactive');

    req.user = {
      id: row.id,
      username: row.username,
      fullName: row.full_name,
      role: row.role,
      facilityId: row.facility_id,
      facilityName: row.facility_name,
      facilityTier: row.facility_tier,
      phone: row.phone,
      title: row.title,
      department: row.department,
      licenseNumber: row.license_number,
      patientId: row.patient_id,
    } as CurrentUser;

    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (required?.length && !required.includes(req.user.role)) {
      throw new ForbiddenException(
        `Role '${req.user.role}' is not permitted here (requires: ${required.join(', ')})`,
      );
    }
    return true;
  }
}

/* -------------------------------------------------------------- service */
@Injectable()
export class AuthService {
  constructor(private db: Db, private jwt: JwtService, private audit: Audit) {}

  async login(username: string, password: string) {
    const u = await this.db.one(
      `SELECT u.*, f.name_lat AS facility_name, f.tier AS facility_tier
         FROM app_user u LEFT JOIN facility f ON f.id = u.facility_id
        WHERE u.username = $1`,
      [username],
    );
    if (!u) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) {
      await this.audit.record({
        actorUserId: u.id, action: 'login_failed', resourceType: 'app_user', resourceId: u.id,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verification gate: an account acts in a facility's name only after that
    // facility's own IT administrator has verified it.
    if (u.status === 'pending') {
      throw new ForbiddenException(
        "Your account is awaiting verification by your facility's IT administrator",
      );
    }
    if (u.status !== 'active') {
      throw new ForbiddenException(
        'Your account has been deactivated. Contact your facility IT administrator.',
      );
    }

    await this.audit.record({
      actorUserId: u.id, actorFacilityId: u.facility_id,
      action: 'login', resourceType: 'app_user', resourceId: u.id,
    });

    // NFR-SEC-04: short-lived access token
    const accessToken = await this.jwt.signAsync(
      { sub: u.id, role: u.role, fac: u.facility_id },
      { secret: JWT_SECRET, expiresIn: process.env.JWT_TTL || '12h' },
    );

    return {
      accessToken,
      user: {
        id: u.id, username: u.username, fullName: u.full_name, role: u.role,
        facilityId: u.facility_id, facilityName: u.facility_name,
        facilityTier: u.facility_tier, phone: u.phone,
        title: u.title, department: u.department,
        licenseNumber: u.license_number, patientId: u.patient_id,
      },
    };
  }
}

/* ----------------------------------------------------------- controller */
@Controller('v1/auth')
export class AuthController {
  constructor(private svc: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: { username: string; password: string }) {
    return this.svc.login(body?.username, body?.password);
  }

  @Get('me')
  me(@User() user: CurrentUser) {
    return user;
  }
}

@Module({
  imports: [JwtModule.register({ secret: JWT_SECRET })],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [JwtModule],
})
export class AuthModule {}
