// Isolated production-client QA. All API responses are synthetic; no auth or warehouse is bypassed.
// node tooling/browser/frontend-ux.mjs --mode baseline --dist /private/tmp/cx-frontend-baseline-1f8340d-dist/client
// node tooling/browser/frontend-ux.mjs --mode after
// Repository regression runner. Interactive inspection is performed with the Browser integration first.
import { chromium, firefox, webkit } from 'playwright';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { fixtures } from './visual-controls.mjs';
import { fixture as vettingFixture } from './vetting-controls.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const mode = option('--mode', 'after'), engine = option('--browser', 'chromium');
const sourceCommit = option('--source-commit', null);
const sourceDist = path.resolve(option('--dist', path.join(root, 'dist/client')));
const output = path.resolve(option('--output', path.join(os.tmpdir(),`cx-frontend-ux-${mode}-${engine}`)));
fs.mkdirSync(output, {recursive:true});
// A concurrent application build must not delete route chunks during a QA run.
const dist = fs.mkdtempSync(path.join(output,'client-build-'));
fs.cpSync(sourceDist,dist,{recursive:true});
const widths = option('--widths', '320,360,390,768,1024,1440,1920').split(',').map(Number);
const quick = process.argv.includes('--quick');
const serveOnly = process.argv.includes('--serve-only');
const checkOverviewAccessibility = process.argv.includes('--check-overview-accessibility');
const repeat = Math.max(1, Math.min(10, Number(option('--repeat','1')) || 1));
const cutoff = '2026-09-20T00:00:00.000Z';
const core = option('--routes', '/overview,/vendors,/explore,/vetting,/exceptions,/reconciliation,/reports,/visuals').split(',');
const routes = [...new Set([...core, '/insights', '/routing', '/consumers', '/acquisition', '/lead-performance', '/speed-to-lead', '/call-performance', '/cohorts', '/outcomes', '/sources', '/quality', '/revetting', '/data-trust', '/data-quality', '/data-coverage', '/audit', '/explorer', '/admin', '/validation'])];
const evidence = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/reporting-reference.json'), 'utf8'));
const reportGroups = Array.from({length: 1000}, (_, i) => ({metricId: 'call_attempts', group: `Synthetic group ${String(i + 1).padStart(4, '0')}`, value: '1', numerator: '1', denominator: null, unit: 'records', calculationStatus: 'CHECKED', completeness: 'COMPLETE', reason: null}));
const mediaMetrics = [{id: 'source_rows', label: 'Media Source Rows', value: '100', status: 'MEASURED'}, {id: 'impressions', label: 'Reported Impressions', sourceField: 'impressions', value: '12000', status: 'MEASURED'}, {id: 'clicks', label: 'Reported Clicks', sourceField: 'clicks', value: '200', status: 'MEASURED'}, {id: 'platform_leads', label: 'Platform Lead Actions', sourceField: 'actions_lead', value: '37', status: 'MEASURED'}];
const metricValues={fetched_leads:'450',delivered_episodes:'380',called_episodes:'300',call_attempts:'700',call_coverage:'78.947368',sale_events:'45',activation_events:'31',sale_activation_rate:'68.888889',expected_value:'100000.25',approved_value:'82000.25',invoiced_value:'73500.10',collected_value:'62000.01'};
const unit=metricId=>metricId.endsWith('_value')?'currency':metricId.endsWith('_rate')||metricId==='call_coverage'?'percent':'records';
const exactScale=(value,factor)=>{if(value===null)return null;const [whole,fraction='']=String(value).split('.');const scale=fraction.length;const coefficient=BigInt(whole+fraction);const multiplier=BigInt(Math.round(factor*1000));const result=coefficient*multiplier/1000n;const digits=(result<0n?-result:result).toString().padStart(scale+1,'0');return `${result<0n?'-':''}${scale?digits.slice(0,-scale)+'.'+digits.slice(-scale):digits}`;};
function reportFixture(request){
  const historical=request.startDate<'2026-08-01',factor=historical ? 0.82 : 1;
  const groupNames=request.grouping==='vendor'?Array.from({length:14},(_,i)=>i===0?'Northstar Digital':i===1?'Orbit Leads':i===2?'Cape Connect':`Vendor ${String(i+1).padStart(2,'0')}`):request.grouping==='source'?['Paid Search','Organic','Affiliate','Referral','Direct']:request.grouping==='capture_month'?['2026-06','2026-07','2026-08']:[];
  const metrics=request.metrics.map(metricId=>({metricId,group:null,value:exactScale(metricValues[metricId]??'0',factor),numerator:exactScale(metricValues[metricId]??'0',factor),denominator:metricId.endsWith('_rate')||metricId==='call_coverage'?'100':null,unit:unit(metricId),calculationStatus:'CHECKED',completeness:'COMPLETE',reason:null}));
  const groups=groupNames.flatMap((group,index)=>request.metrics.map(metricId=>{const groupFactor=(groupNames.length-index)/(groupNames.length*2);return {metricId,group,value:exactScale(metricValues[metricId]??'0',factor*groupFactor),numerator:exactScale(metricValues[metricId]??'0',factor*groupFactor),denominator:metricId.endsWith('_rate')||metricId==='call_coverage'?'100':null,unit:unit(metricId),calculationStatus:'CHECKED',completeness:'COMPLETE',reason:null};}));
  return {executionId:`fixture-${request.grouping}-${request.startDate}`,queryJobId:'fixture-job',engineHash:'fixture-engine',token:'test-only-token',request,releaseId:'rfixture',modelVersion:'cx.facts.2.0.0',metricVersion:'cx.metrics.2.0.1',releaseCutoff:cutoff,sourceBatchIds:['synthetic-batch'],metricDefinitions:[],generatedAt:cutoff,validation:[],sources:[],groups,totals:metrics};
}

