import type { CheckEvidence, MetricDefinition, ReleaseManifest, ReportRequest, ReportResult, SourceEvidence } from '../../contracts/reporting';
import type { ExceptionRuleResult } from '../../contracts/operations';
import { readApiEnvelope } from './apiResponse';

export interface ReportingCatalogue {
  metrics: Array<MetricDefinition & { sourceTables: Array<{ fact: string; table: string | null; sourceStatus: string }> }>;
  metricVersion: string;
  modelVersion: string;
  available: boolean;
  reason: string | null;
  release: null | {
    releaseId: string;
    cutoff: string;
    sourceBatchIds: string[];
    sources: SourceEvidence[];
    checks: CheckEvidence[];
  };
}

export interface ExceptionCatalogueResponse {
  available: boolean;
  releaseId: string | null;
  cutoff: string | null;
  reason: string | null;
  rules: ExceptionRuleResult[];
}

export async function reportingRequest<T>(path: string, signal?: AbortSignal, body?: unknown): Promise<T> {
  const response = await fetch('/api/reporting' + path, {
    signal,
    credentials: 'same-origin',
    ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const json = await readApiEnvelope<T>(response, 'Reporting');
  return json.data as T;
}

export const reportingCatalogue = (tenantId: string, signal?: AbortSignal) => reportingRequest<ReportingCatalogue>('/catalogue?' + new URLSearchParams({ tenantId }), signal);
export const createEvidenceReport = (request: ReportRequest, releaseId: string, signal?: AbortSignal) => reportingRequest<ReportResult>('/reports', signal, { request, releaseId });
