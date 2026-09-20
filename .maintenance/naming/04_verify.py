from pathlib import Path
import re
R=Path.cwd()
def edit(p,fn): f=R/p;f.write_text(fn(f.read_text()))
def write(p,s): (R/p).parent.mkdir(parents=True,exist_ok=True);(R/p).write_text(s)
for f in list((R/'src').rglob('*.tsx'))+[R/'contracts/taxonomy.ts']:
    f.write_text(f.read_text().replace('CPL.Dialled','CPL.Dialed'))
edit('contracts/taxonomy.ts',lambda s:s.replace(' * OFFICIAL METRIC TAXONOMY & NAMING CONVENTIONS\n * Authoritative single source of truth for all metric terminology, report values,\n * cost metrics, formulas, and waterfall calculations across the application.', ' * JOURNEY REFERENCE CATALOGUE\n * Preserves historical item numbers and cost codes. This catalogue does not establish\n * source availability, actual spend, billability, payment or a runtime metric definition.')
 .replace('metric: "Return On Customer Lifetime Value"','metric: "Lifetime Value / Acquisition Cost (Reference Ratio)"'))
edit('contracts/reporting.ts',lambda s:re.sub(r", label: '[^']*'(?=, grain:)", '', s).replace('id: `${stage}_value`, label: `${stage[0].toUpperCase() + stage.slice(1)} value`, grain:', 'id: `${stage}_value`, grain:'))
edit('src/components/GlobalFilter.tsx',lambda s:s.replace('Commercial Sale Realized','Sale Recorded').replace('Sale Completed (Yes)','Recorded Sale Flag (Yes)').replace('Unconverted (No)','Recorded No Sale Flag').replace('No Contact (No)','Recorded No RPC Flag').replace('Policy Activated (Yes)','Recorded Activation Flag (Yes)').replace('Activation Confirmed','Activation Recorded').replace('Partner Vendor','Vendor').replace('Vetting Score Tier','Vetting Classification').replace('Applied deterministically across all BigQuery analytical queries','Supported filters depend on the report; unsupported combinations are rejected.').replace('Applied globally across all metrics, views, and tabs.','Selects capture cohorts in legacy reports. Evidence Reports use their own explicit date contract.'))
edit('src/pages/Funnel.tsx',lambda s:s.replace('Right-party contact rate (CP.RPC) by call attempt bucket.','Lead RPC flags / lead records in each call-attempt band. CP.RPC is a cost metric and is not plotted here.'))
for p in ['src/pages/Cohorts.tsx','src/pages/SourceAnalysis.tsx']:
    edit(p,lambda s:s.replace('>Billable<','>Leads with Sales and Recorded Revenue<').replace('>Billable %<','>Revenue-Matched Sales / Sales (%)<'))
edit('src/pages/Outcomes.tsx',lambda s:s.replace('funnel.step_1_captured_leads || summary.total_leads || 0','funnel.step_1_captured_leads ?? 0').replace('funnel.step_5_sale_leads || summary.total_sales || 0','funnel.step_5_sale_leads ?? 0').replace('funnel.step_6_billable_sale_leads || summary.billable_sales || 0','funnel.step_6_billable_sale_leads ?? 0'))
edit('src/pages/Overview.tsx',lambda s:"import { LEGACY_LABELS } from '../../contracts/naming';\n"+s.replace('title="Fetched Lead-to-Sale Rate"','title={LEGACY_LABELS.lead_to_sale_rate}').replace('title="Dialled Lead-to-Sale Rate"','title={LEGACY_LABELS.sale_rate}').replace('title="Sale-to-Activation Rate"','title={LEGACY_LABELS.activation_rate}'))
edit('src/pages/Explore.tsx',lambda s:s.replace('metricValues.length : 0','metricValues.length : null').replace('formatTooltip(Number(topContributor?.value) || 0)','formatTooltip(topContributor?.value)')
 .replace('value={metric}\n','aria-label="Measure"\n                value={metric}\n').replace('value={dimension}\n','aria-label="Dimension"\n                value={dimension}\n').replace('value={chartType}\n','aria-label="Visualisation"\n                value={chartType}\n')
 .replace('<option value="donut">','<option value="donut" disabled={!additive}>'))