function apiData(url, payload) {
  const endpoint = url.pathname.replace('/api/analytics/', '');
  if (endpoint === 'clients') return [{id: 'default_tenant', name: 'Synthetic QA workspace', currency: 'ZAR', timezone: 'UTC', capabilities: {}}];
  if (endpoint === 'filter-options') return {vendors: ['Synthetic Vendor', 'Long synthetic vendor name for responsive quality assurance'], sources: ['Synthetic A', 'Synthetic B'], mediums: ['Paid'], grades: ['A'], vettings: ['Green']};
  if (endpoint === 'explore') return Array.from({length: 1000}, (_, i) => ({dim1: `Synthetic group ${String(i + 1).padStart(4, '0')}`, value: i === 0 ? '9007199254740993' : String(1000 - i), sampleSize: 1000 - i, fullFunnel: {leads: 1000 - i, called: 50, sales: 4, revenue: '0.01'}}));
  if (endpoint === 'vetting') return vettingFixture(url);
  if (endpoint === 'acquisition') return {metrics: mediaMetrics, groups: [
    {group:'Search', metrics: mediaMetrics.map(metric=>({...metric,value:{source_rows:'48',impressions:'7200',clicks:'132',platform_leads:'25'}[metric.id]}))},
    {group:'Organic', metrics: mediaMetrics.map(metric=>({...metric,value:{source_rows:'34',impressions:'3400',clicks:'51',platform_leads:'9'}[metric.id]}))},
    {group:'Partner', metrics: mediaMetrics.map(metric=>({...metric,value:{source_rows:'18',impressions:'1400',clicks:'17',platform_leads:'3'}[metric.id]}))}
  ], scope: {startDate:'2026-08-01',endDate:'2026-08-31'}, dateBasis:'Media reporting date', timezone:'UTC', timezoneVerified:false, rowGrain:'physical_source_row', populationNote:'Only records with usable dates inside the selected period are included.', financialReason:'Actual spend is not verified.', validationStatus:'NOT_VERIFIED', table:'synthetic.media', warning:'Synthetic values only.'};
  if (endpoint === 'insights' || endpoint === 'drivers') return [{segment:'Synthetic A',current:10,previous:7,change:3,pctChange:42.8}];
  if (endpoint === 'source-coverage') return {inventoryComplete:true,sources:['leads','calls','timeToDial','activations','marketing'].map(role=>({role,label:role,table:'synthetic.'+role,status:'SCHEMA_PRESENT',rowCount:'100',api:'/api/analytics/source-metrics/'+role,legacyConsumers:[role]})),unmappedTables:[],metricLineage:{versioned:[]}};
  if (endpoint.startsWith('source-metrics/')) return {role:endpoint.split('/').at(-1),metrics:[{id:'source_rows',label:'Selected Source Rows',value:'100',status:'MEASURED',validRows:'100',missingRows:'0',invalidRows:'0'}],scope:{},dateBasis:'Source-specific date'};
  if (endpoint === 'export') return [{lead_id:'synthetic-lead-1', source:'Synthetic A', revenue:'0.01'}];
  if (endpoint.startsWith('lead-timeline/')) return {lead:{id:'synthetic-lead-1'},events:[]};
  if (url.pathname === '/api/health') return {status:'fixture',bigquery:{connected:false},tables:{}};
  if (url.pathname === '/api/reporting/catalogue') return {available:true,release:{releaseId:'rfixture',cutoff,sourceBatchIds:['synthetic-batch'],sources:[],checks:[]}};
  if (url.pathname === '/api/reporting/exceptions') return {available:true,releaseId:'rfixture',cutoff,reason:null,rules:[
    {id:'identifier_mismatch',label:'Identifier relationship mismatch',description:'Canonical child facts whose approved parent key is absent.',population:'Frozen canonical facts',count:'0',vendor:null,severity:'critical',age:'At release cutoff',sourceEvidence:['leads','deliveries','calls'],status:'AVAILABLE',owner:null,reason:null,recordsPath:null,scopeBasis:'release_validation'},
    {id:'reporting_coverage_degraded',label:'Reporting coverage degraded',description:'Published facts whose evidence is partial.',population:'Published source contracts',count:'1',vendor:null,severity:'high',age:'At release cutoff',sourceEvidence:['calls'],status:'AVAILABLE',owner:'Data Operations',reason:'Call evidence is partial.',recordsPath:null,scopeBasis:'release_validation'},
    {id:'delivered_not_dialled_sla',label:'Delivered but not dialled beyond SLA',description:'Delivered episodes without a subsequent observed call after the approved threshold.',population:'Successful delivery episodes',count:null,vendor:null,severity:'high',age:null,sourceEvidence:['deliveries','calls'],status:'CONFIGURATION_REQUIRED',owner:null,reason:'Configure an approved delivery-to-first-dial SLA and operating-hours calendar.',recordsPath:null,scopeBasis:'selected_period'},
    {id:'missing_disposition',label:'Missing call disposition',description:'Observed calls without an approved canonical disposition.',population:'Observed call events',count:null,vendor:null,severity:'medium',age:null,sourceEvidence:['calls'],status:'SOURCE_UNAVAILABLE',owner:null,reason:'The canonical call fact does not include a disposition mapping.',recordsPath:null,scopeBasis:'selected_period'}]};
  if (url.pathname === '/api/reporting/reports') {
    const request = payload.request;
    if(request.grouping==='source'||request.grouping==='vendor'||request.grouping==='none'||request.grouping==='capture_month')return reportFixture(request);
    return {...reportFixture(request),groups:reportGroups.filter(row=>request.metrics.includes(row.metricId))};
  }
  if (url.pathname === '/api/reporting/evidence') return {executionId:'fixture-vendor-2026-08-01',metricId:payload.metricId,rows:evidence.calls.map((row,index)=>({...row,commercial_stage:payload.metricId.replace('_value',''),currency:'ZAR',agreement_version:index%2?'agreement-v1':'agreement-v2'})),rowCount:evidence.calls.length,truncated:false};
  if (fixtures[endpoint]) return fixtures[endpoint];
  return {};
}

