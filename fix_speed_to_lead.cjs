const fs = require('fs');
let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

content = content.replace(/has_rpc as rpc,\n\s*has_sale as sale\n\s*FROM vw_lead_vendor_transactions\n\s*\$\{sql \? sql \+ ' AND' : 'WHERE'\} has_delivery = true\n\s*AND has_call = true/, 
`rpc,
        sale
      FROM vw_lead_vendor_transactions
      \${sql ? sql + ' AND' : 'WHERE'} delivery_timestamp IS NOT NULL
        AND first_call_timestamp IS NOT NULL`);

content = content.replace(/has_rpc = true/g, 'rpc = true');

fs.writeFileSync('server/bigquery/queries.ts', content);
