const fs = require('fs');
let code = fs.readFileSync('server/bigquery/queries.ts', 'utf8');

const regex = /const query = \`\s*SELECT\s*CAST\(date AS STRING\) as date,\s*channel,\s*SUM\(budget\) as spend,\s*SUM\(impressions\) as impressions,\s*SUM\(clicks\) as clicks,\s*SUM\(actions_lead\) as leads\s*FROM \\\`\$\{client\.projectId\}\.\$\{client\.datasetId\}\.\$\{client\.platformInsightsTable\}\\\`\s*\$\{sql\}\s*GROUP BY date, channel\s*ORDER BY date DESC\s*\`;/m;

const replacement = `
  const query = \`
    SELECT 
      CAST(date AS STRING) as date,
      channel,
      campaign,
      SUM(budget) as spend,
      SUM(impressions) as impressions,
      SUM(clicks) as clicks,
      SUM(actions_lead) as leads
    FROM \\\`\${client.projectId}.\${client.datasetId}.\${client.platformInsightsTable}\\\`
    \${sql}
    GROUP BY date, channel, campaign
    ORDER BY date DESC
  \`;
`;

code = code.replace(regex, replacement);

const returnRegex = /return \{\s*summary,\s*timeseries: rows\s*\};/m;
const returnReplacement = `
  const campaignsMap = new Map();
  rows.forEach(r => {
    const c = r.campaign || 'Unknown';
    if (!campaignsMap.has(c)) {
      campaignsMap.set(c, { campaign: c, channel: r.channel, spend: 0, impressions: 0, clicks: 0, leads: 0 });
    }
    const camp = campaignsMap.get(c);
    camp.spend += Number(r.spend);
    camp.impressions += Number(r.impressions);
    camp.clicks += Number(r.clicks);
    camp.leads += Number(r.leads);
  });

  const campaigns = Array.from(campaignsMap.values()).map(c => ({
    ...c,
    ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
    cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
    cpa: c.leads > 0 ? c.spend / c.leads : 0
  })).sort((a, b) => b.spend - a.spend);

  return { 
    summary, 
    timeseries: rows,
    campaigns
  };
`;
code = code.replace(returnRegex, returnReplacement);

fs.writeFileSync('server/bigquery/queries.ts', code);
