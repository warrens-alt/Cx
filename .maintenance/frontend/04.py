from pathlib import Path
import re
R=Path.cwd()
def write(name,content):
 p=R/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
def edit(name,old,new,count=-1):
 p=R/name;s=p.read_text()
 if old not in s:raise ValueError(name+': missing '+old[:60])
 p.write_text(s.replace(old,new,count))

# Keep responsive visibility independent of utility specificity.
edit('src/App.tsx','className="cx-icon-button lg:hidden"','className="cx-icon-button cx-mobile-menu"')
edit('src/App.tsx','className="cx-icon-button hidden lg:inline-flex"','className="cx-icon-button cx-desktop-toggle"')
p=R/'src/index.css';p.write_text(p.read_text()+'''
.cx-icon-button.cx-desktop-toggle {display:none;}
@media(min-width:1024px){.cx-icon-button.cx-desktop-toggle{display:inline-flex;}.cx-icon-button.cx-mobile-menu{display:none;}}
.enterprise-card:fullscreen > div[style] {height:calc(100dvh - 165px)!important;min-height:280px;}
''')
edit('src/components/KpiCard.tsx','ArrowUpRight, ArrowDownRight, ArrowRight','ArrowUpRight, ArrowDownRight, Minus, ArrowRight')
edit('src/components/KpiCard.tsx','Icon=change!>=0?ArrowUpRight:ArrowDownRight;','Icon=change===0?Minus:change!>0?ArrowUpRight:ArrowDownRight;')
edit('src/components/charts/ChartToolbar.tsx','Suspense, useRef, useState','Suspense, useEffect, useRef, useState')
edit('src/components/charts/ChartToolbar.tsx','  const root=useRef<HTMLDivElement>(null);', '''  const root=useRef<HTMLDivElement>(null),[expanded,setExpanded]=useState(false);
  useEffect(()=>{const change=()=>setExpanded(document.fullscreenElement===root.current?.closest('.enterprise-card'));document.addEventListener('fullscreenchange',change);return()=>document.removeEventListener('fullscreenchange',change);},[]);''')
edit('src/components/charts/ChartToolbar.tsx','aria-label={`Expand chart: ${title}`} title="Full screen"','aria-label={`${expanded?\'Exit full screen\':\'Expand chart\'}: ${title}`} title={expanded?\'Exit full screen\':\'Full screen\'}')

