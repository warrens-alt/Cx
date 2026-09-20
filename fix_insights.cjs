const fs = require('fs');

const code = fs.readFileSync('server.ts', 'utf8');

const newInsights = `
  app.get('/api/insights', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const query = \`
        SELECT
          COUNT(*) as total_leads,
          SUM((SELECT COUNTIF(h.sale IS NOT NULL AND h.sale != '1970-01-01 00:00:01' AND h.sale != '') FROM UNNEST(c.hlc_details) h)) as total_sales,
          SUM((SELECT SUM(h.revenue_generated) FROM UNNEST(c.hlc_details) h)) as total_revenue,
          AVG((SELECT AVG(h.total_calls_length_in_sec) FROM UNNEST(c.hlc_details) h)) as avg_talk_time,
          SUM((SELECT COUNTIF(h.total_calls > 0) FROM UNNEST(c.hlc_details) h)) as dialed_leads
        FROM \\\`\${tableClustered}\\\` c
        \${buildDateFilter(startDate, endDate, 'c.', true)}
      \`;
      const rows = await runQuery(query);
      const data = rows[0] || {};
      
      const insights = [];
      const conversionRate = data.total_leads > 0 ? (data.total_sales / data.total_leads * 100).toFixed(1) : 0;
      
      insights.push({
        title: 'Conversion Rate',
        value: \`\${conversionRate}%\`,
        metric: 'Sales / Fetched',
        severity: Number(conversionRate) > 5 ? 'positive' : (Number(conversionRate) > 2 ? 'warning' : 'negative'),
        recommendation: 'Monitor conversion trends closely to optimize spend.'
      });

      const avgTalk = data.avg_talk_time || 0;
      insights.push({
        title: 'Avg Talk Time',
        value: \`\${Math.round(avgTalk)}s\`,
        metric: 'Per answered call',
        severity: avgTalk > 120 ? 'positive' : 'neutral',
        recommendation: 'Longer talk time often correlates with higher sales probability.'
      });
      
      const contactRate = data.total_leads > 0 ? (data.dialed_leads / data.total_leads * 100).toFixed(1) : 0;
      insights.push({
        title: 'Dial Rate',
        value: \`\${contactRate}%\`,
        metric: 'Dialed / Fetched',
        severity: Number(contactRate) > 50 ? 'positive' : 'warning',
        recommendation: 'Low dial rate indicates unworked leads or pipeline blockages.'
      });
      
      const revenue = data.total_revenue || 0;
      insights.push({
        title: 'Revenue Generated',
        value: \`R\${revenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\`,
        metric: 'Total Value',
        severity: revenue > 10000 ? 'positive' : 'neutral',
        recommendation: 'Focus on high-converting sources to maximize ROI.'
      });

      res.json({ success: true, data: insights });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
`;

// use regex to replace the insights endpoint block
const updated = code.replace(
  /app\.get\('\/api\/insights', async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: err\.message \}\);\s*\}\s*\}\);/m,
  newInsights.trim()
);

fs.writeFileSync('server.ts', updated);
