import {
  Injectable, Controller, Get, Post, Body, Param,
  BadRequestException, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Db, Audit } from '../common/core.module';
import { User, CurrentUser } from '../auth/auth.module';

/**
 * Imaging & documents that travel with a referral (X-ray, MRI, ultrasound,
 * lab PDFs) so the receiving team never repeats a test the patient already had.
 *
 * Pilot storage: content is kept in Postgres (transactional, in-country,
 * nothing extra to operate). The production path — object storage with
 * `object_key` + `sha256` only in this table — is documented in
 * docs/PROJECT_STATE.md. The API shape will not change when that swap happens.
 */

const MAX_BYTES = 1_500_000;
const ALLOWED_MIME = /^(image\/(png|jpe?g|webp|gif|svg\+xml)|application\/pdf)$/;

@Injectable()
export class AttachmentsService {
  constructor(private db: Db, private audit: Audit) {}

  /** Clinical parties only — the same relationship rule as the chart (BR-51). */
  private async loadForParty(referralId: string, user: CurrentUser) {
    const r = await this.db.one(`SELECT * FROM referral WHERE id = $1`, [referralId]);
    if (!r) throw new NotFoundException('Referral not found');
    const clinicalRoles = ['hew', 'clinician', 'doctor', 'liaison', 'triage', 'specialist', 'sysadmin'];
    const party = r.origin_facility_id === user.facilityId || r.target_facility_id === user.facilityId;
    if (!clinicalRoles.includes(user.role) || (!party && user.role !== 'sysadmin')) {
      throw new ForbiddenException('BR-51: only the clinical teams party to this referral can access its attachments');
    }
    return r;
  }

  async add(referralId: string, body: any, user: CurrentUser) {
    const r = await this.loadForParty(referralId, user);
    if (String(r.status).startsWith('CLOSED_')) {
      throw new BadRequestException('Closed referrals are immutable (BR-36)');
    }
    const dataUrl: string = body?.dataUrl || '';
    const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    if (!m || !body?.name) throw new BadRequestException('Attachment requires name and a base64 dataUrl');
    const mime = m[1];
    if (!ALLOWED_MIME.test(mime)) {
      throw new BadRequestException('Only images (X-ray, MRI, ultrasound photos) and PDF documents are accepted');
    }
    const content = Buffer.from(m[2], 'base64');
    if (content.length > MAX_BYTES) {
      throw new BadRequestException(`Attachment too large (${(content.length / 1e6).toFixed(1)} MB, max 1.5 MB). Compress the image first.`);
    }
    const row = await this.db.one(
      `INSERT INTO referral_attachment
         (referral_id, kind, object_key, sha256, size_bytes, mime_type, uploaded_by, file_name, content)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, file_name, mime_type, size_bytes, kind, uploaded_at`,
      [referralId, body.kind ?? 'document', `db://${referralId}/${body.name}`,
       createHash('sha256').update(content).digest('hex'),
       content.length, mime, user.id, body.name, content],
    );
    await this.db.query(
      `INSERT INTO referral_transition (referral_id, from_status, to_status, event, actor_user_id, actor_user_name, actor_facility_id, note)
       VALUES ($1,$2,$2,'attachment_added',$3,$4,$5,$6)`,
      [referralId, r.status, user.id, user.fullName, user.facilityId, `Attached ${body.name}`],
    );
    await this.audit.record({
      actorUserId: user.id, actorFacilityId: user.facilityId,
      action: 'attachment_add', resourceType: 'referral', resourceId: referralId,
      detail: { name: body.name, mime, size: content.length },
    });
    return {
      ok: true,
      attachment: {
        id: row.id, name: row.file_name, type: row.mime_type,
        size: row.size_bytes, kind: row.kind, uploadedAt: row.uploaded_at,
        uploadedBy: user.fullName,
      },
    };
  }

  async content(referralId: string, attachmentId: string, user: CurrentUser) {
    await this.loadForParty(referralId, user);
    const a = await this.db.one(
      `SELECT id, file_name, mime_type, size_bytes, content
         FROM referral_attachment WHERE id = $1 AND referral_id = $2`,
      [attachmentId, referralId],
    );
    if (!a) throw new NotFoundException('Attachment not found');
    await this.audit.record({
      actorUserId: user.id, actorFacilityId: user.facilityId,
      action: 'attachment_read', resourceType: 'referral', resourceId: referralId,
      purpose: 'care_coordination', detail: { attachmentId },
    });
    return {
      id: a.id, name: a.file_name, type: a.mime_type, size: a.size_bytes,
      dataUrl: a.content ? `data:${a.mime_type};base64,${a.content.toString('base64')}` : null,
    };
  }
}

@Controller('v1/referrals')
export class AttachmentsController {
  constructor(private svc: AttachmentsService) {}

  @Post(':id/attachments')
  add(@Param('id') id: string, @Body() b: any, @User() u: CurrentUser) {
    return this.svc.add(id, b, u);
  }

  @Get(':id/attachments/:aid')
  content(@Param('id') id: string, @Param('aid') aid: string, @User() u: CurrentUser) {
    return this.svc.content(id, aid, u);
  }
}
