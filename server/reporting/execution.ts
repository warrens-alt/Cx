import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { RequestError } from '../bigquery/filters';
import { reportRequest } from './scope';
import { validateRelease } from './release';
import type { ReportRequest, ReleaseManifest } from '../../contracts/reporting';
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(',') + '}';
}
export const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
interface Ticket { version: 1; subject: string; request: ReportRequest; releaseId: string; releaseHash: string; expiresAt: number; }
export class ExecutionSigner {
  constructor(private readonly secret: string, private readonly clock: () => number = Date.now) {
    if (!secret || Buffer.byteLength(secret) < 32) throw new RequestError('CX_REPORT_SIGNING_KEY must contain at least 32 bytes', 503);
  }
  private signature(encoded: string) { return createHmac('sha256', this.secret).update(encoded).digest('base64url'); }
  create(subject: string, request: ReportRequest, release: ReleaseManifest) {
    validateRelease(release);
    if (request.tenantId !== release.tenantId || Date.parse(request.observationCutoff) > Date.parse(release.cutoff)) throw new RequestError('Request exceeds the release tenant or observation cutoff', 422);
    const ticket: Ticket = { version: 1, subject, request: reportRequest(request), releaseId: release.releaseId, releaseHash: digest(release), expiresAt: this.clock() + 24 * 3600000 };
    const encoded = Buffer.from(canonical(ticket)).toString('base64url');
    return `${encoded}.${this.signature(encoded)}`;
  }
  verify(token: unknown, subject: string): Ticket {
    if (typeof token !== 'string' || token.length > 20000) throw new RequestError('Invalid report token', 400);
    const parts = token.split('.');
    if (parts.length !== 2) throw new RequestError('Invalid report token', 400);
    const expected = Buffer.from(this.signature(parts[0])), actual = Buffer.from(parts[1]);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new RequestError('Report signature is invalid', 403);
    let t: Ticket;
    try { t = JSON.parse(Buffer.from(parts[0], 'base64url').toString()); } catch { throw new RequestError('Report token is invalid', 400); }
    if (t.version !== 1 || t.subject !== subject) throw new RequestError('Report belongs to a different identity or version', 403);
    if (!Number.isFinite(t.expiresAt) || t.expiresAt <= this.clock()) throw new RequestError('Report token expired; reopen the same data release', 410);
    t.request = reportRequest(t.request);
    return t;
  }
}
