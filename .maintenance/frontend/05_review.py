from pathlib import Path
import json
R=Path.cwd()
p=R/'src/App.tsx';s=p.read_text()
s=s.replace("import { FilterProvider }", "import { FilterProvider, useFilters }")
s=s.replace("  const [mobile,setMobile]", "  const { startDate, endDate, filters } = useFilters();\n  const [mobile,setMobile]")
s=s.replace('<button type="button" className="cx-button-secondary" aria-expanded={filtersOpen}', '<span className="cx-scope-summary">Capture dates: {startDate} to {endDate} · {Object.keys(filters || {}).length} filters</span>\n          <button type="button" className="cx-button-secondary" aria-expanded={filtersOpen}')
p.write_text(s)
p=R/'src/pages/VersionedReports.tsx';s=p.read_text()
s=s.replace('Database, FileCheck2, ArrowRight, Download, RefreshCw, Info, X, Check, ChevronDown', 'Database, FileCheck2, ArrowRight, RefreshCw, Info, X')
p.write_text(s)
p=R/'src/index.css';p.write_text(p.read_text()+'''
/* Keep the reporting population visible even when the filter form is collapsed. */
.cx-scope-summary {font-size:11px;line-height:1.65;color:#715b38;margin-left:auto;}
.cx-page nav[aria-label="Call report views"] {display:flex;gap:5px;width:fit-content;max-width:100%;padding:5px;border:1px solid #dce5ec;border-radius:10px;background:#eef3f6;}
.cx-page nav[aria-label="Call report views"] button {min-height:36px;border:1px solid transparent;border-radius:7px;padding:8px 12px;background:transparent;color:#526377;font-size:12px;line-height:1.5;}
.cx-page nav[aria-label="Call report views"] button[aria-pressed="true"] {background:#fff;color:#0f766e;border-color:#d7e8e4;box-shadow:0 1px 3px #0f172a0a;font-weight:600;}
.cx-page nav[aria-label="Call report views"] button:hover:not([aria-pressed="true"]) {background:#e5eeef;color:#184f46;}
@media(max-width:767px){.cx-scope-summary{margin-left:0;}.cx-page nav[aria-label="Call report views"] button {min-height:44px;}}
''')
p=R/'tooling/browser/smoke.mjs';s=p.read_text()
s=s.replace("numerator:values[id],denominator:id==='call_coverage'?'3':null", "numerator:id==='call_coverage'?values.called_episodes:id==='sale_activation_rate'?(values.sale_activation_rate===null?'0':String(Number(values.sale_events)*Number(values.sale_activation_rate)/100)):values[id],denominator:id==='call_coverage'?values.delivered_episodes:id==='sale_activation_rate'?values.sale_events:null")
s=s.replace("assert.equal(await page.getByTestId('metric-call_attempts').getByRole('heading').textContent(),'Call Attempts');checks++;", """assert.equal(await page.getByTestId('metric-call_attempts').getByRole('heading').textContent(),'Call Attempts');checks++;
    await page.getByTestId('metric-call_coverage').getByText('Delivered Episodes with a Subsequent Call: 3 / Successful Delivery Episodes: 3',{exact:true}).waitFor();checks++;
""")
s=s.replace("await page.getByRole('button',{name:'First-Dial Timing',exact:true}).click();", """assert.equal(await page.getByRole('button',{name:'Call-Attempt Bands',exact:true}).getAttribute('aria-pressed'),'true');checks++;
    if(viewport.width>=1024){
      await page.getByRole('button',{name:'Expand chart: Recorded Outcomes by Call-Attempt Band',exact:true}).click();
      await page.waitForFunction(()=>Boolean(document.fullscreenElement));checks++;
      await page.getByRole('button',{name:'Exit full screen: Recorded Outcomes by Call-Attempt Band',exact:true}).click();
      await page.waitForFunction(()=>document.fullscreenElement===null);checks++;
    }
    await page.getByRole('button',{name:'First-Dial Timing',exact:true}).click();""")
s=s.replace("await filterPanel.waitFor({state:'hidden'});checks++;", "await filterPanel.waitFor({state:'hidden'});checks++;\n    await page.getByText('Capture dates: 2026-08-01 to 2026-08-31 · 0 filters',{exact:true}).waitFor();checks++;")
s=s.replace("await page.waitForFunction(()=>true);await page.waitForTimeout(250);", "await page.waitForTimeout(250);")
p.write_text(s)
p=R/'tests/presentation.test.ts';p.write_text(p.read_text()+'''
test('legacy scope remains visible while report filters are collapsed',()=>{
  const app=read('src/App.tsx');assert.match(app,/Capture dates: \\{startDate\\} to \\{endDate\\}/);assert.match(app,/Object.keys\\(filters \\|\\| \\{\\}\\).length/);
});
''')
p=R/'.maintenance/frontend/expected.json';manifest=json.loads(p.read_text())
manifest.update({'src/App.tsx':'1c7bde6204f8599581551c84faa79376f594648a','src/pages/VersionedReports.tsx':'3497a502d1fa7b58b1d9722b5e90cc892d7a8e75','src/index.css':'cd79c34988c9dee3aa979a195403e3de0c0060f8','tooling/browser/smoke.mjs':'058c0d39525a2df505656dfa11ea525d922f9f14','tests/presentation.test.ts':'f24938b3f309cc7d68a2c52f4c879ce1fd7043e2'})
p.write_text(json.dumps(manifest,indent=2)+'\n')
