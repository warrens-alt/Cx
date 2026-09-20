const fs = require('fs');

let file = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

const newBuildWhere = `function buildWhereClause(params: BaseQueryParams) {
  let clauses = [];
  const queryParams: any = {};
  
  if (params.startDate) {
    clauses.push(\`capture_date >= @startDate\`);
    queryParams.startDate = params.startDate;
  }
  if (params.endDate) {
    clauses.push(\`capture_date <= @endDate\`);
    queryParams.endDate = params.endDate;
  }

  if (params.filters) {
    let i = 0;
    for (const [key, filter] of Object.entries(params.filters)) {
      const f = filter as any;
      if (!f || !f.operator) continue;
      
      let semanticField = key;
      // Map canonical keys to semantic view columns
      if (key === 'vendor') semanticField = 'medium';
      if (key === 'activated') semanticField = 'activation';
      if (key === 'calls') semanticField = 'total_calls';
      
      const paramName = \`param_\${i}\`;
      
      if (f.operator === 'in' && Array.isArray(f.values) && f.values.length > 0) {
        const inParams = f.values.map((v:any, idx:number) => \`@\${paramName}_\${idx}\`);
        clauses.push(\`\${semanticField} IN (\${inParams.join(',')})\`);
        f.values.forEach((v:any, idx:number) => {
          queryParams[\`\${paramName}_\${idx}\`] = v;
        });
      } else if (f.operator === 'equals' && f.value !== undefined) {
        clauses.push(\`\${semanticField} = @\${paramName}\`);
        queryParams[paramName] = f.value;
      } else if (f.operator === 'not_equals' && f.value !== undefined) {
        clauses.push(\`\${semanticField} != @\${paramName}\`);
        queryParams[paramName] = f.value;
      } else if (f.operator === 'between' && f.min !== undefined && f.max !== undefined) {
        clauses.push(\`\${semanticField} BETWEEN @\${paramName}_min AND @\${paramName}_max\`);
        queryParams[\`\${paramName}_min\`] = f.min;
        queryParams[\`\${paramName}_max\`] = f.max;
      } else if (f.operator === 'greater_than' && f.value !== undefined) {
        clauses.push(\`\${semanticField} > @\${paramName}\`);
        queryParams[paramName] = f.value;
      } else if (f.operator === 'less_than' && f.value !== undefined) {
        clauses.push(\`\${semanticField} < @\${paramName}\`);
        queryParams[paramName] = f.value;
      }
      i++;
    }
  }

  const sql = clauses.length > 0 ? \`WHERE \${clauses.join(' AND ')}\` : '';
  return { sql, queryParams };
}`;

file = file.replace(/function buildWhereClause\(params: BaseQueryParams\) \{[\s\S]*?return \{ sql, queryParams \};\n\}/, newBuildWhere);

fs.writeFileSync('server/bigquery/queries.ts', file);
