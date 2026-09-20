const { buildWhereClause } = require('./server/bigquery/queries');
const { getClientConfig } = require('./server/bigquery/config');
const { getBaseSemanticLayer } = require('./server/bigquery/views');
const client = getClientConfig('default');
const { sql, queryParams } = buildWhereClause({ clientId: 'default' });

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
console.log(query);
