const fs = require('fs');
let api = fs.readFileSync('server/api.ts', 'utf8');

api = api.replace(
  /analyticsRouter.get\('\/speed-to-lead'[\s\S]*?\}\);/m,
`analyticsRouter.get('/speed-to-lead', async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getSpeedToLeadStats(params);
    res.json(buildResponse(req, stats, 'vw_speed_to_lead'));
  } catch (error: any) {
    console.error("SPEED TO LEAD ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});`
);

fs.writeFileSync('server/api.ts', api);