write('tests/presentation.test.ts', '''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { safeDensity, isCurrentPage, navigationTarget, utcDatePresets } from '../src/lib/presentation';
const read=(p:string)=>fs.readFileSync(p,'utf8');
test('presentation preference accepts only supported densities',()=>{
  assert.equal(safeDensity('compact'),'compact');assert.equal(safeDensity('comfortable'),'comfortable');assert.equal(safeDensity('script'),'comfortable');assert.equal(safeDensity(null),'comfortable');
});
test('navigation does not confuse Explorer with Explore',()=>{
  assert.equal(isCurrentPage('/explorer','/explore'),false);assert.equal(isCurrentPage('/explore','/explore'),true);assert.equal(isCurrentPage('/explore/detail','/explore'),true);
});
test('legacy navigation preserves explicit reporting selections',()=>{
  const query='?startDate=2026-08-01&filters=%7B%7D';assert.deepEqual(navigationTarget('/sources','/explore',query),{pathname:'/sources',search:query});
});
test('evidence reporting does not inherit legacy URL filters',()=>{
  assert.equal(navigationTarget('/reports','/explore','?vendor=A').search,'');assert.equal(navigationTarget('/sources','/reports','?vendor=A').search,'');
});
test('calendar shortcuts use complete UTC day boundaries',()=>{
  const p=utcDatePresets(new Date('2026-01-02T23:10:00Z'));
  assert.deepEqual(p.find(x=>x.id==='last7'),{id:'last7',label:'Last 7 days (UTC)',start:'2025-12-27',end:'2026-01-02'});
  assert.equal(p.find(x=>x.id==='previous')!.start,'2025-12-01');assert.equal(p.find(x=>x.id==='previous')!.end,'2025-12-31');
});
test('leap year shortcuts do not use assumed month lengths',()=>{
  assert.equal(utcDatePresets(new Date('2024-03-01T00:00:00Z')).find(x=>x.id==='previous')!.end,'2024-02-29');
});
test('heavy navigation and record drawers load on demand',()=>{
  assert.match(read('src/App.tsx'),/React.lazy\(\(\) => import\('\.\/components\/CommandPalette'\)\)/);
  assert.match(read('src/components/KpiCard.tsx'),/auditOpen&&<DataAuditDrawer/);assert.match(read('src/components/KpiCard.tsx'),/drawerOpen&&<MetricLineageDrawer/);
});
test('chart tools expose only implemented actions',()=>{
  const s=read('src/components/charts/ChartToolbar.tsx');assert.doesNotMatch(s,/More Options|title="Export"/);assert.match(s,/requestFullscreen/);
});
test('modal behaviour uses native background isolation and restores focus',()=>{
  const s=read('src/components/Modal.tsx');assert.match(s,/showModal\(\)/);assert.match(s,/onCancel/);assert.match(s,/previous.focus/);
});
test('loading skeletons do not generate random chart data',()=>{assert.doesNotMatch(read('src/components/Skeleton.tsx'),/Math.random/);});
test('reload invalidates actual analytics queries rather than dispatching a no-op event',()=>{
  const s=read('src/components/GlobalFilter.tsx');assert.match(s,/invalidateQueries/);assert.doesNotMatch(s,/analytics:refresh/);assert.match(s,/queryKey:\['filter-options',selectedClient,startDate,endDate\]/);
});
test('presentation honours reduced motion and limits sticky headers to the table head',()=>{
  const s=read('src/index.css');assert.match(s,/prefers-reduced-motion:reduce/);assert.match(s,/\.enterprise-table thead th/);assert.match(s,/\.enterprise-table tbody th \{ position:static/);
});
test('pending evidence requests are cancelled on scope changes and unmount',()=>{
  const s=read('src/pages/VersionedReports.tsx');assert.match(s,/return \(\) => evidenceController.current\?\.abort\(\)/);assert.match(s,/if \(!controller.signal.aborted\) setEvidence\(result\)/);
});
''')

p=R/'tooling/browser/smoke.mjs';s=p.read_text()
s=s.replace('let noRelease=false,slow=false;', 'let noRelease=false,slow=false;const requestCounts={};')
s=s.replace("const url=new URL(route.request().url()),payload=route.request().postDataJSON();", "const url=new URL(route.request().url()),payload=route.request().postDataJSON();requestCounts[url.pathname]=(requestCounts[url.pathname]||0)+1;")
s=s.replace("await page.getByText('Available release: rfixture',{exact:true}).waitFor();", """await page.getByText('Available release: rfixture',{exact:true}).waitFor();
    await page.screenshot({path:`verification/frontend-scope-${viewport.width}.png`,fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No document-level horizontal overflow');checks++;
    assert.equal(await page.locator('vite-error-overlay').count(),0);checks++;
    await page.getByRole('button',{name:'Search pages',exact:true}).click();
    const searchDialog=page.getByRole('dialog',{name:'Quick navigation',exact:true});await searchDialog.waitFor();
    await page.getByRole('combobox',{name:'Search pages and navigation'}).fill('zzzz-no-page');
    await page.getByText('No pages match “zzzz-no-page”. Try “calls”, “sources” or “evidence”.',{exact:true}).waitFor();checks++;
    await page.keyboard.press('Escape');await searchDialog.waitFor({state:'hidden'});
    assert.equal(await page.getByRole('button',{name:'Search pages',exact:true}).evaluate(el=>el===document.activeElement),true);checks++;
    if(viewport.width<1024){
      await page.getByRole('button',{name:'Open navigation',exact:true}).click();const navigation=page.getByRole('dialog',{name:'Navigation',exact:true});await navigation.waitFor();
      for(let n=0;n<35;n++)await page.keyboard.press('Tab');
      assert.ok(await navigation.evaluate(el=>el.contains(document.activeElement)),'Tab stays within navigation');checks++;
      await page.screenshot({path:`verification/frontend-navigation-${viewport.width}.png`,fullPage:true});
      await page.keyboard.press('Escape');await navigation.waitFor({state:'hidden'});checks++;
    }else{
      await page.getByRole('button',{name:'Collapse navigation',exact:true}).click();assert.equal(await page.getByRole('navigation',{name:'Main navigation'}).count(),0);checks++;
      await page.getByRole('button',{name:'Expand navigation',exact:true}).click();await page.getByRole('navigation',{name:'Main navigation'}).waitFor();checks++;
    }
""")
s=s.replace("await page.getByTestId('metric-call_coverage').getByRole('button',{name:'Definition',exact:true}).click();", """await page.getByTestId('metric-call_attempts').scrollIntoViewIfNeeded();
    await page.screenshot({path:`verification/frontend-results-${viewport.width}.png`,fullPage:true});
    await page.getByTestId('metric-call_coverage').getByRole('button',{name:'Definition',exact:true}).click();""")