fs.mkdirSync(output, {recursive:true});
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const server=createServer((request,response)=>{
  const requestUrl=new URL(request.url,'http://localhost'),pathname=decodeURIComponent(requestUrl.pathname);
  if(pathname.startsWith('/api/')){
    const chunks=[];request.on('data',chunk=>chunks.push(chunk));request.on('end',()=>{
      let payload={};try{payload=chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{};}catch{}
      const data=apiData(requestUrl,payload);
      response.writeHead(200,{'content-type':'application/json','cache-control':'no-store','x-request-id':'00000000-0000-4000-8000-000000000001'});
      response.end(JSON.stringify({success:true,data,metadata:{clientId:'default_tenant',currency:'ZAR',validationStatus:'NOT_VERIFIED'}}));
    });return;
  }
  let file=path.resolve(dist,'.'+pathname);
  if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(dist,'index.html');
  response.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});
  fs.createReadStream(file).pipe(response);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
if(serveOnly){
  console.log(`PREVIEW_URL=${base}`);
  await new Promise(resolve=>{process.once('SIGINT',resolve);process.once('SIGTERM',resolve);});
  server.close();process.exit(0);
}
const results=[], failures=[];
let browser;
const check=(value,message,record)=>{record.checks.push({message,passed:!!value});if(!value)failures.push({route:record.route,width:record.width,message});};

