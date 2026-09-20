from pathlib import Path
import re,json
R=Path.cwd()
def write(p,s): (R/p).write_text(s)
def edit(p,fn): f=R/p;f.write_text(fn(f.read_text()))
for f in (R/'src').rglob('*.tsx'):
 s=f.read_text()
 for old,new in [('Dialed','Dialled'),('dialed','dialled'),('Re-Dialed','Re-Dialled'),('Call Center','Call Centre'),('call center','call centre'),('Right Party Contact','Right-Party Contact'),('Right party contact','Right-party contact')]:
  if old=='dialed': s=re.sub(r'\bdialed\b',new,s)
  else:s=s.replace(old,new)
 s=s.replace('METRICS.dialled_leads','METRICS.dialled_leads')
 f.write_text(s)
p='src/components/PageHeader.tsx';s=(R/p).read_text();s="import { useLocation } from 'react-router-dom';\nimport { PAGE_TITLES } from '../../contracts/naming';\n"+s
s=s.replace('  return (','  const location = useLocation();\n  const pageTitle = PAGE_TITLES[location.pathname] || title;\n  return (',1).replace('{title}</h1>','{pageTitle}</h1>')
write(p,s)
p='src/App.tsx';s=(R/p).read_text();s="import { BRAND, PAGE_TITLES } from '../contracts/naming';\n"+s
s=re.sub(r"name: '[^']+', path: '([^']+)'",lambda m:f"name: PAGE_TITLES['{m[1]}'], path: '{m[1]}'",s)
s=s.replace('>ConversionX</span>','>{BRAND.name}</span>').replace('>Revenue Intelligence</span>','>{BRAND.description}</span>')
write(p,s)
p='src/components/CommandPalette.tsx';s=(R/p).read_text();s="import { PAGE_TITLES } from '../../contracts/naming';\n"+s
s=re.sub(r"title: '[^']+',([\s\S]*?action: \(\) => \{ navigate\('([^']+)'\))",lambda m:"title: PAGE_TITLES['"+m[2]+"'],"+m[1],s)
pos=s.index('    // Pages')+len('    // Pages')
s=s[:pos]+"\n    { id: 'page-reports', title: PAGE_TITLES['/reports'], subtitle: 'Versioned metrics, fixed data releases and supporting records', category: 'Pages', icon: ShieldCheck, action: () => { navigate('/reports'); onClose(); }, keywords: ['evidence','report','verified','snapshot'] },"+s[pos:]
s=s.replace('AI-assisted deterministic variance explanations and alerts','Observed changes between equal-length reporting periods').replace('First contact latency buckets and conversion decay curves','Elapsed capture-to-delivery and delivery-to-first-dial timing').replace('Sales realization, revenue leakage, clawbacks & billing yields','Recorded sales, activations and revenue; not verified billing or cash')
write(p,s)
p='src/pages/VersionedReports.tsx';s=(R/p).read_text();s="import { PAGE_TITLES } from '../../contracts/naming';\n"+s
s=s.replace('>Evidence reports</h1>',">{PAGE_TITLES['/reports']}</h1>").replace('Money currency','Currency').replace('Lead capture cohort','Lead Capture Cohort').replace('Individual event date','Event Date').replace('Knowledge cutoff:', 'Data Available Through:')
s=s.replace('Numerator: {exactNumber(m.numerator)}','{METRIC_BY_ID[m.metricId].numeratorLabel}: {exactNumber(m.numerator)}')
s=s.replace('Denominator: {exactNumber(m.denominator)}','{METRIC_BY_ID[m.metricId].denominatorLabel}: {exactNumber(m.denominator)}')
s=s.replace('{METRIC_BY_ID[definition].definition}</p>','{METRIC_BY_ID[definition].definition}</p><p className="mt-2 text-sm"><strong>Formula:</strong> {METRIC_BY_ID[definition].formula}</p><p className="mt-1 text-sm"><strong>Unit counted:</strong> {METRIC_BY_ID[definition].numeratorLabel}</p>')
write(p,s)
p='src/components/MetricLineageDrawer.tsx';s=(R/p).read_text()
s=s.replace('    (lineage.itemNo ?', '    lineage.mappingStatus ? undefined : (lineage.itemNo ?',1)
s=s.replace('Official Metric Taxonomy','Metric Definition').replace('Standard Metric Name','Reported Metric Name').replace('Waterfall Conversion Formula','Calculation Formula')
s=s.replace('          {/* Official Taxonomy Specification Card */}', '''          <p className="text-xs text-text-sec">{lineage.mappingStatus === 'UNAVAILABLE'
            ? 'Source mapping unavailable. No calculation is represented as measured.'
            : lineage.mappingStatus ? 'Legacy calculation definition. Source data and results remain unverified.'
            : 'Journey reference only. This does not establish that the metric is available in the application.'}</p>
          {/* Runtime metadata takes precedence over the reference journey catalogue. */}''')
