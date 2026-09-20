const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newWaterfall = `
  app.get('/api/pipeline-waterfall', async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const query = \`
        SELECT 
          COUNT(*) as fetched,
          COUNTIF(valid_idno = 'TRUE') as valid_id,
          COUNTIF(phone_valid = 'TRUE') as valid_phone,
          SUM((SELECT COUNTIF(h.delivered IS NOT NULL AND h.delivered != '1970-01-01 00:00:01' AND h.delivered != '') FROM UNNEST(c.hlc_details) h)) as delivered,
          SUM((SELECT COUNTIF(h.total_calls > 0) FROM UNNEST(c.hlc_details) h)) as dialed,
          SUM((SELECT COUNTIF(h.rpc = 1) FROM UNNEST(c.hlc_details) h)) as rpc,
          SUM((SELECT COUNTIF(h.total_calls_length_in_sec > 0) FROM UNNEST(c.hlc_details) h)) as answered,
          SUM((SELECT COUNTIF(h.sale IS NOT NULL AND h.sale != '1970-01-01 00:00:01' AND h.sale != '') FROM UNNEST(c.hlc_details) h)) as sales,
          SUM((SELECT COUNTIF(h.activated IS NOT NULL AND h.activated != '1970-01-01 00:00:01' AND h.activated != '') FROM UNNEST(c.hlc_details) h)) as activated
        FROM \\\`\${tableClustered}\\\` c
        \${buildDateFilter(startDate, endDate, 'c.', true)}
      \`;
      const rows = await runQuery(query);
      const data = rows[0] || {};
      
      const stages = [
        { name: 'Fetched Leads', val: data.fetched || 0 },
        { name: 'Contactable (Valid Phone)', val: data.valid_phone || 0 },
        { name: 'Delivered to Dialler', val: data.delivered || 0 },
        { name: 'Dialed', val: data.dialed || 0 },
        { name: 'Answered', val: data.answered || 0 },
        { name: 'Sales Generated', val: data.sales || 0 },
        { name: 'Activations', val: data.activated || 0 },
      ];

      const baseCpl = 16.20;
      const waterfall = [];
      let totalVolumeDecay = 0;
      let totalCapitalDecay = 0;
      
      let previousSustained = stages[0].val;

      for (let i = 0; i < stages.length; i++) {
        const sustained = stages[i].val;
        let decayed = 0;
        let decayPct = 0;
        
        if (i > 0) {
          // If the next stage is somehow larger (data anomaly), cap it or let decayed be 0
          decayed = Math.max(0, previousSustained - sustained);
          decayPct = previousSustained > 0 ? (decayed / previousSustained) : 0;
        }
        
        const capitalDecay = decayed * baseCpl;
        totalVolumeDecay += decayed;
        totalCapitalDecay += capitalDecay;
        
        waterfall.push({
          stage: stages[i].name,
          sustainedVolume: sustained,
          volumeDecayed: decayed,
          decayPercent: decayPct,
          capitalDecay: capitalDecay
        });

        previousSustained = sustained > previousSustained ? previousSustained : sustained;
      }

      res.json({
        success: true,
        data: {
          gross_leaded_volume: stages[0].val,
          base_cpl: baseCpl,
          total_volume_decay: totalVolumeDecay,
          total_capital_decay: totalCapitalDecay,
          waterfall
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
`;

code = code.replace(
  /app\.get\('\/api\/pipeline-waterfall', async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: err\.message \}\);\s*\}\s*\}\);/m,
  newWaterfall.trim()
);

fs.writeFileSync('server.ts', code);
