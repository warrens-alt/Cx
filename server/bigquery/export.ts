import { getBigQueryClient } from './client';
import { getClientConfig, tableIdentifier } from './config';
import { getBaseSemanticLayer } from './views';
import { buildLeadWhere, boundedInteger, RequestError, validateScope, type QueryScope } from './filters';
import { MODEL_VERSION, safeCsvCell } from './integrity';
import { vendorScope, withAnalyticsScope } from '../analyticsContext';
const LEAD_COLUMNS: Record<string, string> = {
  'Lead ID': 'lead_id', 'Consumer ID': 'consumer_id', 'Capture Date': 'capture_date', Source: 'source', Medium: 'medium',
  'Valid Lead': 'valid_lead', 'Valid IDNO': 'valid_idno', 'Valid Phone': 'phone_valid', Grade: 'grade', Vetting: 'vetting',
  'Vendor Count': 'vendor_count', 'Transaction Count': 'total_transactions', Delivered: 'has_delivery', Called: 'has_call',
  RPC: 'has_rpc', Sale: 'has_sale', Activation: 'has_activation', 'Recorded Revenue': 'total_revenue', 'Total Calls': 'total_calls',
};
const TRANSACTION_COLUMNS: Record<string, string> = {
  'Lead ID': 't.lead_id', 'HLC Vendor': 't.vendor', 'HLC Transaction ID': 't.transaction_id',
  'Attempted Delivery': 't.attempted_delivery_timestamp', 'Delivered Date': 't.delivery_timestamp',
  'Expected First Dial': 't.expected_first_dial_timestamp', 'New Dialer Lead': 't.new_dialer_lead',
  'First Observed Call': 't.first_call_timestamp', 'Last Observed Call': 't.last_call_timestamp',
  'Latest Dialler Status': 't.latest_dialer_status', 'Lead Vendor Calls Counted Once': 't.total_calls',
  'Call Count Anchor': 't.call_count_anchor', 'Ambiguous Transaction Call Attribution': 't.ambiguous_transaction_call_attribution',
  'Lead Vendor Duration Counted Once': 't.total_call_duration_seconds', RPC: 't.rpc', Sale: 't.sale',
  Activated: 't.activation', 'Recorded Revenue': 't.revenue', 'Duplicate Transaction': 't.duplicate_flag',
};
export function toCsv(rows: Record<string, unknown>[], headers: string[]): string {
  const cell = (input: unknown) => {
    let value = input;
    if (value && typeof value === 'object' && 'value' in value) value = (value as { value: unknown }).value;
    else if (value && typeof value === 'object') value = JSON.stringify(value);
    value = safeCsvCell(value);
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + [headers.map(cell).join(','), ...rows.map(row => headers.map(h => cell(row[h])).join(','))].join('\r\n');
}
export async function exportData(input: QueryScope & { grain: string; format?: string; limit?: number }) {
  const scope = validateScope(input);
  return withAnalyticsScope(scope, async () => {
    const client = getClientConfig(scope.clientId), { sql, queryParams } = buildLeadWhere(scope), base = getBaseSemanticLayer(client);
    const limit = boundedInteger(input.limit, 10000, 50000, 1);
    let query: string, columns: Record<string, string>;
    if (input.grain === 'lead' || input.grain === 'semantic') {
      columns = LEAD_COLUMNS;
      query = `${base} SELECT ${Object.entries(columns).map(([label, field]) => `${field} AS \`${label}\``).join(',')} FROM vw_leads ${sql} ORDER BY capture_timestamp, lead_id LIMIT @exportLimit`;
    } else if (input.grain === 'transaction') {
      columns = TRANSACTION_COLUMNS;
      query = `${base}, selected_leads AS (SELECT lead_id FROM vw_leads ${sql})
        SELECT ${Object.entries(columns).map(([label, field]) => `${field} AS \`${label}\``).join(',')}
        FROM vw_lead_vendor_transactions t JOIN selected_leads USING (lead_id)
        ORDER BY t.capture_timestamp, t.lead_id, t.vendor, t.hlc_record_number LIMIT @exportLimit`;
    } else if (input.grain === 'raw_source') {
      // Administrator-only at the API. Explicit allowlist prevents new warehouse PII columns leaking by default.
      columns = { 'Lead ID': 'l.lead_id', 'Consumer ID': 'l.consumer_id', Source: 'l.offershop_source', Medium: 'l.offernet_medium', Fetched: 'l.fetched',
        'Redacted Vendor Evidence': `ARRAY(SELECT AS STRUCT h.vendor, h.transaction_id, h.delivered, h.first_call_date, h.sale, h.activated, h.revenue_generated FROM UNNEST(l.hlc_details) h ${vendorScope('h.vendor').sql ? `WHERE ${vendorScope('h.vendor').sql}` : ''})` };
      query = `${base}, selected_leads AS (SELECT lead_id FROM vw_leads ${sql})
        SELECT ${Object.entries(columns).map(([label, field]) => `${field} AS \`${label}\``).join(',')}
        FROM ${tableIdentifier(client.semanticMappings.tables.leads)} l JOIN selected_leads USING (lead_id)
        ORDER BY l.fetched, l.lead_id LIMIT @exportLimit`;
    } else throw new RequestError('Unsupported export grain');
    const [result] = await getBigQueryClient(client.bigQueryProject).query({ query, params: { ...queryParams, exportLimit: limit + 1 } });
    const metadata = { modelVersion: MODEL_VERSION, clientId: scope.clientId, startDate: scope.startDate ?? null, endDate: scope.endDate ?? null,
      filters: scope.filters, grain: input.grain, rowCount: Math.min(result.length, limit), truncated: result.length > limit,
      attribution: 'selected_vendor_transactions', dateBasis: 'lead_capture_cohort', generatedAt: new Date().toISOString(),
      redacted: input.grain === 'raw_source', validationStatus: 'NOT_VERIFIED' };
    const reportColumns = { 'Report Start': metadata.startDate, 'Report End': metadata.endDate, 'Report Filters': JSON.stringify(metadata.filters),
      'Report Model': metadata.modelVersion, 'Report Truncated': metadata.truncated, 'Report Attribution': metadata.attribution };
    const rows = result.slice(0, limit).map(row => ({ ...row, ...reportColumns }));
    return { rows, metadata, csv: toCsv(rows, [...Object.keys(columns), ...Object.keys(reportColumns)]) };
  });
}