async function inspectRoute(route,width,{failure=false,textZoom=false,repetition=1}={}) {
  const height=width<768?844:1000;
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  page.setDefaultTimeout(15000);
  const errors=[],warnings=[],requests=[];
  const record={route,width,height,repetition,scenario:failure?'api-failure':textZoom?'200%-text':'ready',checks:[]};
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='warning'||message.type()==='error')warnings.push({type:message.type(),text:message.text()});});
  await page.addInitScript(()=>{
    const supports=type=>typeof PerformanceObserver!=='undefined'&&PerformanceObserver.supportedEntryTypes.includes(type);
    window.__uxMetrics={lcp:supports('largest-contentful-paint')?0:null,cls:supports('layout-shift')?0:null,longTasks:supports('longtask')?[]:null};
    if(supports('largest-contentful-paint'))new PerformanceObserver(list=>{for(const entry of list.getEntries())window.__uxMetrics.lcp=entry.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
    if(supports('layout-shift'))new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.__uxMetrics.cls+=entry.value;}).observe({type:'layout-shift',buffered:true});
    if(supports('longtask'))new PerformanceObserver(list=>{for(const entry of list.getEntries())window.__uxMetrics.longTasks.push(entry.duration);}).observe({type:'longtask',buffered:true});
  });
  await page.route('**/api/**',async intercepted=>{
    const url=new URL(intercepted.request().url()),payload=intercepted.request().postDataJSON();
    requests.push(url.pathname);
    const fail=failure&&url.pathname!=='/api/analytics/clients';
    await intercepted.fulfill({status:fail?422:200,headers:{'x-request-id':'00000000-0000-4000-8000-000000000001'},contentType:'application/json',body:JSON.stringify(fail?{success:false,error:'Synthetic source is unavailable for the selected scope'}:{success:true,data:apiData(url,payload),metadata:{metric:url.searchParams.get('metric'),dimension:url.searchParams.get('dimension'),secondaryDimension:url.searchParams.get('secondaryDimension')||'',clientId:'default_tenant',currency:'ZAR',rateUnit:'percent',truncated:false,validationStatus:'NOT_VERIFIED'}})});
  });
  try{
    await page.goto(base+route+'?startDate=2026-08-01&endDate=2026-08-31');
    await page.waitForFunction(()=>Boolean(document.querySelector('main')?.textContent?.trim()));
    // The workspace gate intentionally mounts route chunks only after access is ready.
    // Shell text or an initial skeleton is not a meaningful route-ready signal.
    await page.getByRole('heading',{level:1}).first().waitFor({timeout:10000}).catch(()=>{});
    await page.waitForLoadState('networkidle');
    if(!failure&&route==='/reports'){
      await page.getByText('Available release: rfixture',{exact:true}).waitFor();
      await page.getByLabel('From (UTC)',{exact:true}).fill('2026-08-01');await page.getByLabel('Through (UTC)',{exact:true}).fill('2026-08-31');
    }
    else if(!failure&&route==='/explore')await page.getByRole('img',{name:'bar: Fetched Leads',exact:true}).waitFor();
    else if(!failure&&route==='/vetting')await page.getByText('Included leads: 8',{exact:true}).waitFor();
    else if(!failure&&route==='/visuals')await page.locator('[data-visual-surface="api.response"]').waitFor({state:'attached'});
    else if(!failure&&route==='/vendors')await page.getByRole('table',{name:'Vendor performance evidence',exact:true}).waitFor();
    else if(!failure&&route==='/exceptions')await page.getByRole('table',{name:'Operational exception rules',exact:true}).waitFor();
    else if(!failure&&route==='/reconciliation')await page.getByRole('table',{name:'Commercial reconciliation by vendor',exact:true}).waitFor();
    await page.waitForTimeout(250);
    if(textZoom){
      await page.evaluate(()=>{
        // Capture all sizes before mutation so nested fixed-pixel and inherited text
        // each double once. This is a font-resize simulation, not native browser zoom.
        const sizes=[...document.querySelectorAll('*')].filter(el=>el instanceof HTMLElement||el instanceof SVGElement).map(el=>({el,size:parseFloat(getComputedStyle(el).fontSize)}));
        for(const {el,size} of sizes)if(Number.isFinite(size))el.style.setProperty('font-size',`${size*2}px`,'important');
      });
      await page.waitForTimeout(250);
      record.textZoomMethod='Every existing HTML/SVG computed font size doubled once; not native browser text zoom';
    }
    record.title=await page.title();record.heading=await page.getByRole('heading',{level:1}).allTextContents();
    check(record.title==='ConversionX | Lead & Revenue Analytics','Page title',record);
    check(record.heading.length===1,'One page-level heading',record);
    check((await page.locator('main').innerText()).length>80,'Meaningful main content',record);
    check(await page.getByRole('heading',{name:'This page could not be displayed',exact:true}).count()===0,'No route error boundary',record);
    check(await page.locator('vite-error-overlay').count()===0,'No framework overlay',record);
    const layout=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,bodyHeight:document.body.scrollHeight,mainScrollHeight:document.querySelector('main')?.scrollHeight,mainClientHeight:document.querySelector('main')?.clientHeight,mainScrollWidth:document.querySelector('main')?.scrollWidth,mainClientWidth:document.querySelector('main')?.clientWidth,overflowing:[...document.querySelectorAll('main *')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left<0);}).slice(0,15).map(el=>({tag:el.tagName,className:el.className,text:el.textContent?.slice(0,70)}))}));
    record.layout=layout;
    record.accessibility=await page.evaluate(()=>{
      const visible=el=>{const rect=el.getBoundingClientRect();return rect.width>0&&rect.height>0;};
      const label=el=>el.getAttribute('aria-label')||(el.getAttribute('aria-labelledby')||'').split(' ').filter(Boolean).map(id=>document.getElementById(id)?.textContent||'').join(' ').trim()||Array.from(el.labels||[]).map(l=>l.textContent).join(' ').trim()||el.getAttribute('title')||((el.tagName==='BUTTON'||el.tagName==='A')?el.textContent?.trim():null);
      const controls=[...document.querySelectorAll('main button, main input:not([type="hidden"]), main select, main textarea')].filter(visible);
      return {heuristicOnly:true,unnamedControls:controls.filter(el=>!label(el)).map(el=>({tag:el.tagName,type:el.getAttribute('type'),className:el.className})),smallTargets:controls.filter(el=>{const r=el.getBoundingClientRect();return r.width<44||r.height<44;}).length,visibleControls:controls.length,firstChartTop:document.querySelector('main [role="img"]')?.getBoundingClientRect().top??null};
    });
    check(layout.documentWidth<=width+1,'No document horizontal overflow',record);
    check(layout.mainScrollWidth<=layout.mainClientWidth+1,'No whole-report horizontal overflow',record);
    check(!errors.length,'No uncaught runtime errors',record);
    check(!warnings.some(message=>!(failure&&message.type==='error'&&message.text.includes('Failed to load resource')&&message.text.includes('422'))),'No unexplained console warnings/errors',record);
    record.runtimeErrors=errors;record.consoleMessages=warnings;
    record.metrics=await page.evaluate(()=>({...window.__uxMetrics,domNodes:document.querySelectorAll('*').length,svgNodes:document.querySelectorAll('svg *').length,resources:performance.getEntriesByType('resource').filter(r=>/\.(js|css)(\?|$)/.test(r.name)).map(r=>({file:r.name.split('/').at(-1),duration:r.duration,bytes:r.decodedBodySize,transfer:r.transferSize})),navigation:performance.getEntriesByType('navigation').map(r=>({domContentLoaded:r.domContentLoadedEventEnd,load:r.loadEventEnd}))}));
    record.requests=Object.fromEntries([...new Set(requests)].map(p=>[p,requests.filter(r=>r===p).length]));
    const name=`${route.slice(1)}-${width}${failure?'-error':textZoom?'-text-zoom':''}`;
    if(core.includes(route)||[390,1440].includes(width)){
      record.screenshot=path.join(output,name+'.png');await page.screenshot({path:record.screenshot,fullPage:false});
    }
    if(checkOverviewAccessibility&&!failure&&!textZoom&&route==='/overview'){
      const measure=page.getByRole('combobox',{name:'Daily Capture-Cohort Performance measure',exact:true});
      check(record.accessibility.unnamedControls.length===0,'Overview visible controls have names in the limited DOM heuristic',record);
      check(await measure.count()===1,'Overview trend measure has the explicit accessible name',record);
      const original=await measure.inputValue();
      const alternate=await measure.locator('option').evaluateAll((options,value)=>options.find(option=>option.value!==value)?.value,original);
      await measure.selectOption(alternate);
      check(await measure.inputValue()===alternate,'Named trend measure selector changes the selected measure',record);
      await measure.scrollIntoViewIfNeeded();
      record.overviewMeasureScreenshot=path.join(output,`overview-measure-${width}.png`);
      await page.screenshot({path:record.overviewMeasureScreenshot});
      await measure.selectOption(original);
      record.overviewMeasure={name:await measure.getAttribute('aria-label'),original,alternate,restored:await measure.inputValue()};
    }
    if(!failure&&!textZoom&&route==='/explore'&&[390,1440].includes(width)){
      const builder=page.locator('details').filter({has:page.locator('summary').filter({hasText:'Query configuration'})});
      if(await builder.count()&&(await builder.getAttribute('open'))===null)await builder.locator('summary').click();
      const before=requests.filter(p=>p==='/api/analytics/explore').length;
      const started=performance.now();await page.getByLabel('Visualisation',{exact:true}).selectOption('table');
      const table=page.getByRole('table',{name:'Explorer results',exact:true});await table.waitFor();
      record.localTableSwitchMs=performance.now()-started;
      record.initialTableRows=await table.locator('tbody tr').count();
      check(record.initialTableRows===25,'1000 groups have bounded initial 25-row DOM',record);
      await page.getByLabel('Find Explore groups',{exact:true}).fill('Synthetic group 0010');await table.getByRole('rowheader',{name:'Synthetic group 0010',exact:true}).waitFor();
      check(requests.filter(p=>p==='/api/analytics/explore').length===before,'Local chart and search controls issue no query',record);
      await page.getByRole('button',{name:'Inspect Synthetic group 0010',exact:true}).click();
      const dialog=page.getByRole('dialog',{name:'Explore group details',exact:true});await dialog.waitFor();
      await page.keyboard.press('Tab');check(await dialog.evaluate(el=>el.contains(document.activeElement)),'Inspector contains keyboard focus',record);
      await page.screenshot({path:path.join(output,`explore-inspector-${width}.png`)});
      await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
      check(await page.getByRole('button',{name:'Inspect Synthetic group 0010',exact:true}).evaluate(el=>el===document.activeElement),'Inspector restores focus',record);
    }
    if(!failure&&!textZoom&&route==='/reports'&&[390,1440].includes(width)){
      await page.getByLabel('From (UTC)',{exact:true}).fill('2026-08-01');await page.getByLabel('Through (UTC)',{exact:true}).fill('2026-08-31');
      await page.getByRole('button',{name:'Create snapshot-bound report',exact:true}).click();
      await page.getByTestId('metric-call_attempts').waitFor();
      await page.getByRole('region',{name:'Report results',exact:true}).scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(output,`reports-results-${width}.png`)});
      record.breakdownRows=await page.getByRole('table',{name:'Report breakdown rows',exact:true}).locator('tbody tr').count();
      check(record.breakdownRows===25,'1000 report groups have bounded 25-row DOM',record);
    }
    if(!failure&&!textZoom&&route==='/vendors'&&[390,1440].includes(width)){
      const before=requests.filter(path=>path==='/api/reporting/reports').length;
      await page.getByPlaceholder('Search vendors',{exact:true}).fill('Northstar');
      const table=page.getByRole('table',{name:'Vendor performance evidence',exact:true});await table.getByRole('rowheader',{name:'Northstar Digital',exact:true}).waitFor();
      check(await table.locator('tbody tr').count()===1,'Vendor search bounds the local table',record);
      await page.getByLabel('Vendor chart controls').getByLabel('Measure').selectOption('collected_value');
      check(requests.filter(path=>path==='/api/reporting/reports').length===before,'Vendor presentation controls issue no warehouse request',record);
      await table.locator('tbody td button').first().click();await page.getByRole('complementary',{name:/Evidence for/}).waitFor();
      const evidenceExport=page.getByRole('button',{name:/Export all 5 scoped records/});await evidenceExport.waitFor();
      check(await evidenceExport.count()===1,'Vendor evidence inspector exposes complete scoped export',record);
      await page.screenshot({path:path.join(output,`vendors-evidence-${width}.png`)});
    }
    if(!failure&&!textZoom&&route==='/exceptions'&&[390,1440].includes(width)){
      await page.getByRole('tab',{name:/Needs configuration/}).click();
      await page.getByRole('button',{name:'Delivered but not dialled beyond SLA',exact:true}).click();
      check(await page.getByText(/Configure an approved delivery-to-first-dial SLA/).count()>0,'Exception rule explains missing configuration',record);
      await page.screenshot({path:path.join(output,`exceptions-config-${width}.png`)});
    }
    if(!failure&&!textZoom&&route==='/reconciliation'&&[390,1440].includes(width)){
      await page.getByRole('button',{name:/Collected Amount/}).first().click();
      await page.getByRole('complementary',{name:/Evidence for Collected Amount/}).waitFor();
      check(await page.getByText(/agreement version/i).count()>0,'Commercial evidence exposes agreement version',record);
      await page.screenshot({path:path.join(output,`reconciliation-evidence-${width}.png`)});
    }
    if(!failure&&!textZoom&&route==='/visuals'&&[390,1440].includes(width)){
      const visualSurface=page.locator('[data-visual-surface="api.response"]');
      await visualSurface.scrollIntoViewIfNeeded();
      await visualSurface.getByTestId('visual-view').waitFor();
      await visualSurface.getByRole('img').first().waitFor();
      check(await visualSurface.getByRole('img').count()>0,'Visual Workspace loads its deferred chart on inspection',record);
      await page.screenshot({path:path.join(output,`visuals-analysis-${width}.png`)});
      await page.getByRole('button',{name:'Search pages',exact:true}).click();
      const palette=page.getByRole('dialog',{name:'Quick navigation',exact:true});await palette.waitFor();
      await page.keyboard.press('Escape');await palette.waitFor({state:'hidden'});
      check(await page.getByRole('button',{name:'Search pages',exact:true}).evaluate(el=>el===document.activeElement),'Command palette restores focus',record);
      if(width<1024){await page.getByRole('button',{name:'Open navigation',exact:true}).click();const nav=page.getByRole('dialog',{name:'Navigation',exact:true});await nav.waitFor();for(let i=0;i<40;i++)await page.keyboard.press('Tab');check(await nav.evaluate(el=>el.contains(document.activeElement)),'Mobile navigation traps focus',record);await page.keyboard.press('Escape');check(await page.getByRole('button',{name:'Open navigation',exact:true}).evaluate(el=>el===document.activeElement),'Mobile navigation restores focus',record);}
    }
    if(failure&&requests.some(request=>request!=='/api/analytics/clients'))check((await page.getByRole('alert').count())>0,'Failed source has explicit alert',record);
  }catch(error){record.error=String(error);record.body=await page.locator('body').innerText().catch(()=>'Unavailable');record.runtimeErrors=errors;record.consoleMessages=warnings;record.requests=requests;failures.push({route,width,message:String(error)});await page.screenshot({path:path.join(output,`failure-${route.slice(1)}-${width}.png`)}).catch(()=>{});}
  finally{results.push(record);await page.close();}
}

