import { createSourceRouter } from './bigquery/sourceRouter';
import { Router, type Request, type Response, type NextFunction } from 'express';
import * as legacy from './bigquery/queries';
import { getOverviewStats, getQualityStats, getCohortStats, getLeadTimeline, validationUnavailable } from './bigquery/reporting';
import { executeDynamicQuery, generateDriverInsights } from './bigquery/semantic_engine';
import { getClientConfig, getAllClients, validateEnvironment } from './bigquery/config';
import { checkBigQueryHealth } from './bigquery/client';
import { discoverData } from './bigquery/discovery';
import { parameterCoverage } from './bigquery/parameterCoverage';
import { metricTableLineage } from './bigquery/sourceCatalog';
import { exportData } from './bigquery/export';
import { validateScope, validateFilters, scalarString, boundedInteger, RequestError, type QueryScope } from './bigquery/filters';
import { withAnalyticsScope } from './analyticsContext';
import { requireTenant } from './securityPolicy';
import { requireAdmin } from './security';
import { cacheResponse } from './cacheMiddleware';
import { MODEL_VERSION } from './bigquery/integrity';

export const analyticsRouter = Router();
validateEnvironment();
function scopeFrom(req: Request): QueryScope {
  const input = req.method === 'GET' ? req.query : req.body || {};
  const filters = validateFilters(input.filters);
  for (const key of ['source', 'medium', 'vendor']) {
    const value = scalarString(input[key], key, 500);
    if (value) {
      const values=value.split(',').map(v=>v.trim()).filter(Boolean);
      const existing=filters[key];
      if(existing && (existing.operator!=='in'||JSON.stringify([...existing.values!].sort())!==JSON.stringify([...values].sort()))) throw new RequestError(`Conflicting ${key} filters`);
      if(!existing)filters[key]={operator:'in',values};
    }
  }
  // Old report functions implement vendor/partner cohort predicates for IN, not equality.
  for (const key of ['vendor', 'partner', 'ror_partner']) {
    const f = filters[key];
    if (f?.operator === 'equals') filters[key] = { operator: 'in', values: [f.value!] };
    else if (f && f.operator !== 'in') throw new RequestError(`Use an inclusion filter for ${key}`);
  }
  return validateScope({ clientId: input.clientId, startDate: input.startDate || input.dateRange?.start,
    endDate: input.endDate || input.dateRange?.end, filters });
}
analyticsRouter.use((req, res, next) => {
  try {
    if (!res.locals.principal) throw new RequestError('Authentication required', 401);
    if (req.path === '/clients') return next();
    const scope = scopeFrom(req), client = getClientConfig(scope.clientId);
    scope.clientId = client.id;
    requireTenant(res.locals.principal, client.id);
    res.locals.scope = scope;
    withAnalyticsScope(scope, () => next());
  } catch (error) { next(error); }
});
function metadata(res: Response, view: string) {
  const scope = res.locals.scope as QueryScope, client = getClientConfig(scope.clientId);
  return { clientId: client.id, clientName: client.name, currency: client.currency, generatedAt: new Date().toISOString(),
    dataAsOf: null, validationStatus: 'NOT_VERIFIED', modelVersion: MODEL_VERSION, appliedFilters: scope.filters,
    startDate: scope.startDate ?? null, endDate: scope.endDate ?? null, dateBasis: 'lead_capture_cohort', attribution: 'selected_vendor_transactions',
    sourceDependencies: metricTableLineage(scope.clientId).legacy,
    source: { type: 'bigquery', project: client.bigQueryProject, dataset: client.bigQueryDatasets[0], analyticsView: view } };
}
function asyncRoute(handler: (req: Request, res: Response) => Promise<unknown> | unknown) {
  return (req: Request, res: Response, next: NextFunction) => Promise.resolve().then(() => handler(req, res)).catch(next);
}
analyticsRouter.get('/clients', (_req, res) => {
  const allowed = res.locals.principal.tenants as string[];
  res.json({ success: true, data: getAllClients().filter(c => allowed.includes(c.id)).map(c => ({ id: c.id, name: c.name, currency: c.currency, timezone: c.timezone, capabilities: c.capabilities })) });
});
analyticsRouter.get('/health', asyncRoute(async (_req, res) => {
  const client = getClientConfig(res.locals.scope.clientId);
  const table = client.semanticMappings.tables.leads.split('.');
  const health = await checkBigQueryHealth(table[0], table[1], table[2]);
  res.json({ success: true, health, data: health, client: client.name });
}));
analyticsRouter.get('/discovery', requireAdmin, asyncRoute(async (_req, res) => res.json({ success: true, data: await discoverData(getClientConfig(res.locals.scope.clientId)) })));
analyticsRouter.get('/validation', requireAdmin, (_req, res) => res.json({ success: true, metadata: metadata(res, 'not_verified'), data: validationUnavailable() }));
analyticsRouter.get('/parameter-coverage', requireAdmin, asyncRoute(async (_req, res) => res.json({success:true,data:await parameterCoverage(res.locals.scope.clientId)})));
analyticsRouter.use(createSourceRouter());
const reports: [string[], (scope: QueryScope) => Promise<unknown>, boolean][] = [
  [['overview'], getOverviewStats, false], [['funnel'], legacy.getFunnelStats, false], [['quality'], getQualityStats, false],
  [['sources'], legacy.getSourcesStats, false], [['timeseries'], legacy.getTimeseriesStats, false],
  [['data-quality'], legacy.getDataHealthStats, true], [['calls', 'call-performance'], legacy.getCallPerformanceStats, true],
  [['speed-to-lead'], legacy.getSpeedToLeadStats, true], [['outcomes'], legacy.getOutcomesStats, true],
  [['routing'], legacy.getRoutingIntelligenceStats, true], [['consumers'], legacy.getConsumerReentryStats, true],
  [['outcomes-quality'], legacy.getOutcomeQualityStats, true], [['revetting'], legacy.getRevettingStats, true],
  [['data-trust'], legacy.getDataTrustStats, true], [['multi-vendor'], legacy.getMultiVendorStats, false],
  [['vendor-coverage', 'hlc-coverage'], legacy.getHlcVendorCoverage, true], [['filter-options'], legacy.getFilterOptions, true],
];
for (const [routes, query, mixedGrain] of reports) {
  analyticsRouter.get(routes.map(r => `/${r}`), cacheResponse(120), asyncRoute(async (_req, res) => {
    const scope = res.locals.scope as QueryScope;
    if (mixedGrain && Object.keys(scope.filters || {}).some(k => !['source', 'vendor', 'medium'].includes(k))) {
      throw new RequestError('This report supports date, source, vendor and medium filters. Advanced cross-grain filters require further validation.', 422);
    }
    const data = await query(scope);
    res.json({ success: true, metadata: metadata(res, routes[0]), data });
  }));
}
analyticsRouter.get('/cohorts', cacheResponse(120), asyncRoute(async (req, res) => {
  const data = await getCohortStats({ ...res.locals.scope, cohortType: scalarString(req.query.cohortType, 'cohortType'), metricType: scalarString(req.query.metricType, 'metricType') });
  res.json({ success: true, metadata: metadata(res, 'event_time_cohorts'), data });
}));
analyticsRouter.get('/leads', cacheResponse(60), asyncRoute(async (req, res) => {
  const data = await legacy.getLeads({ ...res.locals.scope, limit: boundedInteger(req.query.limit, 100, 1000, 1), offset: boundedInteger(req.query.offset, 0, 100000) });
  res.json({ success: true, metadata: metadata(res, 'vw_leads'), data: data.map(row => ({ ...row, quality: 'Not independently verified' })) });
}));
analyticsRouter.get('/lead-timeline/:leadId', cacheResponse(120), asyncRoute(async (req, res) => {
  const leadId = scalarString(req.params.leadId, 'leadId', 100);
  const data = await getLeadTimeline({ ...res.locals.scope, leadId: leadId! });
  res.json({ success: true, metadata: metadata(res, 'lead_timeline'), data });
}));
analyticsRouter.get('/export', asyncRoute(async (req, res) => {
  const format = scalarString(req.query.format, 'format') || 'csv';
  if (!['csv', 'json'].includes(format)) throw new RequestError('Unsupported export format');
  if (req.query.segment || req.query.chartBucket || req.query.metrics) throw new RequestError('Use explicit supported filters for chart exports; unsupported drill-down parameters are not ignored', 422);
  const result = await exportData({ ...res.locals.scope, grain: scalarString(req.query.grain, 'grain') || 'lead',
    format, limit: boundedInteger(req.query.limit, 10000, 50000, 1) });
  console.info(JSON.stringify({ action: 'DATA_EXPORT', subject: res.locals.principal.subject, clientId: res.locals.scope.clientId, rowCount: result.metadata.rowCount, truncated: result.metadata.truncated, modelVersion: MODEL_VERSION }));
  if (format === 'json') return res.json({ success: true, metadata: result.metadata, data: result.rows });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${res.locals.scope.clientId}_${result.metadata.grain}_export.csv"`);
  res.setHeader('X-Export-Truncated', String(result.metadata.truncated));
  res.setHeader('X-Export-Row-Count', String(result.metadata.rowCount));
  res.send(result.csv);
}));
for (const route of ['/explore', '/insights', '/drivers']) {
  const handler = asyncRoute(async (req, res) => {
    const input = req.method === 'GET' ? req.query : req.body;
    const metric = scalarString(input.metric, 'metric') || (route === '/explore' ? 'leads' : 'activations');
    const dimension = scalarString(input.dimension, 'dimension') || 'source';
    const args = { ...res.locals.scope, metric, dimension, secondaryDimension: scalarString(input.secondaryDimension, 'secondaryDimension') };
    const result = route === '/explore' ? await executeDynamicQuery(args) : await generateDriverInsights(args);
    res.json({ success: true, data: result.data, metadata: { ...metadata(res, route.slice(1)), ...result.metadata } });
  });
  analyticsRouter.get(route, cacheResponse(120), handler);
  analyticsRouter.post(route, handler);
}

analyticsRouter.post('/explain', (_req, _res, next) => next(new RequestError('AI explanations are disabled pending verified input scope and metric definitions.', 422)));
