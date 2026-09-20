from pathlib import Path
import re,json
R=Path.cwd()
p=R/'src/components/charts/FunnelWaterfall.tsx'
s=p.read_text().replace("const topOfFunnel = steps[0]?.value || 1;", "const topOfFunnel = steps[0]?.value ?? 0;")
s=s.replace("const overallConversionPct = ((bottomOfFunnel / topOfFunnel) * 100).toFixed(1);", "const overallConversionPct = topOfFunnel > 0 ? ((bottomOfFunnel / topOfFunnel) * 100).toFixed(1) + '%' : 'Unavailable';")
s=s.replace('End-to-End Conv.','Last Stage / First Stage').replace('Total Volume Loss','First–Last Stage Difference').replace('Peak Leakage Point','Largest Stage Decrease')
s=s.replace('{overallConversionPct}%','{overallConversionPct}').replace('-{formatKpiValue(topOfFunnel - bottomOfFunnel)}','{formatKpiValue(topOfFunnel - bottomOfFunnel)}')
s=s.replace("const pctOfTop = ((step.value / topOfFunnel) * 100).toFixed(1);", "const pctOfTop = topOfFunnel > 0 ? ((step.value / topOfFunnel) * 100).toFixed(1) + '% of first stage' : 'First-stage denominator unavailable';")
s=s.replace('{pctOfTop}% of top','{pctOfTop}').replace('% step yield','% of previous stage').replace('Conversion from previous:', 'Relative to previous stage:').replace('Dropped: -','Stage decrease: ')
s=s.replace("({((step.value / topOfFunnel) * 100).toFixed(1)}%)", "({topOfFunnel > 0 ? ((step.value / topOfFunnel) * 100).toFixed(1) + '% of first stage' : 'Unavailable'})")
s=s.replace('{stepConv}%</strong>', "{stepConv === null ? 'Unavailable' : stepConv + '%'}</strong>")
s=s.replace('      {/* Summary KPI Strip */}', '      <p className="text-xs text-text-mute mb-3">Stage ratios describe the displayed counts. Differences do not prove lead loss, financial leakage or nested populations.</p>\n      {/* Summary KPI Strip */}')
s=s.replace('const tax = getTaxonomyItem(step.label);\n            const costCode = step.costMetric || tax?.costMetric;', 'const costCode = step.costMetric;')
s=s.replace("import { getTaxonomyItem } from '../../lib/taxonomy';\n",'')
p.write_text(s)
p=R/'src/pages/RoutingIntelligence.tsx'
s=p.read_text().replace('Partner Handoff Discrepancies & Leakage','Routing Records without Matched Vendor Transactions').replace('Perfect Handoff Integrity','No Missing Matches Returned by This Check').replace('All routed leads have successfully reconciled against HLC vendor transaction records.','No missing-match sample was returned. This does not establish independent reconciliation, successful delivery or complete source coverage.')
p.write_text(s)
p=R/'tests/naming.test.ts'
s=p.read_text()+'''
test('shared stage charts distinguish count differences from verified leakage',()=>{
  const source=read('src/components/charts/FunnelWaterfall.tsx');
  assert.doesNotMatch(source,/Peak Leakage Point|Total Volume Loss|End-to-End Conv/);
  assert.match(source,/Last Stage \/ First Stage/);assert.match(source,/topOfFunnel > 0/);
  assert.match(source,/First-stage denominator unavailable/);
});
test('an empty routing sample is not labelled perfect reconciliation',()=>{
  const source=read('src/pages/RoutingIntelligence.tsx');
  assert.doesNotMatch(source,/Perfect Handoff Integrity|All routed leads have successfully reconciled/);
  assert.match(source,/No Missing Matches Returned by This Check/);
});
'''
p.write_text(s)
p=R/'tooling/browser/smoke.mjs'
s=p.read_text()
for role,name in [('columnheader','Sales / Dialled Leads (%)'),('columnheader','First-Dial Weekday'),('columnheader','Dialled Transaction Rows'),('columnheader','Transaction Rows'),('rowheader','0–5 Whole Minutes'),('heading','One-Call Lead Share'),('heading','Capture-to-Delivery Mean')]:
    old="getByRole('"+role+"',{name:'"+name+"',exact:true})"
    escaped=re.escape(name).replace('\\ ', ' ').replace('/', '\\/').replace('\\-', '-')
    new="getByRole('"+role+"',{name:/^"+escaped+"$/i})"
    assert old in s,old
    s=s.replace(old,new)
s=s.replace('let browser;', 'let browser, activePage;')
s=s.replace('const page=await browser.newPage({viewport});', 'const page=await browser.newPage({viewport});activePage=page;')
s=s.replace('}finally{if(browser)', "}catch(error){if(activePage&&!activePage.isClosed()){fs.mkdirSync('verification',{recursive:true});await activePage.screenshot({path:'verification/browser-failure.png',fullPage:true});fs.writeFileSync('verification/browser-failure.html',await activePage.content());}throw error;}finally{if(browser)")
p.write_text(s)
p=R/'.maintenance/naming/expected.json';m=json.loads(p.read_text())
m.update({'src/pages/RoutingIntelligence.tsx':'1b5a388e7870eb3b84d8536d502643f583b2643e','tests/naming.test.ts':'9b43ecfe9b24d5bbe8e0f3a16e1b99ebea4191d5','tooling/browser/smoke.mjs':'186cdc813cb14e04d28bc21c391630d27e46a88c','src/components/charts/FunnelWaterfall.tsx':'9b60bbd397b281d8b33d620440f315b298729d82'})
p.write_text(json.dumps(m,indent=2)+'\n')
