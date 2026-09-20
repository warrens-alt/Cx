import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { METRICS, METRIC_VERSION, METRIC_BY_ID } from '../contracts/reporting';
import { LEGACY_METRICS, EXPLORER_METRICS, EXPLORER_EXPRESSIONS, formatExplorerValue } from '../contracts/legacyMetrics';
import { METRICS as frontend } from '../src/lib/metrics';
import { METRIC_DEFINITIONS as backend } from '../server/bigquery/metrics';
import { MASTER_TAXONOMY as frontendTaxonomy } from '../src/lib/taxonomy';
import { MASTER_TAXONOMY as backendTaxonomy } from '../server/bigquery/taxonomy';
import { exportColumnDefinitions } from '../contracts/exportLabels';
import { PAGE_TITLES, REPORT_COPY, LEGACY_LABELS } from '../contracts/naming';
const read=(path:string)=>fs.readFileSync(path,'utf8');
test('v2 naming revision preserves all stable metric IDs',()=>{
  assert.equal(METRIC_VERSION,'cx.metrics.2.0.1');
  assert.deepEqual(METRICS.map(m=>m.id),['fetched_leads','delivered_episodes','call_attempts','called_episodes','call_coverage','sale_events','activation_events','sale_activation_rate','expected_value','approved_value','invoiced_value','collected_value']);
  assert.equal(new Set(METRICS.map(m=>m.label)).size,12);
});
test('every report label and formula is derived from the shared naming contract',()=>{
  for(const m of METRICS){assert.equal(m.label,REPORT_COPY[m.id as keyof typeof REPORT_COPY].label);assert.ok(m.numeratorLabel);assert.ok(m.formula);}
});
test('delivery episodes, leads and dialler events do not share a count label',()=>{
  assert.equal(METRIC_BY_ID.delivered_episodes.grain,'delivery');
  assert.equal(METRIC_BY_ID.delivered_episodes.label,'Lead Deliveries');
  assert.notEqual(METRIC_BY_ID.delivered_episodes.label,LEGACY_LABELS.delivered);
  assert.equal(METRIC_BY_ID.call_attempts.numeratorLabel,'Observed Dialler Events');
});
test('v2 coverage identifies the common delivered episode population',()=>{
  const m=METRIC_BY_ID.call_coverage;
  assert.equal(m.denominatorLabel,'Successful Delivery Episodes');
  assert.match(m.formula,/Delivered Episodes with a Subsequent Call.*Successful Delivery Episodes.*100/);
});
test('sale conversion numerator is sales with activation, not an activation event count',()=>{
  const m=METRIC_BY_ID.sale_activation_rate;
  assert.equal(m.numeratorLabel,'Sales with at Least One Activation');assert.equal(m.denominatorLabel,'Distinct Sale Events');
});
test('commercial stages remain distinct amounts and never imply profit',()=>{
  assert.deepEqual(['expected','approved','invoiced','collected'].map(s=>METRIC_BY_ID[s+'_value'].label),['Expected Value','Approved Value','Invoiced Amount','Collected Amount']);
  for(const id of ['expected_value','approved_value','invoiced_value','collected_value'])assert.match(METRIC_BY_ID[id].definition,/signed.*deltas/);
});
test('legacy frontend and server consume the same metric definitions',()=>{
  assert.equal(frontend,backend);assert.equal(frontend,LEGACY_METRICS);
});
test('journey reference catalogue is shared rather than copied into each layer',()=>{
  assert.equal(frontendTaxonomy,backendTaxonomy);assert.equal(new Set(frontendTaxonomy.map(t=>t.itemNo)).size,frontendTaxonomy.length);
});
test('legacy rates describe the executed lead denominators',()=>{
  assert.match(LEGACY_METRICS.sale_rate.denominator,/has_call/);assert.equal(LEGACY_METRICS.sale_rate.denominatorLabel,'Dialled Leads');
  assert.match(LEGACY_METRICS.call_coverage.denominator,/has_delivery/);assert.equal(LEGACY_METRICS.call_coverage.denominatorLabel,'Delivered Leads');
  assert.match(LEGACY_METRICS.activation_rate.denominator,/has_sale/);
});
test('all legacy explorer expressions have a named unit and definition',()=>{
  assert.deepEqual(EXPLORER_METRICS.map(m=>m.id),Object.keys(EXPLORER_EXPRESSIONS));
  for(const m of EXPLORER_METRICS){assert.ok(m.label);assert.ok(m.definition);assert.ok(m.unit);}
});
test('percentages already returned as percent are not multiplied again',()=>{
  assert.equal(formatExplorerValue(12.5,'sale_rate'),'12.5%');
  assert.equal(formatExplorerValue(12.5,'call_coverage'),'12.5%');
  assert.equal(formatExplorerValue(0,'call_coverage'),'0%');
});
test('missing percentage is unavailable and ratios are not additive',()=>{
  assert.equal(formatExplorerValue(null,'sale_rate'),'Unavailable');
  assert.equal(formatExplorerValue(undefined,'call_coverage'),'Unavailable');
  assert.equal(EXPLORER_METRICS.find(m=>m.id==='call_coverage')!.additive,false);
  assert.equal(EXPLORER_METRICS.find(m=>m.id==='revenue_per_lead')!.additive,false);
});
test('unmapped concepts are not relabelled valid flags or recorded revenue',()=>{
  for(const id of ['standardised_leads','qualified_leads','answered_calls','answer_rate','delivered_sales','premium_collections','lifetime_value','duplicate_leads']){
    assert.equal(LEGACY_METRICS[id].mappingStatus,'UNAVAILABLE',id);assert.equal(LEGACY_METRICS[id].numerator,'CAST(NULL AS INT64)');
  }
});
test('raw export keys are stable and their record-unit descriptions are explicit',()=>{
  const source=exportColumnDefinitions(['lead_id','medium','total_calls','sale'],'transaction');
  assert.deepEqual(source.columns.map(c=>c.key),['lead_id','medium','total_calls','sale']);
  assert.equal(source.recordUnit,'vendor_transaction_row');assert.equal(source.columns[1].label,'Traffic Medium');
  assert.equal(source.columns[3].label,'Transaction-Row Sale Flag');
});
test('navigational page titles use one shared registry',()=>{
  for(const file of ['src/App.tsx','src/components/PageHeader.tsx','src/components/CommandPalette.tsx'])assert.match(read(file),/PAGE_TITLES/);
  assert.equal(PAGE_TITLES['/reports'],'Evidence Reports');assert.equal(PAGE_TITLES['/call-performance'],'Call Performance');
});
test('legacy call and timing labels cannot claim resolution or fabricated benchmarks',()=>{
  const call=read('src/pages/CallPerformance.tsx'),speed=read('src/pages/SpeedToLead.tsx');
  assert.doesNotMatch(call,/One.Call Resolution|87%|First.Call Resolution/);
  assert.equal(LEGACY_LABELS.one_call_rate,'One-Call Lead Share');assert.match(speed,/whole.minute|Whole.minute/i);
});
test('legacy source ratios do not fall back to a different denominator for zero',()=>{
  assert.doesNotMatch(read('src/pages/SourceAnalysis.tsx'),/callCoverage\s*\|\|\s*row.callRate|leadToSaleRate\s*\|\|\s*row.saleRate/);
});
test('legacy transaction flags are explicitly separate from lead counts',()=>{
  assert.equal(LEGACY_METRICS.transaction_sale_flags.grain,'vendor_transaction_row');
  assert.equal(LEGACY_METRICS.sales.grain,'lead');
  assert.notEqual(LEGACY_METRICS.transaction_sale_flags.canonicalName,LEGACY_METRICS.sales.canonicalName);
});

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

test('browser title and social metadata match the application brand',()=>{
  const html=read('index.html');
  assert.match(html,/<title>ConversionX \| Lead &amp; Revenue Analytics<\/title>|<title>ConversionX \| Lead & Revenue Analytics<\/title>/);
  assert.doesNotMatch(html,/Production-ready|Revenue Intelligence/);
});
test('explorer metric header exposes its denominator to assistive technology',()=>{
  const source=read('src/pages/Explore.tsx');
  assert.match(source,/aria-label="Explorer results"/);
  assert.match(source,/scope="col" className="text-right" aria-label=\{METRICS/);
});
