const fs = require('fs');

let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

// Update buildWhereClause signature
content = content.replace(
  'export function buildWhereClause(params: BaseQueryParams) {',
  'export function buildWhereClause(params: BaseQueryParams, targetView: string = "vw_lead_lifecycle") {'
);

// Update vendor handling
content = content.replace(
  /if \(f\.operator === 'in' && Array\.isArray\(f\.values\) && f\.values\.length > 0\) \{[\s\S]*?\}\)/g,
  `if (f.operator === 'in' && Array.isArray(f.values) && f.values.length > 0) {
        const inParams = f.values.map((v:any, idx:number) => \`@\${paramName}_\${idx}\`);
        
        if (key === 'vendor' && targetView === 'vw_lead_lifecycle') {
          clauses.push(\`EXISTS (SELECT 1 FROM vw_lead_vendor_transactions v WHERE v.lead_id = vw_lead_lifecycle.lead_id AND v.vendor IN (\${inParams.join(',')}))\`);
        } else {
          clauses.push(\`\${semanticField} IN (\${inParams.join(',')})\`);
        }
        
        f.values.forEach((v:any, idx:number) => {
          queryParams[\`\${paramName}_\${idx}\`] = v;
        })`
);

// Update calls to buildWhereClause
content = content.replace(/buildWhereClause\(params\)/g, "buildWhereClause(params, 'vw_lead_lifecycle')");

// Fix specific queries that query vw_lead_vendor_transactions
content = content.replace(
  /const \{ sql, queryParams \} = buildWhereClause\(params, 'vw_lead_lifecycle'\);\s*const query = `\s*\$\{getBaseSemanticLayer\(client\)\}\s*SELECT\s*\$\{METRIC_DEFINITIONS\.total_leads\.numerator\} as leads,\s*\$\{METRIC_DEFINITIONS\.sales\.numerator\} as sales/g,
  (match) => match // Not matched here
);

fs.writeFileSync('server/bigquery/queries.ts', content);