write('contracts/exportLabels.ts', '''import { NAMING_VERSION } from './naming';
const LABELS: Record<string,string> = {
  lead_id:'Lead ID', consumer_id:'Consumer ID', capture_date:'Capture Date', source:'Lead Source', medium:'Traffic Medium',
  vendor:'Vendor', transaction_id:'Vendor Transaction ID', valid_lead:'Recorded Lead-Validity Flag', valid_idno:'Recorded ID-Validity Flag',
  phone_valid:'Recorded Phone-Validity Flag', grade:'Recorded Lead Grade', vetting:'Recorded Vetting Classification', vendor_count:'Distinct Vendors per Lead',
  total_transactions:'Distinct Transaction IDs per Lead', has_delivery:'Lead Has Delivery Evidence', has_call:'Lead Has Call Evidence',
  has_rpc:'Lead Has RPC Flag', has_sale:'Lead Has Sale Flag', has_activation:'Lead Has Activation Flag', total_revenue:'Recorded Revenue per Lead',
  attempted_delivery_timestamp:'Attempted Delivery Timestamp', delivery_timestamp:'Recorded Delivery Timestamp',
  first_call_timestamp:'First Recorded Call Timestamp', last_call_timestamp:'Last Recorded Call Timestamp', latest_dialer_status:'Latest Recorded Dialler Status',
  rpc:'Transaction-Row RPC Flag', sale:'Transaction-Row Sale Flag', activation:'Transaction-Row Activation Flag', revenue:'Transaction-Row Recorded Revenue',
  total_call_duration_seconds:'Recorded Total Call Duration (Seconds)',
};
export function exportColumnDefinitions(columns: string[], grain: string) {
  const recordUnit = grain === 'transaction' ? 'vendor_transaction_row' : 'lead';
  return { namingVersion: NAMING_VERSION, recordUnit,
    columns: columns.map(key=>({key, label:key==='total_calls' ? (recordUnit==='lead'?'Recorded Call Attempts per Lead':'Recorded Call Counter on Transaction Row') : LABELS[key] || key,
      status:'LEGACY_UNVERIFIED', note:key==='total_calls'?'Legacy joined call counters may overlap; this is not certified event-level counting.':null})) };
}
''')
edit('server/bigquery/export.ts',lambda s:"import { exportColumnDefinitions } from '../../contracts/exportLabels';\n"+s.replace("filters: scope.filters, grain: input.grain,", "filters: scope.filters, ...exportColumnDefinitions(columns, input.grain), grain: input.grain,").replace('report_model: MODEL_VERSION,','report_model: MODEL_VERSION, report_naming_version: metadata.namingVersion, report_record_unit: metadata.recordUnit,'))
edit('tests/reporting-http.test.ts',lambda s:s.replace("assert.equal(first.totals[0].value,'9007199254740993');", "assert.equal(first.totals[0].value,'9007199254740993');assert.equal(first.metricDefinitions[0].label,'Fetched Leads');assert.equal(first.metricDefinitions[0].numeratorLabel,'Distinct Lead Submissions');assert.equal(first.metricDefinitions[0].id,'fetched_leads');"))
write('tests/naming.test.ts', '''import test from 'node:test';
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
''')
edit('tooling/browser/smoke.mjs',lambda s:s.replace("metricVersion:'cx.metrics.2.0.0'","metricVersion:'cx.metrics.2.0.1'")
 .replace("else if(url.pathname==='/api/reporting/reports'){", "else if(url.pathname==='/api/analytics/explore')data=[{dim1:'Synthetic Source',value:12.5,sampleSize:8,fullFunnel:{}}];\n      else if(url.pathname==='/api/reporting/reports'){")
 .replace("await page.getByLabel('From (UTC)',{exact:true}).fill", "assert.equal(await page.getByRole('heading',{level:1}).textContent(),'Evidence Reports');checks++;\n    await page.getByLabel('From (UTC)',{exact:true}).fill")
 .replace("const calls=page.getByTestId('metric-call_attempts')", "assert.equal(await page.getByLabel('Call Attempts',{exact:true}).count(),1);checks++;\n    const calls=page.getByTestId('metric-call_attempts')")
 .replace("assert.equal(await calls.textContent(),'5');checks++;", "assert.equal(await calls.textContent(),'5');checks++;\n    assert.equal(await page.getByTestId('metric-call_attempts').getByRole('heading').textContent(),'Call Attempts');checks++;\n    assert.equal(await page.getByTestId('metric-collected_value').getByRole('heading').textContent(),'Collected Amount');checks++;\n    await page.getByTestId('metric-call_coverage').getByRole('button',{name:'Definition',exact:true}).click();\n    await page.getByLabel('Metric definition').getByText('Delivered Episodes with a Subsequent Call / Successful Delivery Episodes × 100',{exact:false}).waitFor();checks++;")
 .replace("await page.getByText('5 records. Truncation: no. Preview shows up to 20 records.').waitFor();checks++;", "await page.getByText('5 records. Truncation: no. Preview shows up to 20 records.').waitFor();checks++;\n    assert.equal(await page.getByRole('heading',{name:'Evidence: Call Attempts',exact:true}).count(),1);checks++;")
 .replace("assert.deepEqual(errors,[]);checks++;await page.close();", """await page.goto('http://127.0.0.1:3187/explore');await page.getByLabel('Measure',{exact:true}).selectOption('sale_rate');
    await page.getByLabel('Visualisation',{exact:true}).selectOption('table');await page.getByRole('cell',{name:'12.5%',exact:true}).waitFor();checks++;
    assert.equal(await page.getByRole('heading',{level:1}).textContent(),'Data Explorer');checks++;
    assert.equal(await page.getByText('Not additive',{exact:true}).count(),1);checks++;
    assert.equal(await page.getByRole('columnheader',{name:'Sales / Dialled Leads (%)',exact:true}).count(),1);checks++;
    assert.equal(await page.getByText('1,250%',{exact:true}).count(),0);checks++;
    await page.screenshot({path:`verification/naming-explorer-${viewport.width}.png`,fullPage:true});
    assert.deepEqual(errors,[]);checks++;await page.close();"""))
