const { buildWhereClause } = require('./server/bigquery/queries');
const { getClientConfig } = require('./server/bigquery/config');
const { getBaseSemanticLayer } = require('./server/bigquery/views');

const params = { clientId: 'default', startDate: '2026-09-01', endDate: '2026-09-17' };
const client = getClientConfig(params.clientId);
const { sql, queryParams } = buildWhereClause(params);

const query = `
    ${getBaseSemanticLayer(client)}
    , stl_data AS (
      SELECT 
        lead_id,
        TIMESTAMP_DIFF(first_call_timestamp, delivery_timestamp, MINUTE) as stl_minutes,
        rpc,
        sale
      FROM vw_lead_vendor_transactions
      ${sql ? sql + ' AND' : 'WHERE'} delivery_timestamp IS NOT NULL
        AND first_call_timestamp IS NOT NULL
        AND first_call_timestamp >= delivery_timestamp
    )
    SELECT
      AVG(stl_minutes) as avg_stl,
      COUNT(DISTINCT lead_id) as total_called
    FROM stl_data
  `;
const lines = query.split('\n');
console.log('Line 174:', lines[173]);
console.log('Line 173:', lines[172]);
console.log('Line 175:', lines[174]);