write(p,s)
p='src/components/KpiCard.tsx';s=(R/p).read_text();s=s.replace('value: string | number;', 'value: string | number | null;')
s=s.replace('Stable vs baseline','No comparison supplied')
s=s.replace('{typeof value === "number" ? formatKpiValue(value) : value}', '{value === null || value === undefined ? "Unavailable" : typeof value === "number" ? formatKpiValue(value) : value}')
s=s.replace('{prefix &&', '{prefix && value !== null && value !== undefined &&').replace('{suffix &&','{suffix && value !== null && value !== undefined &&')
write(p,s)
lead_pages=['Overview','Funnel','SourceAnalysis','QualityVetting','Cohorts','Explore']
common={
 'Called Leads':'Dialled Leads', 'Unique Leads':'Fetched Leads', 'Recorded Sales':'Leads with Sales',
 'Sales with Matched Revenue':'Leads with Sales and Recorded Revenue', 'Recorded Activations':'Leads with Activations',
 'Billable Sales':'Leads with Sales and Recorded Revenue', 'Delivered Sales':'Leads with Sales and Recorded Revenue',
 'Total Revenue':'Recorded Revenue', 'Revenue per Lead':'Recorded Revenue per Fetched Lead',
 'Rev / Lead':'Recorded Revenue / Lead', 'Sale Event %':'Sales / Fetched Leads (%)',
 'Billable Sale %':'Revenue-Matched Sales / Sales (%)', 'Call Rate %':'Dialled / Fetched Leads (%)',
 'RPC Rate %':'RPC / Dialled Leads (%)',
}
def literals(s,mapping):
 for a,b in mapping.items():
  for quote in ['"',"'"]:
   s=s.replace(quote+a+quote,quote+b+quote)
  s=s.replace('>'+a+'<','>'+b+'<')
 return s
