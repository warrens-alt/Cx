const fs = require('fs');

const fixFile = (path, replacements) => {
  if (!fs.existsSync(path)) return;
  let text = fs.readFileSync(path, 'utf8');
  for (const r of replacements) {
    text = text.replace(r.from, r.to);
  }
  fs.writeFileSync(path, text);
}

fixFile('src/pages/Acquisition.tsx', [
  { from: /value=\{Math\.round\(summary\.spend\)\.toLocaleString\(\)\}/g, to: 'value={summary.spend}' },
  { from: /value=\{Math\.round\(summary\.leads\)\.toLocaleString\(\)\}/g, to: 'value={summary.leads}' },
  { from: /value=\{Math\.round\(summary\.impressions\)\.toLocaleString\(\)\}/g, to: 'value={summary.impressions}' },
]);

fixFile('src/pages/SpeedToLead.tsx', [
  { from: /value=\{speedData\.buckets\[0\]\?\.leads\?\.toLocaleString\(\) \|\| '0'\}/g, to: 'value={speedData.buckets[0]?.leads || 0}' },
  { from: /value=\{\(speedData\.buckets\[0\]\?\.leads \+ speedData\.buckets\[1\]\?\.leads \+ speedData\.buckets\[2\]\?\.leads\)\?\.toLocaleString\(\) \|\| '0'\}/g, to: 'value={(speedData.buckets[0]?.leads || 0) + (speedData.buckets[1]?.leads || 0) + (speedData.buckets[2]?.leads || 0)}' },
]);

fixFile('src/pages/CallPerformance.tsx', [
  { from: /value=\{callsData\.calledLeads\.toLocaleString\(\)\}/g, to: 'value={callsData.calledLeads}' },
]);

fixFile('src/pages/Outcomes.tsx', [
  { from: /value=\{data\.summary\.total_activations\?\.toLocaleString\(\) \|\| '0'\}/g, to: 'value={data.summary.total_activations || 0}' }
]);

