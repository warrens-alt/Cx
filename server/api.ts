import { Router, type Request, type Response, type NextFunction } from 'express';
import * as operational from './bigquery/queries';
import * as audited from './bigquery/auditedQueries';
import { executeDynamicQuery, generateDriverInsights } from './bigquery/semantic_engine';
import { exportData } from './bigquery/export';
import { getAllClients, getClientConfig } from './bigquery/config';
import { discoverData } from './bigquery/discovery';
import { checkBigQueryHealth } from './bigquery/client';
import { CANONICAL_PARAMETERS } from './bigquery/registry';
import { boundedInteger, RequestError, scalarString, validateScope, validateFilters, type QueryScope } from './bigquery/filters';
import { MODEL_VERSION } from './bigquery/integrity';
import { withAnalyticsScope } from './analyticsContext';
import { requireTenant } from './securityPolicy';
import { requireAdmin } from './security';
import { cacheResponse } from './cacheMiddleware';

export const analyticsRouter = Router();
type Handler = (req: Request, res: Response) => Promise<unknown> | unknown;
const asyncRoute = (handler: Handler) => (req: Request, res: Response, next: NextFunction) => Promise.resolve().then(() => handler(req, res)).catch(next);
function input(req: Request, key: string): unknown {
  const query = req.query[key], body = req.body?.[key];
  if (query !== undefined && body !== undefined && JSON.stringify(query) !== JSON.stringify(body)) throw new RequestError(`Conflicting ${key}`);
  return query ?? body;
}
export function requestScope(req: Request): QueryScope {
  const endDate = scalarString(input(req, 'endDate') ?? req.body?.dateRange?.end, 'endDate', 10) || new Date().toISOString().slice(0, 10);
  const startDate = scalarString(input(req, 'startDate') ?? req.body?.dateRange?.start, 'startDate', 10);
  const filters = validateFilters(input(req, 'filters'));
  for (const key of ['source', 'vendor', 'medium']) {
    const text = scalarString(input(req, key), key, 2000);
    if (text) {
      const values = text.split(',').map(s => s.trim()).filter(Boolean);
      if (filters[key] && JSON.stringify(filters[key]) !== JSON.stringify({ operator: 'in', values })) throw new RequestError(`Conflicting ${key} filter`);
      filters[key] = { operator: 'in', values };
    }
  }
  const scope = validateScope({ clientId: input(req, 'clientId'), startDate, endDate, filters });
  if (!scope.startDate) scope.startDate = new Date(Date.parse(scope.endDate!) - 29 * 86400000).toISOString().slice(0, 10);
  if ((Date.parse(scope.endDate!) - Date.parse(scope.startDate)) / 86400000 > 365) throw new RequestError('Date ranges are limited to 366 inclusive days');
  return scope;
}
analyticsRouter.get('/clients', (req, res) => {
  const allowed: string[] = res.locals.principal.tenants;
  res.json({ success: true, data: getAllClients().filter(c => allowed.includes(c.id)).map(({ id, name, currency, timezone, capabilities }) => ({ id, name, currency, timezone, capabilities })) });
});
analyticsRouter.use((req, res, next) => {
  try {
    if (!['GET', 'POST', 'HEAD'].includes(req.method)) throw new RequestError('Method not allowed', 405);
    const scope = requestScope(req), client = getClientConfig(scope.clientId);
    requireTenant(res.locals.principal, client.id);
    res.locals.scope = scope;
    withAnalyticsScope(scope, next);
  } catch (error) { next(error); }
});
function response(res: Response, data: unknown, analyticsView = 'vw_leads', extraMetadata = {}) {
  const scope: QueryScope = res.locals.scope, client = getClientConfig(scope.clientId);
  return { success: true, data, metadata: { clientId: client.id, clientName: client.name, currency: client.currency,
    generatedAt: new Date().toISOString(), dataAsOf: null, validationStatus: 'NOT_VERIFIED', modelVersion: MODEL_VERSION,
    appliedFilters: scope.filters, startDate: scope.startDate, endDate: scope.endDate,
    attribution: 'selected_vendor_transactions', dateBasis: 'lead_capture_cohort', sourceTimezoneVerified: false,
    source: { type: 'bigquery', project: client.bigQueryProject, dataset: client.bigQueryDatasets[0], analyticsView }, ...extraMetadata } };
}
const endpoints: Record<string, (params: any) => Promise<any>> = {
  overview: audited.getOverviewStats, funnel: audited.getFunnelStats, quality: audited.getQualityStats,
  'speed-to-lead': audited.getSpeedToLeadStats, cohorts: audited.getCohortStats, acquisition: audited.getAcquisitionStats,
  validation: audited.getReconciliationValidation,
  'filter-options': operational.getFilterOptions, 'data-quality': operational.getDataHealthStats,
  calls: operational.getCallPerformanceStats, 'call-performance': operational.getCallPerformanceStats,
  sources: operational.getSourcesStats, timeseries: operational.getTimeseriesStats, outcomes: operational.getOutcomesStats,
  routing: operational.getRoutingIntelligenceStats, consumers: operational.getConsumerReentryStats,
  'outcomes-quality': operational.getOutcomeQualityStats, revetting: operational.getRevettingStats,
  'data-trust': operational.getDataTrustStats, 'multi-vendor': operational.getMultiVendorStats,
  'vendor-coverage': operational.getHlcVendorCoverage, 'hlc-coverage': operational.getHlcVendorCoverage,
};
for (const [route, query] of Object.entries(endpoints)) {
  analyticsRouter.get(`/${route}`, cacheResponse(120), asyncRoute(async (req, res) => {
    const extras = route === 'cohorts' ? { cohortType: scalarString(req.query.cohortType, 'cohortType'), metricType: scalarString(req.query.metricType, 'metricType') } : {};
    res.json(response(res, await query({ ...res.locals.scope, ...extras })));
  }));
}
analyticsRouter.get('/leads', cacheResponse(60), asyncRoute(async (req, res) => {
  res.json(response(res, await audited.getLeads({ ...res.locals.scope, limit: boundedInteger(req.query.limit, 100, 1000, 1), offset: boundedInteger(req.query.offset, 0, 100000) })));
}));
analyticsRouter.get('/lead-timeline/:leadId', cacheResponse(60), asyncRoute(async (req, res) => {
  const leadId = scalarString(req.params.leadId, 'leadId', 128);
  if (!leadId) throw new RequestError('Lead ID is required');
  res.json(response(res, await audited.getLeadTimeline({ ...res.locals.scope, leadId }), 'vw_lead_vendor_transactions'));
}));
analyticsRouter.get('/health', asyncRoute(async (_req, res) => {
  const client = getClientConfig(res.locals.scope.clientId), parts = client.semanticMappings.tables.leads.split('.');
  const health = await checkBigQueryHealth(parts[0], parts[1], parts[2]);
  res.json({ ...response(res, health), health, client: client.name });
}));
analyticsRouter.get('/discovery', requireAdmin, asyncRoute(async (_req, res) => res.json(response(res, await discoverData(getClientConfig(res.locals.scope.clientId))))));
analyticsRouter.get('/parameter-coverage', (req, res) => {
  const mapped = CANONICAL_PARAMETERS.filter(p => p.status === 'MAPPED').length;
  res.json(response(res, { summary: { totalRequired: CANONICAL_PARAMETERS.length, mapped, populated: null,
    unavailable: CANONICAL_PARAMETERS.length - mapped, sourceConflicts: null,
    coveragePercent: CANONICAL_PARAMETERS.length ? (100 * mapped / CANONICAL_PARAMETERS.length).toFixed(1) : null,
    basis: 'Configured mappings only. Population and conflicts have not been measured.' }, parameters: CANONICAL_PARAMETERS }));
});
for (const route of ['insights', 'drivers']) {
  analyticsRouter.route(`/${route}`).get(cacheResponse(120), asyncRoute(async (req, res) => {
    const result = await generateDriverInsights({ ...res.locals.scope, metric: scalarString(req.query.metric, 'metric') || 'activations', dimension: scalarString(req.query.dimension, 'dimension') || 'source' });
    res.json(response(res, result.data, 'vw_leads', { metric: result.metric, dimension: result.dimension, daysCompared: result.daysCompared, comparison: result.comparison, interpretation: result.interpretation }));
  })).post(asyncRoute(async (req, res) => {
    const result = await generateDriverInsights({ ...res.locals.scope, metric: scalarString(req.body?.metric, 'metric') || 'activations', dimension: scalarString(req.body?.dimension, 'dimension') || 'source' });
    res.json(response(res, result.data, 'vw_leads', { metric: result.metric, dimension: result.dimension, daysCompared: result.daysCompared, comparison: result.comparison, interpretation: result.interpretation }));
  }));
}
const explore = asyncRoute(async (req, res) => {
  const result = await executeDynamicQuery({ ...res.locals.scope, metric: scalarString(input(req, 'metric'), 'metric') || 'leads',
    dimension: scalarString(input(req, 'dimension'), 'dimension') || 'source', secondaryDimension: scalarString(input(req, 'secondaryDimension'), 'secondaryDimension') });
  res.json(response(res, result.data, 'vw_leads', result.metadata));
});
analyticsRouter.get('/explore', cacheResponse(120), explore);
analyticsRouter.post('/explore', explore);
analyticsRouter.get('/export', asyncRoute(async (req, res) => {
  const grain = scalarString(req.query.grain, 'grain') || 'lead', format = scalarString(req.query.format, 'format') || 'csv';
  if (!['csv', 'json'].includes(format)) throw new RequestError('Unsupported export format');
  if (req.query.metrics !== undefined) throw new RequestError('Metric-specific export projection is not supported; export the complete analytical record', 422);
  if (grain === 'raw_source' && (res.locals.principal.role !== 'admin' || process.env.ALLOW_RAW_EXPORTS !== 'true')) throw new RequestError('Redacted source exports require administrator access and ALLOW_RAW_EXPORTS=true', 403);
  const scope: QueryScope = { ...res.locals.scope, filters: { ...res.locals.scope.filters } };
  const segment = scalarString(req.query.segment, 'segment'), bucket = scalarString(req.query.chartBucket, 'chartBucket');
  if (segment || bucket) {
    if (!segment || !bucket) throw new RequestError('Both segment and chartBucket are required');
    if (scope.filters?.[segment]) throw new RequestError('Drill-down conflicts with an existing filter; set the intended filter explicitly', 422);
    scope.filters = validateFilters({ ...scope.filters, [segment]: { operator: 'in', values: [bucket] } });
  }
  const result = await exportData({ ...scope, grain, format, limit: boundedInteger(req.query.limit, 10000, 50000, 1) });
  res.setHeader('X-Export-Truncated', String(result.metadata.truncated));
  res.setHeader('X-Export-Row-Count', String(result.metadata.rowCount));
  res.setHeader('X-Model-Version', MODEL_VERSION);
  console.info(JSON.stringify({ action: 'DATA_EXPORT', requestId: res.locals.requestId, subject: res.locals.principal.subject, tenant: scope.clientId,
    grain, rowCount: result.metadata.rowCount, truncated: result.metadata.truncated, modelVersion: MODEL_VERSION }));
  if (format === 'json') return res.json({ success: true, data: result.rows, metadata: result.metadata });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${scope.clientId}_${grain}_${new Date().toISOString().slice(0, 10)}.csv"`);
  return res.send(result.csv);
}));
analyticsRouter.post('/explain', asyncRoute(async (_req, res) => {
  if (process.env.ENABLE_AI_EXPLANATIONS !== 'true' || !process.env.GEMINI_API_KEY) throw new RequestError('AI explanations are not enabled', 503);
  // Recompute approved aggregates; do not trust or forward caller-supplied metrics, prompts or raw records.
  const m = await audited.getOverviewStats(res.locals.scope);
  const safeMetrics = Object.fromEntries(['leads', 'delivered', 'called', 'rpcs', 'sales', 'billableSales', 'activations', 'revenue'].map(key => [key, (m as any)[key]]));
  const { GoogleGenAI } = await import('@google/genai');
  const result = await new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }).models.generateContent({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    contents: `Summarise these unverified aggregate operational metrics in under 150 words. Distinguish recorded facts, observations and explicitly labelled hypotheses. Do not claim causal effects, collected revenue, verified reconciliation or financial loss. Do not invent metrics. Data: ${JSON.stringify(safeMetrics)}` });
  res.json({ success: true, explanation: result.text, metadata: { validationStatus: 'NOT_VERIFIED' } });
}));
for (const route of ['campaigns', 'grades']) analyticsRouter.get(`/${route}`, (_req, _res, next) => next(new RequestError('Endpoint mapping is not implemented', 501)));