write('docs/NAMING.md', '''# ConversionX naming and metric definitions

Naming version: `cx.naming.1.0.0`. Versioned-report metric definition: `cx.metrics.2.0.1`.

`contracts/naming.ts` owns page names, report labels and legacy display vocabulary. `contracts/legacyMetrics.ts` owns the existing dynamic metric expressions and matching human definitions. Frontend/backend metric and journey-reference imports now share these contracts rather than maintaining divergent copies. Machine identifiers, source columns, vendor values and existing API metric IDs are retained.

## Units must be visible

- **Fetched Leads** counts lead submissions, not distinct people.
- **Lead Deliveries** counts successful vendor delivery episodes. This is not a distinct-lead count and is not proof of queue acceptance.
- **Call Attempts** counts observed dialler events in v2. **Recorded Call Attempts** in legacy screens means joined source counters, explicitly unverified.
- **Dialled Lead Deliveries** counts delivered episodes with a subsequent observed call. **Dialled Leads** is the separate legacy lead-level count.
- **Sales (Recorded Events)** and **Activations (Recorded Events)** are event counts. Legacy **Leads with Sales** and **Leads with Activations** are lead flags. Neither is a consumer count.
- **Sale Flags (Transaction Rows)** is a third population used by legacy vendor/outcome breakdowns, not interchangeable with leads or events.
- **Leads with Sales and Recorded Revenue** describes the legacy positive-revenue proxy. It must not be called Delivered Sales, approved billable sales, Premium Collections or cash received.

## Rates state both populations

V2 Delivery-to-Dial Rate = delivered episodes with a subsequent call / successful delivery episodes × 100. V2 Sale-to-Activation Rate = sales with at least one activation / distinct sales × 100. Extra activation events do not add extra numerator sales.

Legacy labels state the actual denominator: Sales / Dialled Leads, Sales / Fetched Leads, RPC / Dialled Leads, Dialled / Delivered Leads, Revenue-Matched Sales / Sales, or Activations / Revenue-Matched Sales (Lead Counts) where that query uses matched sales. Transaction-row tables identify their separate denominator explicitly.

Call-band percentages use lead records in each band, not outcomes caused by the nth call. One-Call Lead Share is not first-call resolution. First-dial-hour charts count lead records at their first dial, not call events. Duration includes the recorded source duration and is not labelled talk time without a talk-time mapping.

Legacy explorer percentages arrive in percent units; the browser does not multiply them by 100 again. Ratios are non-additive. Its explicitly labelled unweighted group average is not an overall conversion rate. Unsupported dynamic dimensions are not offered. Legacy charts remain unverified despite corrected labels.

## Money and commercial meaning

Expected Value, Approved Value, Invoiced Amount and Collected Amount are distinct signed ledger stages. They are not treated as synonyms for revenue or profit. Recorded Revenue in legacy screens is not verified collected cash. No rate cards, billing approvals or financial recognition rules were created by this naming change.

Standardised Leads, Qualified Leads, Delivered Sales, Answered Calls, Premium Collections, Customer Lifetime Value and duplicate classifications remain unavailable where there is no validated mapping. Validity alone does not prove standardisation or qualification. A failed validity check does not establish a duplicate.

## Compatibility, evidence and release handling

API IDs such as `billable_sales`, source keys such as `has_call`, and raw CSV column names remain stable for integrations. Export JSON now includes column definitions, record-unit and naming-version metadata; CSVs retain their exact source headers plus reporting-unit metadata. Report/evidence JSON includes the metric definition with human numerator and denominator labels.

The v2 metric version and source fingerprint change together so an old snapshot release cannot silently acquire new definitions. Publish a separately validated release using the updated contract before serving it through the new engine. No existing live release, source data or production configuration was modified.

Historical journey item numbers and cost-code identifiers are preserved in the shared reference catalogue. That catalogue is explicitly reference-only, not proof that every journey stage is available or a validated runtime formula.

Tests cover contract parity, stable IDs, unit distinctions, percentage scaling, unavailable concepts, export metadata and browser label consistency. Browser and HTTP cases use synthetic data; passing them does not certify live source completeness or all legacy analytics.
''')
