import fs from 'fs';

const content = fs.readFileSync('server.ts', 'utf8');

const routeCode = `
  app.get('/api/multi-hop-arbitrage', async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const params: Record<string, any> = {};
      let dateFilter = '';
      if (startDate && endDate) {
        dateFilter = 'AND c.fetched >= @startDate AND c.fetched <= @endDateDate';
        params.startDate = startDate + ' 00:00:00';
        params.endDateDate = endDate + ' 23:59:59';
      } else if (startDate) {
        dateFilter = 'AND c.fetched >= @startDate';
        params.startDate = startDate + ' 00:00:00';
      } else if (endDate) {
        dateFilter = 'AND c.fetched <= @endDateDate';
        params.endDateDate = endDate + ' 23:59:59';
      }

      const query = \`
        WITH hops AS (
          SELECT
            0 AS hop_index,
            c.hlc_details[SAFE_OFFSET(0)].vendor AS vendor,
            c.hlc_details[SAFE_OFFSET(0)].delivered AS delivered,
            CAST(c.hlc_details[SAFE_OFFSET(0)].rpc AS INT64) AS rpc,
            c.hlc_details[SAFE_OFFSET(0)].sale AS sale,
            CAST(c.hlc_details[SAFE_OFFSET(0)].revenue_generated AS FLOAT64) AS revenue
          FROM \\\`\${tableClustered}\\\` c
          WHERE ARRAY_LENGTH(c.hlc_details) > 0 \${dateFilter}
          
          UNION ALL
          
          SELECT
            1 AS hop_index,
            c.hlc_details[SAFE_OFFSET(1)].vendor AS vendor,
            c.hlc_details[SAFE_OFFSET(1)].delivered AS delivered,
            CAST(c.hlc_details[SAFE_OFFSET(1)].rpc AS INT64) AS rpc,
            c.hlc_details[SAFE_OFFSET(1)].sale AS sale,
            CAST(c.hlc_details[SAFE_OFFSET(1)].revenue_generated AS FLOAT64) AS revenue
          FROM \\\`\${tableClustered}\\\` c
          WHERE ARRAY_LENGTH(c.hlc_details) > 1 \${dateFilter}
          
          UNION ALL
          
          SELECT
            2 AS hop_index,
            c.hlc_details[SAFE_OFFSET(2)].vendor AS vendor,
            c.hlc_details[SAFE_OFFSET(2)].delivered AS delivered,
            CAST(c.hlc_details[SAFE_OFFSET(2)].rpc AS INT64) AS rpc,
            c.hlc_details[SAFE_OFFSET(2)].sale AS sale,
            CAST(c.hlc_details[SAFE_OFFSET(2)].revenue_generated AS FLOAT64) AS revenue
          FROM \\\`\${tableClustered}\\\` c
          WHERE ARRAY_LENGTH(c.hlc_details) > 2 \${dateFilter}
        )
        SELECT
          hop_index,
          vendor,
          COUNTIF(delivered IS NOT NULL AND delivered != '1970-01-01 00:00:01' AND delivered != '') AS delivered_volume,
          COUNTIF(rpc = 1) AS rpcs,
          COUNTIF(sale IS NOT NULL AND sale != '1970-01-01 00:00:01' AND sale != '') AS sales,
          SUM(IFNULL(revenue, 0)) AS total_revenue
        FROM hops
        WHERE vendor IS NOT NULL AND vendor != ''
        GROUP BY hop_index, vendor
      \`;

      const rows = await runQuery(query, params);
      
      // Process data for UI
      const hopSummary = [
        { hop: 0, delivered: 0, rpcs: 0, sales: 0, revenue: 0 },
        { hop: 1, delivered: 0, rpcs: 0, sales: 0, revenue: 0 },
        { hop: 2, delivered: 0, rpcs: 0, sales: 0, revenue: 0 }
      ];
      
      const vendorMatrix: Record<string, any> = {};

      rows.forEach(r => {
        const h = r.hop_index;
        if (hopSummary[h]) {
           hopSummary[h].delivered += r.delivered_volume;
           hopSummary[h].rpcs += r.rpcs;
           hopSummary[h].sales += r.sales;
           hopSummary[h].revenue += r.total_revenue;
        }

        if (!vendorMatrix[r.vendor]) {
          vendorMatrix[r.vendor] = {
            vendor: r.vendor,
            h0_delivered: 0, h0_sales: 0, h0_revenue: 0,
            h1_delivered: 0, h1_sales: 0, h1_revenue: 0,
            h2_delivered: 0, h2_sales: 0, h2_revenue: 0,
          };
        }
        
        vendorMatrix[r.vendor][\`h\${h}_delivered\`] = r.delivered_volume;
        vendorMatrix[r.vendor][\`h\${h}_sales\`] = r.sales;
        vendorMatrix[r.vendor][\`h\${h}_revenue\`] = r.total_revenue;
      });

      const yieldCurve = hopSummary.map(s => ({
        name: \`Hop \${s.hop}\`,
        deliveredVolume: s.delivered,
        rpcRate: s.delivered > 0 ? (s.rpcs / s.delivered) * 100 : 0,
        conversionRate: s.delivered > 0 ? (s.sales / s.delivered) * 100 : 0,
        alv: s.delivered > 0 ? s.revenue / s.delivered : 0
      }));

      const vendors = Object.values(vendorMatrix).map(v => {
        return {
          vendor: v.vendor,
          h0_cr: v.h0_delivered > 0 ? (v.h0_sales / v.h0_delivered) * 100 : null,
          h0_alv: v.h0_delivered > 0 ? (v.h0_revenue / v.h0_delivered) : null,
          h1_cr: v.h1_delivered > 0 ? (v.h1_sales / v.h1_delivered) * 100 : null,
          h1_alv: v.h1_delivered > 0 ? (v.h1_revenue / v.h1_delivered) : null,
          h2_cr: v.h2_delivered > 0 ? (v.h2_sales / v.h2_delivered) * 100 : null,
          h2_alv: v.h2_delivered > 0 ? (v.h2_revenue / v.h2_delivered) : null,
        };
      });

      res.json({
        success: true,
        data: {
          hopSummary: yieldCurve,
          yieldCurve,
          vendors
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
`;

if (!content.includes('/api/multi-hop-arbitrage')) {
  // insert before app.listen
  const updated = content.replace("app.listen(PORT", routeCode + "\n  app.listen(PORT");
  fs.writeFileSync('server.ts', updated);
  console.log("Added arbitrage route");
} else {
  console.log("Arbitrage route already exists");
}
