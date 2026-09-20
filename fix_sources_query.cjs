const fs = require('fs');

let queries = fs.readFileSync('server/queries.ts', 'utf8');

const replacement = `
    const [rows] = await bq.query({ query });
    
    // calculate total leads to get share
    const totalLeads = rows.reduce((sum, r) => sum + (Number(r.leads) || 0), 0);
    
    return rows.map((r: any) => {
      const current = Number(r.leads) || 0;
      return {
        source: r.source,
        leads: current,
        share: totalLeads > 0 ? Number(((current / totalLeads) * 100).toFixed(1)) : 0,
        delivery: current > 0 ? Number(((Number(r.delivery_count) / current) * 100).toFixed(1)) : 0,
        callRate: current > 0 ? Number(((Number(r.called_count) / current) * 100).toFixed(1)) : 0,
        dupes: current > 0 ? Number(((Number(r.dupe_count) / current) * 100).toFixed(1)) : 0,
        saleRate: current > 0 ? Number(((Number(r.sale_count) / current) * 100).toFixed(1)) : 0,
        revPerLead: current > 0 ? Number((Number(r.total_revenue) / current).toFixed(2)) : 0
      };
    });
`;

queries = queries.replace(/const \[rows\] = await bq\.query\(\{ query \}\);\s+const sources = rows\.map.*return \{\s+sources,\s+topSource,\s+lowestCpa\s+\};/s, replacement.trim());

// We also need to add delivery_count, called_count, dupe_count to the SELECT query.
queries = queries.replace(/COUNTIF\(rpc = true\) as rpc_count,\s+COUNTIF\(sale = true\) as sale_count,/s, `COUNTIF(delivery_timestamp IS NOT NULL) as delivery_count,
      COUNTIF(first_call_timestamp IS NOT NULL) as called_count,
      COUNTIF(duplicate_flag = true) as dupe_count,
      COUNTIF(rpc = true) as rpc_count,
      COUNTIF(sale = true) as sale_count,`);

fs.writeFileSync('server/queries.ts', queries);

