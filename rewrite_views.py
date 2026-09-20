content = """import { ClientDataSource } from './config';

export function getBaseSemanticLayer(client: ClientDataSource) {
  // Centralized analytical model / semantic view over the raw lead ledger
  // This abstracts schema differences and enforces canonical definitions.
  return `
    WITH vw_lead_lifecycle AS (
      SELECT
        '${client.clientId}' as client_id,
        lead_id,
        capture_timestamp,
        DATE(capture_timestamp) as capture_date,
        
        IFNULL(source, 'Unknown') as source,
        IFNULL(medium, 'Unknown') as medium,
        
        valid_lead,
        
        delivery_timestamp,
        first_call_timestamp,
        
        CAST(calls AS INT64) as total_calls,
        
        rpc,
        sale,
        activation,
        
        CAST(revenue AS FLOAT64) as revenue,
        '${client.currency}' as currency,
        
        duplicate_flag,
        
        EXTRACT(YEAR FROM capture_timestamp) IN (1900, 1970) as sentinel_capture
      FROM \\`${client.projectId}.${client.datasetId}.${client.leadLedgerTable}\\`
    )
  `;
}
"""
with open("server/bigquery/views.ts", "w") as f:
    f.write(content)