s=s.replace("const calls=page.getByTestId('metric-call_attempts')", "fs.mkdirSync('verification',{recursive:true});\n    const calls=page.getByTestId('metric-call_attempts')")
# Ensure directory exists even on a brand-new checkout before the first capture.
s=s.replace("await waitServer();browser=", "await waitServer();fs.mkdirSync('verification',{recursive:true});browser=")
s=s.replace("await page.goto('http://127.0.0.1:3187/call-performance');", """await page.goto('http://127.0.0.1:3187/call-performance');
    await page.getByRole('button',{name:'Report filters',exact:true}).click();
    const filterPanel=page.getByRole('region',{name:'Legacy report filters'});await filterPanel.waitFor();
    const requestsBefore=requestCounts['/api/analytics/calls']||0;
    await page.getByRole('button',{name:'Reload results',exact:true}).click();
    await page.waitForFunction(()=>true);await page.waitForTimeout(250);
    assert.ok(requestCounts['/api/analytics/calls']>requestsBefore,'Reload refetches the active report');checks++;
    await page.getByRole('button',{name:'Report filters',exact:true}).click();await filterPanel.waitFor({state:'hidden'});checks++;
""")
s=s.replace("await page.getByRole('button',{name:'First-Dial Timing',exact:true}).click();", """await page.getByRole('heading',{name:/^One-Call Lead Share$/i}).scrollIntoViewIfNeeded();
    await page.screenshot({path:`verification/frontend-calls-${viewport.width}.png`,fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
    await page.getByRole('button',{name:'First-Dial Timing',exact:true}).click();""")
s=s.replace("assert.deepEqual(errors,[]);checks++;await page.close();", """await page.getByRole('button',{name:'Use compact table spacing',exact:true}).click();
    assert.equal(await page.locator('.cx-app').getAttribute('data-density'),'compact');checks++;
    await page.reload();await page.getByRole('heading',{name:/^Capture-to-Delivery Mean$/i}).waitFor();
    assert.equal(await page.locator('.cx-app').getAttribute('data-density'),'compact');checks++;
    await page.getByRole('button',{name:'Use comfortable table spacing',exact:true}).click();
    await page.getByRole('button',{name:'Search pages',exact:true}).click();await page.getByRole('combobox',{name:'Search pages and navigation'}).fill('evidence');
    await page.keyboard.press('Enter');await page.getByRole('heading',{name:'Evidence Reports',exact:true}).waitFor();checks++;
    await page.goto('http://127.0.0.1:3187/page-that-does-not-exist');await page.getByRole('heading',{name:'Page not found',exact:true}).waitFor();checks++;
    await page.getByRole('link',{name:'Open Evidence Reports',exact:true}).click();await page.getByRole('heading',{name:'Evidence Reports',exact:true}).waitFor();checks++;
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.ok(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches));checks++;
    assert.deepEqual(errors,[]);checks++;await page.close();""")
p.write_text(s)
