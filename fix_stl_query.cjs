const fs = require('fs');

let queries = fs.readFileSync('server/queries.ts', 'utf8');

const replacement = `
    return {
      metrics: [
        { name: 'Capture to Delivery', avg: 'N/A', median: 'N/A', p75: 'N/A', p90: 'N/A', p95: 'N/A' },
        { name: 'Delivery to First Call', avg: stats.avg_stl ? \`\${Math.round(stats.avg_stl)}m\` : 'N/A', median: 'N/A', p75: 'N/A', p90: 'N/A', p95: 'N/A' },
      ],
      buckets: [
        { 
          bucket: '< 5m', 
          leads: Number(stats.bucket_1_leads) || 0,
          rpc: Number(stats.bucket_1_leads) > 0 ? Number(((Number(stats.bucket_1_rpc) / Number(stats.bucket_1_leads)) * 100).toFixed(1)) : 0,
          sale: Number(stats.bucket_1_leads) > 0 ? Number(((Number(stats.bucket_1_sale) / Number(stats.bucket_1_leads)) * 100).toFixed(1)) : 0,
          activation: 0
        },
        { 
          bucket: '5-15m', 
          leads: Number(stats.bucket_2_leads) || 0,
          rpc: Number(stats.bucket_2_leads) > 0 ? Number(((Number(stats.bucket_2_rpc) / Number(stats.bucket_2_leads)) * 100).toFixed(1)) : 0,
          sale: Number(stats.bucket_2_leads) > 0 ? Number(((Number(stats.bucket_2_sale) / Number(stats.bucket_2_leads)) * 100).toFixed(1)) : 0,
          activation: 0
        },
        { 
          bucket: '15-60m', 
          leads: Number(stats.bucket_3_leads) || 0,
          rpc: Number(stats.bucket_3_leads) > 0 ? Number(((Number(stats.bucket_3_rpc) / Number(stats.bucket_3_leads)) * 100).toFixed(1)) : 0,
          sale: Number(stats.bucket_3_leads) > 0 ? Number(((Number(stats.bucket_3_sale) / Number(stats.bucket_3_leads)) * 100).toFixed(1)) : 0,
          activation: 0
        },
        { 
          bucket: '> 1h', 
          leads: Number(stats.bucket_4_leads) || 0,
          rpc: Number(stats.bucket_4_leads) > 0 ? Number(((Number(stats.bucket_4_rpc) / Number(stats.bucket_4_leads)) * 100).toFixed(1)) : 0,
          sale: Number(stats.bucket_4_leads) > 0 ? Number(((Number(stats.bucket_4_sale) / Number(stats.bucket_4_leads)) * 100).toFixed(1)) : 0,
          activation: 0
        }
      ]
    };
`;

queries = queries.replace(/return \{\s+avgStl: stats\.avg_stl \? `\$\{Math\.round\(stats\.avg_stl\)\}m` : 'N\/A',\s+medianStl: 'N\/A',\s+\/\/ approximate\s+inFiveMin: total > 0 \? Number\(\(\(Number\(stats\.in_five\) \/ total\) \* 100\)\.toFixed\(1\)\) : 0,\s+inHour: total > 0 \? Number\(\(\(Number\(stats\.in_hour\) \/ total\) \* 100\)\.toFixed\(1\)\) : 0,\s+chart: \[\s+\{\s+bucket: '< 5m'.*?\}\s+\]\s+\};/s, replacement.trim());

fs.writeFileSync('server/queries.ts', queries);