try{
  browser=await ({chromium,firefox,webkit}[engine]).launch({headless:true});
  for(let repetition=1;repetition<=repeat;repetition++)for(const width of widths)for(const route of core)await inspectRoute(route,width,{repetition});
  if(!quick){for(const width of [390,1440])for(const route of routes.filter(r=>!core.includes(r)))await inspectRoute(route,width);for(const route of routes)await inspectRoute(route,390,{failure:true});for(const route of core)await inspectRoute(route,1440,{textZoom:true});}
}finally{
  if(browser)await browser.close();server.close();
  const summary={mode,engine,browserVersion:browser?.version(),sourceCommit,sourceDist,dist,output,conditions:{fixtures:'Synthetic fixed August 2026 scope. 1000 Explore/report groups; 8 vetting records; approved vendor, exception and commercial fixtures.',cache:'Fresh browser context per route; static server Cache-Control: no-store',network:'Local loopback, no throttling',motion:'prefers-reduced-motion: reduce',meaning:'Laboratory render/interaction observations, not field Core Web Vitals or production INP',runner:'Repository Playwright regression after interactive Browser integration inspection'},results,failures};
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify({mode,engine,pages:results.length,assertions:results.reduce((n,r)=>n+r.checks.length,0),failures,output},null,2));
}
if(failures.length)process.exitCode=1;
