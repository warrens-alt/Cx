import test from 'node:test';
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

test('legacy scope remains visible while report filters are collapsed',()=>{
  const app=read('src/App.tsx'),scope=read('src/components/AppliedScope.tsx');
  assert.match(app,/<AppliedScope\/>/);assert.match(scope,/Capture dates:/);assert.match(scope,/\{startDate\}/);assert.match(scope,/\{endDate\}/);
  assert.match(scope,/Object.entries\(filters\)/);assert.match(scope,/filterDescription\(key,condition\)/);assert.match(scope,/setFilter\(key,null\)/);
});

test('streamlined filters retain call-attempt, ID and phone controls',()=>{
  const source=read('src/components/GlobalFilter.tsx');
  assert.match(source,/Recorded Call Attempts/);assert.match(source,/booleanSelect\('valid_idno'/);assert.match(source,/booleanSelect\('phone_valid'/);
  assert.match(source,/operator:'between',min,max/);assert.match(source,/value:Number\(val\)/);
});
