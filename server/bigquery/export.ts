import { getBigQueryClient } from './client';
import { getClientConfig, TenantConfiguration } from './config';
import { getBaseSemanticLayer } from './views';
import { BaseQueryParams, buildWhereClause } from './queries';
import { parse } from 'json2csv';

export async function exportData(params: BaseQueryParams & { grain: string, format?: string }) {
  const client = getClientConfig(params.clientId);
  const bq = getBigQueryClient(client.bigQueryProject);
  const { sql, queryParams } = buildWhereClause(params);
  
  const baseSql = getBaseSemanticLayer(client);
  
  let exportSql = '';
  
  if (params.grain === 'lead' || params.grain === 'semantic') {
    exportSql = `
      ${baseSql}
      SELECT 
        lead_id as \`Lead ID\`,
        consumer_id as \`Consumer ID\`,
        capture_date as \`Capture Date\`,
        source as \`Source\`,
        medium as \`Medium\`,
        valid_lead as \`Valid Lead\`,
        valid_idno as \`Valid IDNO\`,
        phone_valid as \`Valid Phone\`,
        grade as \`Grade\`,
        vetting as \`Vetting\`,
        vendor_count as \`Vendor Count\`,
        transaction_count as \`Transaction Count\`,
        delivered as \`Delivered\`,
        called as \`Called\`,
        rpc as \`RPC\`,
        sale as \`Sale\`,
        activation as \`Activation\`,
        revenue as \`Revenue\`
      FROM vw_leads
      ${sql ? (sql.trim().toUpperCase().startsWith('WHERE') ? sql : `WHERE ${sql}`) : ''}
    `;
  } else if (params.grain === 'transaction') {
    exportSql = `
      ${baseSql}
      SELECT
        lead_id as \`Lead ID\`,
        vendor as \`HLC Vendor\`,
        transaction_id as \`HLC Transaction ID\`,
        attempted_delivery_timestamp as \`Attempted Delivery\`,
        delivery_timestamp as \`Delivered Date\`,
        expected_first_dial_timestamp as \`Expected First Dial\`,
        new_dialer_lead as \`New Dialer Lead\`,
        hlc_first_call as \`First Call Date\`,
        hlc_last_call as \`Last Call Date\`,
        last_dialer_status as \`Last Dialer Status\`,
        hlc_last_call_duration as \`Last Call Length\`,
        hlc_total_call_duration as \`Total Call Length\`,
        hlc_total_calls as \`Total Calls\`,
        rpc as \`RPC\`,
        sale as \`Sale\`,
        activation as \`Activated\`,
        revenue as \`Revenue\`
      FROM vw_lead_vendor_transactions
      ${sql ? (sql.trim().toUpperCase().startsWith('WHERE') ? sql : `WHERE ${sql}`) : ''}
    `;
  } else if (params.grain === 'raw_source') {
    exportSql = `
      SELECT *
      FROM \`${client.semanticMappings.tables.leads}\`
      ${client.dataSourceMode === 'shared' && client.sharedTenantIdField ? `WHERE ${client.sharedTenantIdField} = '${client.sharedTenantIdValue}'` : ''}
      LIMIT 10000
    `;
  } else {
    throw new Error(`Unsupported export grain: ${params.grain}`);
  }

  const [rows] = await bq.query({ query: exportSql, params: queryParams });
  
  if (params.format === 'json') {
    return rows;
  }
  
  if (rows.length === 0) {
    return 'No data found';
  }
  
  return parse(rows);
}
