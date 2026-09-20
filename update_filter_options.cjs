const fs = require('fs');

let content = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

const replacement = `
export async function getFilterOptions(params: BaseQueryParams) {
  const client = getClientConfig(params.clientId);
  const bq = getBigQueryClient(client.bigQueryProject);
  
  const dateParams: any = {};
  let dateClauses = [];
  if (params.startDate) {
    dateClauses.push(\`capture_date >= @startDate\`);
    dateParams.startDate = params.startDate;
  }
  if (params.endDate) {
    dateClauses.push(\`capture_date <= @endDate\`);
    dateParams.endDate = params.endDate;
  }
  const where = dateClauses.length > 0 ? 'WHERE ' + dateClauses.join(' AND ') : '';

  const query = \`
    \${getBaseSemanticLayer(client)}
    SELECT 
      source,
      medium,
      vendor,
      grade,
      vetting,
      valid_lead
    FROM vw_lead_vendor_transactions
    \${where}
  \`;
  
  const vendorQuery = \`
    \${getBaseSemanticLayer(client)}
    SELECT 
      vendor as value,
      vendor as label,
      COUNT(DISTINCT lead_id) as uniqueLeads,
      COUNT(1) as transactions
    FROM vw_lead_vendor_transactions
    \${where}
    GROUP BY vendor
    ORDER BY uniqueLeads DESC
  \`;
  
  const [[rows], [vendorRows]] = await Promise.all([
    bq.query({ query, params: dateParams }),
    bq.query({ query: vendorQuery, params: dateParams })
  ]);
  
  const sources = new Set<string>();
  const mediums = new Set<string>();
  const grades = new Set<string>();
  const vettings = new Set<string>();
  
  rows.forEach((r: any) => {
    if (r.source) sources.add(r.source);
    if (r.medium) mediums.add(r.medium);
    if (r.grade) grades.add(r.grade);
    if (r.vetting) vettings.add(r.vetting);
  });

  return {
    sources: Array.from(sources).sort(),
    mediums: Array.from(mediums).sort(),
    vendors: vendorRows.filter((v: any) => v.value),
    grades: Array.from(grades).sort(),
    vettings: Array.from(vettings).sort(),
  };
}
`;

content = content.replace(/export async function getFilterOptions[\s\S]*?return \{[\s\S]*?\};\n\}/, replacement.trim());

fs.writeFileSync('server/bigquery/queries.ts', content);
