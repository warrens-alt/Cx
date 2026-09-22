import { METRIC_BY_ID, type ReportRequest, type ReleaseManifest } from '../../contracts/reporting';
import { RequestError } from '../bigquery/filters';
import { metricAvailability } from './release';
export interface CompiledQuery { query: string; params: Record<string, unknown>; }
const table = (id: string) => { if (!/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+$/.test(id)) throw new RequestError('Invalid snapshot table', 503); return `\`${id}\``; };
/** All joins follow asserted many-to-one keys. Metrics aggregate their own grain, never an event cross-product. */
export function populationQuery(req: ReportRequest, release: ReleaseManifest): CompiledQuery {
  const params: Record<string, unknown> = { tenant: req.tenantId, start: req.startDate, end: req.endDate, cutoff: req.observationCutoff, currency: req.currency };
  const pred = (key: 'source' | 'vendor' | 'medium', field: string) => {
    const values = req.filters[key];
    if (!values) return 'TRUE';
    return `${field} IN (${values.map((v, i) => { params[`${key}_${i}`] = v; return `@${key}_${i}`; }).join(',')})`;
  };
  const source = pred('source', 'l.source'), medium = pred('medium', 'l.medium'), vendor = pred('vendor', 'd.vendor');
  const captureScope = req.dateBasis === 'capture_cohort' ? 'AND DATE(l.captured_at) BETWEEN CAST(@start AS DATE) AND CAST(@end AS DATE)' : '';
  const ref = (name: keyof ReleaseManifest['snapshots']) => table(release.snapshots[name].table);
  const base = `WITH
  l AS (SELECT * FROM ${ref('leads')} l WHERE tenant_id=@tenant AND l.captured_at<=TIMESTAMP(@cutoff) AND ${source} AND ${medium} ${captureScope}),
  d0 AS (SELECT d.*, l.source, l.medium, l.captured_at FROM ${ref('deliveries')} d JOIN l ON d.tenant_id=l.tenant_id AND d.lead_key=l.entity_key
    WHERE d.attempted_at<=TIMESTAMP(@cutoff) AND ${vendor}),
  d AS (SELECT * FROM d0 WHERE delivered_at IS NOT NULL AND delivered_at<=TIMESTAMP(@cutoff)),
  c AS (SELECT c.*, d.vendor,d.source,d.medium,d.captured_at,d.lead_key FROM ${ref('calls')} c JOIN d0 d ON c.tenant_id=d.tenant_id AND c.delivery_key=d.entity_key WHERE c.event_at<=TIMESTAMP(@cutoff)),
  s AS (SELECT s.*, d.vendor,d.source,d.medium,d.captured_at,d.lead_key FROM ${ref('sales')} s JOIN d0 d ON s.tenant_id=d.tenant_id AND s.delivery_key=d.entity_key WHERE s.event_at<=TIMESTAMP(@cutoff)),
  a AS (SELECT a.*, s.vendor,s.source,s.medium,s.captured_at,s.lead_key FROM ${ref('activations')} a JOIN s ON a.tenant_id=s.tenant_id AND a.sale_key=s.entity_key WHERE a.event_at<=TIMESTAMP(@cutoff)),
  f AS (SELECT f.*, s.vendor,s.source,s.medium,s.captured_at,s.lead_key FROM ${ref('commercial')} f JOIN s ON f.tenant_id=s.tenant_id AND f.sale_key=s.entity_key WHERE f.event_at<=TIMESTAMP(@cutoff) AND f.currency=@currency),
  called AS (SELECT d.entity_key, MIN(c.event_at) AS first_call FROM d JOIN c ON c.delivery_key=d.entity_key AND c.tenant_id=d.tenant_id AND c.event_at>=d.delivered_at GROUP BY d.entity_key),
  activated AS (SELECT DISTINCT sale_key FROM a),
  population AS (
    SELECT 'fetched_leads' AS metric_id,l.entity_key,l.entity_key AS lead_key,CAST(NULL AS STRING) AS vendor,l.source,l.medium,l.captured_at,l.captured_at AS event_at,CAST(1 AS NUMERIC) AS numerator,CAST(NULL AS NUMERIC) AS denominator,l.source_record_id,l.batch_id,CAST(NULL AS STRING) AS commercial_stage,CAST(NULL AS STRING) AS currency,CAST(NULL AS STRING) AS agreement_version
      FROM l ${req.filters.vendor ? 'WHERE EXISTS(SELECT 1 FROM d0 WHERE d0.lead_key=l.entity_key)' : ''}
    UNION ALL SELECT 'delivered_episodes',entity_key,lead_key,vendor,source,medium,captured_at,delivered_at,1,NULL,source_record_id,batch_id,NULL,NULL,NULL FROM d
    UNION ALL SELECT 'call_attempts',entity_key,lead_key,vendor,source,medium,captured_at,event_at,1,NULL,source_record_id,batch_id,NULL,NULL,NULL FROM c
    UNION ALL SELECT 'called_episodes',d.entity_key,d.lead_key,d.vendor,d.source,d.medium,d.captured_at,called.first_call,1,NULL,d.source_record_id,d.batch_id,NULL,NULL,NULL FROM d JOIN called USING(entity_key)
    UNION ALL SELECT 'call_coverage',d.entity_key,d.lead_key,d.vendor,d.source,d.medium,d.captured_at,d.delivered_at,IF(called.entity_key IS NULL,0,1),1,d.source_record_id,d.batch_id,NULL,NULL,NULL FROM d LEFT JOIN called USING(entity_key)
    UNION ALL SELECT 'sale_events',entity_key,lead_key,vendor,source,medium,captured_at,event_at,1,NULL,source_record_id,batch_id,NULL,NULL,NULL FROM s
    UNION ALL SELECT 'activation_events',entity_key,lead_key,vendor,source,medium,captured_at,event_at,1,NULL,source_record_id,batch_id,NULL,NULL,NULL FROM a
    UNION ALL SELECT 'sale_activation_rate',s.entity_key,s.lead_key,s.vendor,s.source,s.medium,s.captured_at,s.event_at,IF(activated.sale_key IS NULL,0,1),1,s.source_record_id,s.batch_id,NULL,NULL,NULL FROM s LEFT JOIN activated ON activated.sale_key=s.entity_key
    UNION ALL SELECT CONCAT(stage,'_value'),entity_key,lead_key,vendor,source,medium,captured_at,event_at,amount_delta,NULL,source_record_id,batch_id,stage,currency,agreement_version FROM f
  ), scoped AS (SELECT *, ${req.grouping === 'source' ? 'source' : req.grouping === 'vendor' ? 'vendor' : req.grouping === 'capture_month' ? "FORMAT_TIMESTAMP('%Y-%m',captured_at,'UTC')" : 'CAST(NULL AS STRING)'} AS group_key
    FROM population ${req.dateBasis === 'event_date' ? 'WHERE DATE(event_at) BETWEEN CAST(@start AS DATE) AND CAST(@end AS DATE)' : ''})`;
  return { query: base, params };
}
export function compileReport(req: ReportRequest, release: ReleaseManifest): CompiledQuery | null {
  const available = req.metrics.filter(m => metricAvailability(m, req, release).available);
  if (!available.length) return null;
  const { query, params } = populationQuery(req, release);
  const selects = available.flatMap(metric => {
    const ratio = METRIC_BY_ID[metric].aggregation === 'ratio';
    const value = ratio ? 'ROUND(100 * SAFE_DIVIDE(SUM(numerator),SUM(denominator)),6)' : 'COALESCE(SUM(numerator),0)';
    const select = (group: boolean) => `SELECT '${metric}' AS metric_id,${group ? 'group_key' : 'CAST(NULL AS STRING)'} AS group_key,${group ? 'FALSE' : 'TRUE'} AS is_total,
      CAST(${value} AS STRING) AS value,CAST(COALESCE(SUM(numerator),0) AS STRING) AS numerator,CAST(${ratio ? 'COALESCE(SUM(denominator),0)' : 'NULL'} AS STRING) AS denominator
      FROM scoped WHERE metric_id='${metric}'${group ? ' GROUP BY group_key' : ''}`;
    return [select(false), ...(req.grouping === 'none' ? [] : [select(true)])];
  });
  return { query: `${query}\nSELECT * FROM (${selects.join('\nUNION ALL\n')}) ORDER BY metric_id,is_total DESC,group_key LIMIT 5001`, params };
}
export function compileEvidence(req: ReportRequest, release: ReleaseManifest, metric: string, group: string | null): CompiledQuery {
  if (!req.metrics.includes(metric) || !metricAvailability(metric, req, release).available) throw new RequestError('This metric is unavailable in the signed reporting scope', 422);
  if (group !== null && (req.grouping === 'none' || typeof group !== 'string' || group.length > 200)) throw new RequestError('Invalid evidence group');
  const { query, params } = populationQuery(req, release);
  return { query: `${query} SELECT metric_id,entity_key,lead_key,vendor,source,medium,CAST(captured_at AS STRING) AS captured_at,CAST(event_at AS STRING) AS event_at,
      CAST(numerator AS STRING) AS numerator,CAST(denominator AS STRING) AS denominator,source_record_id,batch_id,commercial_stage,currency,agreement_version
      FROM scoped WHERE metric_id=@evidenceMetric ${group !== null ? 'AND group_key=@evidenceGroup' : ''}
      ORDER BY entity_key LIMIT 50001`, params: { ...params, evidenceMetric: metric, ...(group !== null ? { evidenceGroup: group } : {}) } };
}