for page in lead_pages: edit('src/pages/'+page+'.tsx',lambda s:literals(s,common))
p='src/pages/Overview.tsx';s=(R/p).read_text().replace('Called Lead-to-Sale Rate','Dialled Lead-to-Sale Rate').replace('Recorded sales / called leads','Leads with sales / dialled leads').replace('Recorded sales / fetched leads','Leads with sales / fetched leads').replace('Recorded activations / recorded sales','Leads with activations / leads with sales')
s=s.replace("'Sales with Matched Revenue'","'Leads with Sales and Recorded Revenue'")
write(p,s)
p='server/bigquery/queries.ts';s=(R/p).read_text()
s=s.replace("stage: 'Standardised Leads'", "stage: 'Valid Leads (Recorded Flag)'").replace("costMetric: 'CPL.Standardised'", "costMetric: 'CPL.Valid'")
s=s.replace("stage: 'Dialed Leads'", "stage: 'Dialled Leads'").replace("stage: 'Right Party Contact'", "stage: 'Leads with RPC'").replace("stage: 'Sales'", "stage: 'Leads with Sales'").replace("stage: 'Delivered Sales'", "stage: 'Leads with Sales and Recorded Revenue'").replace("stage: 'Activated Sales'", "stage: 'Leads with Activations'")
s=s.replace("itemNo: 23, costMetric: 'CPL.Valid'", "itemNo: null, costMetric: 'CPL.Valid'").replace("itemNo: 45, costMetric: 'CPS.Delivered'", "itemNo: null, costMetric: null")
s=s.replace("title: 'Unbilled Sales (Revenue Leakage)'", "title: 'Leads with Sales but No Matched Revenue'")
s=s.replace("issue: 'No anomalies detected'", "issue: 'No exceptions found by these three checks'")
s=s.replace("{ name: 'Capture to Delivery',", "{ id: 'capture_to_delivery', name: 'Capture to Delivery',")
s=s.replace("{ name: 'Delivery to First Call',", "{ id: 'delivery_to_first_dial', name: 'Delivery to First Call',")
write(p,s)
p='src/pages/Outcomes.tsx';s=(R/p).read_text()
s=literals(s,{'Sales':'Leads with Sales','Delivered Sales':'Leads with Sales and Recorded Revenue','Activated Sales':'Leads with Activations','Unbilled Sales':'Sales without Matched Revenue','Total Sales Value':'Recorded Revenue','Realized revenue':'Expected or recorded value; not verified cash','Rev / Delivered Sale':'Revenue / Revenue-Matched Sale','Revenue per Lead':'Recorded Revenue per Fetched Lead','Revenue':'Recorded Revenue','Total Revenue':'Recorded Revenue'})
s=s.replace('METRICS.delivered_sales','METRICS.sales_with_revenue')
s=s.replace('Delivered vs unbilled sales reconciliation, status economics, revenue leakage, and full commercial funnel tracking.','Lead-level sale flags and transaction-level revenue matches. Positive recorded revenue does not prove sale delivery, billability or collection.')
s=s.replace('% delivery (CPS.Delivered)','% of leads with sales').replace('% revenue leakage','% of leads with sales without matched revenue')
s=s.replace("costMetric: 'CPS.Delivered', itemNo: 45", "costMetric: undefined, itemNo: undefined")
s=s.replace('All reported sales (CP.Sale)','Lead records with a sale flag').replace('Top of funnel (CPL)','Distinct fetched lead records')
a=s.index('            A total of <span');b=s.index('\n          </div>',a)
s=s[:a]+'''            <span className="font-bold">{Number(summary.unbilled_sales).toLocaleString()} leads with sales</span> have no positive matched recorded revenue. Missing reporting, timing or non-billable outcomes may explain this; the amount is not a measured financial loss.
'''+s[b:]
s=s.replace('Vendor Sales Realization & Leakage Comparison','Vendor Sale Flags by Revenue Match').replace('Visualizing billable revenue sales (green) versus unbilled sales leakage (amber) by partner.','Transaction sale flags with positive matched revenue versus sale flags without positive matched revenue, by vendor.')
s=s.replace('Billable Sales','Sale Flags with Recorded Revenue').replace('Billable Sale','Sale Flags with Recorded Revenue').replace('Unbilled Sales','Sale Flags without Matched Revenue').replace('Revenue Leakage','Missing Revenue Matches').replace('Realized Rev','Recorded Revenue')
s=s.replace('<th className="text-right">Sales</th>','<th className="text-right">Sale Flags (Transaction Rows)</th>')
write(p,s)
p='src/pages/QualityVetting.tsx';s=(R/p).read_text();s=literals(s,{'Vetting Pass Rate':'Recorded Validation Pass Rate','Duplicate / Invalid Rate':'Recorded Validation Failure Rate','Delivered Conversion':'Fetched-to-Delivered Lead Rate','Quality-Adjusted Rev / Lead':'Recorded Revenue per Fetched Lead','Grade Distribution':'Validation Flag Distribution','Vetting Outcomes':'Recorded Validation Outcomes','Billable':'Sales with Recorded Revenue','Dialed':'Dialled'})
s=s.replace('suppressed records','failed-validation records').replace('Volume of leads by assigned grade tier.','Pass and fail counts from the recorded validity flag; not a grade distribution.').replace('Volume of leads by validation & duplicate outcome.','Recorded validity flags; duplicate causes are not classified.')
write(p,s)
p='src/pages/Cohorts.tsx';s=(R/p).read_text()
s=re.sub(r'\s*<option value="rpc">.*?</option>','',s);s=re.sub(r'\s*<option value="revenue">.*?</option>','',s)
s=s.replace('Dial Coverage %','Dialled / Fetched Leads (%)').replace('Lead &rarr; Sale %','Sales / Fetched Leads (%)').replace('Delivered &rarr; Activation %','Activations / Fetched Leads (%)')
s=s.replace('const formatHeatmapVal', "const heatmapLabel = { call_coverage: 'Dialled / Fetched Leads', sale: 'Sales / Fetched Leads', activation: 'Activations / Fetched Leads' }[metricType];\n\n  const formatHeatmapVal")
s=s.replace("{metricType.replace('_', ' ')}",'{heatmapLabel}').replace('by days elapsed since lead capture.','by calendar days since capture; the denominator is fetched leads in each cohort.')
s=s.replace('selected client and date range','selected tenant and date range')
write(p,s)
p='src/pages/Funnel.tsx';s=(R/p).read_text().replace("d.stage === 'Activated Sales'", "d.stage === 'Leads with Activations'")
s=literals(s,{'Revenue Leakage Waterfall':'Recorded Lead-Stage Counts','Call Frequency vs. Right-Party Contact Rate':'RPC Share by Call-Attempt Band','RPC Rate (CP.RPC)':'RPC / Leads in Band (%)','Call Frequency vs. Lead-to-Sale Rate':'Sale Share by Call-Attempt Band','Sale Rate (CP.Sale)':'Sales / Leads in Band (%)'})
s=s.replace('Right party contact rate (CP.RPC) by call attempt bucket.','Lead-level RPC flags / leads in each call-attempt band.').replace('Qualified Leads to Sale Rate (CP.Sale) by call attempt bucket.','Leads with sales / leads in each call-attempt band.').replace('Lifecycle transition analysis highlighting volume loss.','Recorded stage counts; a decline between non-nested populations is not proof of leakage.')
write(p,s)
p='src/pages/Explore.tsx';s=(R/p).read_text();s="import { EXPLORER_METRICS, formatExplorerValue } from '../../contracts/legacyMetrics';\nimport { DIMENSION_LABELS } from '../../contracts/naming';\n"+s
a=s.index('const METRICS = [');b=s.index('const DONUT_COLORS',a)
s=s[:a]+"const METRICS = EXPLORER_METRICS;\nconst DIMENSIONS = Object.entries(DIMENSION_LABELS).filter(([id]) => id !== 'vendor').map(([id,label]) => ({id,label}));\n\n"+s[b:]
s=s.replace("const isRate = metric.includes('rate');", "const selectedMetric = METRICS.find(m => m.id === metric)!;\n  const isRate = selectedMetric.unit === 'percent';\n  const additive = selectedMetric.additive;")
a=s.index('  const formatY =');b=s.index('  // Derived statistics',a)
s=s[:a]+"  const formatY = (val: number) => formatExplorerValue(val, metric, currencyPrefix);\n  const formatTooltip = (val: unknown) => formatExplorerValue(val, metric, currencyPrefix);\n\n"+s[b:]
s=s.replace('const metricValues = rows.map(r => Number(r.value) || 0);','const metricValues = rows.filter(r => r.value !== null && r.value !== undefined).map(r => Number(r.value));')
s=s.replace('totalMetricSum / rows.length','totalMetricSum / metricValues.length').replace('rows.length > 0 ? totalMetricSum','metricValues.length > 0 ? totalMetricSum')
s=s.replace('Aggregate Total','Returned Group Total').replace("{isRate ? `${(avgMetricVal * 100).toFixed(1)}% (Avg)` : formatTooltip(totalMetricSum)}", "{additive ? formatTooltip(totalMetricSum) : 'Not additive'}")
s=s.replace('Segment Average','Unweighted Group Average').replace('Top Contributor','Highest Displayed Value').replace('Top 3 Concentration','Top 3 Share (Returned Groups)')
s=s.replace('{top3Share}%','{additive ? `${top3Share}%` : \'Not applicable\'}').replace('of total volume','Not an overall ratio or complete report total')
s=s.replace('{share}%','{additive ? `${share}%` : \'Not applicable\'}').replace('Share of Total','Share of Returned Total')
s=s.replace("onClick={() => setChartType('donut')}","disabled={!additive}\n                    onClick={() => setChartType('donut')}")
s=s.replace("chartType === 'donut' ? (", "chartType === 'donut' && additive ? (")
write(p,s)
