// Rendered UI verification with synthetic API fixtures; never connects to live BigQuery.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const mediaMetrics=(i)=>[{id:'source_rows',label:'Media Source Rows',value:'1',status:'MEASURED'},
  {id:'impressions',label:'Reported Impressions',value:i===1?null:String(12000+i*1000),status:i===1?'UNAVAILABLE':'MEASURED'},
  {id:'clicks',label:'Reported Clicks',value:String(200+i*10),status:'MEASURED'}];
const trend=Array.from({length:45},(_,i)=>({date:`2026-08-${String(i%28+1).padStart(2,'0')}`,source:'Synthetic source',leads:String(10+i),saleRate:i===7?null:String(10+i/10),rpcRate:String(20+i/10),revenue:i===0?'9007199254740993.01':String(100+i)}));
const stats={leads:50,delivered:40,called:30,rpcs:20,sales:10,billableSales:8,activations:6,revenue:900,revPerLead:18,callRate:60,rpcRate:66.6,saleRate:33.3,leadToSaleRate:20,activationRate:60,billableSaleRate:80,deliveryRate:80};
const sources=[{source:'Synthetic A',...stats},{source:'Synthetic B',...stats}];
const sourceRoles=['leads','calls','timeToDial','activations','marketing'];
const fixtures={
  overview:{...stats,trend,sources,attentionItems:[]},timeseries:trend,funnel:[{stage:'Fetched Leads',count:50,rate:100},{stage:'Dialled Leads',count:30,rate:60}],
  calls:{calledLeads:30,totalCalls:50,avgCalls:1.66,oneCallRate:50,repeatCallRate:50,totalDurationHours:1,chart:[{bucket:'1 Call',current:10,rpc:50,sale:10,activation:5,revPerLead:10,totalRevenue:100}],hourly:[{label:'09:00',volume:30,rpcRate:60,saleRate:20,revenue:300}],dayOfWeek:[{day:'Monday',volume:30,rpcRate:60,saleRate:20,revenue:300}],vendors:[{vendor:'Synthetic Vendor',...stats}],dispositions:[{disposition:'Synthetic RPC',volume:30,rpcRate:60,saleRate:20,share:100,revenue:300}]},
  'speed-to-lead':{metrics:[{id:'capture_to_delivery',avg:'8m'},{id:'delivery_to_first_dial',avg:'20m'}],buckets:[{bucket:'0–5',leads:30,rpcCount:20,rpc:66.6,saleCount:10,sale:33.3,billableCount:8,billableRate:80,actCount:6,activation:60,revenue:900,revPerLead:30}]},
  cohorts:[{cohort:'2026-08',size:50,...stats,metrics:{d0:'1',d1:'3',d3:'5',d7:'10',d14:null,d30:null}}],sources,
  quality:{vetting:[],stats:{validRate:80,duplicateRate:20,deliveryRate:80,revenuePerLead:18},grades:[{grade:'Pass',count:40}],reasons:[{reason:'Recorded Pass',count:40,percentage:80}],fullFunnelSummary:stats,fullFunnelByGrade:[{grade:'A',...stats}]},
  'data-quality':{issues:[{issue:'Missing dial timestamp',severity:'Warning',affected:2,percentage:4,lastSeen:'2026-08-10'}],freshness:{}},
  'multi-vendor':[{vendor_count:2,leads:10,total_revenue:100}],
  validation:{overallStatus:'NOT_VERIFIED',metrics:[{metric:'Fetched Leads',status:'NOT_VERIFIED',discrepancy:'Synthetic fixture has not been reconciled.'}]},
  leads:[{lead_id:'synthetic-1',id:'synthetic-1',capture_timestamp:'2026-08-01',fetched:'2026-08-01',source:'Synthetic A',medium:'Paid',calls:2,revenue:15,status:'Called',quality:'Unknown'}],
  routing:{overview:{},depthBreakdown:[{depth_bucket:'2',leads:10,total_revenue:100}],partnerHandoff:[{partner:'Synthetic Vendor',routed_leads:10,handoff_leads:8}],topRoutePaths:[{route_path:'A -> B',leads:10,total_revenue:100}],missingSample:[]},
  consumers:{overview:{},tiers:[{lead_tier:'2 Leads',consumer_count:10,total_leads:20,total_revenue:100}],sequenceEconomics:[{sequence_bucket:'First Entry',leads:10,total_revenue:100}],repeatConsumersSample:[]},
  revetting:{comparison:[{is_revetted:false,leads:10,total_revenue:100},{is_revetted:true,leads:5,total_revenue:50}],vettingColorBreakdown:[{vetting:'A',is_revetted:false,leads:10,total_revenue:100}]},
  'data-trust':{vendorCapabilities:[{vendor:'Synthetic Vendor',total_transactions:10,status_delivery:'Partial',status_rpc:'Unknown',total_revenue:100}],timingAnomalies:{}},
  outcomes:{},'outcomes-quality':{summary:{total_leads:50,total_sales:10,billable_sales:8,unbilled_sales:2,total_revenue:900},fullFunnel:{},vendorStatusEconomics:[{vendor:'Synthetic Vendor',status_family:'Sale',transactions:10,sales:10,billable_sales:8,unbilled_sales:2,total_revenue:900}]},
};
export async function verifyVisualControls(browser,base){let checks=0;const visited=[];
  for(const viewport of[{width:1440,height:1000},{width:390,height:844}]){
    const page=await browser.newPage({viewport});const errors=[];let apiCalls=0,missing=false;
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/**',async route=>{
      const url=new URL(route.request().url()),endpoint=url.pathname.replace('/api/analytics/','');let data={},status=200;apiCalls++;
      if(endpoint==='clients')data=[{id:'default_tenant',name:'Synthetic Visual QA',currency:'ZAR',timezone:'UTC',capabilities:{}}];
      else if(endpoint==='filter-options')data={vendors:['Synthetic Vendor'],sources:['Synthetic A'],mediums:['Paid']};
      else if(endpoint==='acquisition'){
        if(missing){status=503;data={};}else data={metrics:mediaMetrics(0),groups:Array.from({length:40},(_,i)=>({group:'Synthetic Channel '+i,metrics:mediaMetrics(i)})),scope:{startDate:'2026-08-01',endDate:'2026-08-31'},dateBasis:'Media reporting date',financialReason:'Actual spend is not verified.',validationStatus:'NOT_VERIFIED',table:'synthetic.media',warning:'Synthetic values only.'};
      }else if(endpoint==='source-coverage')data={inventoryComplete:true,sources:sourceRoles.map(role=>({role,label:role,table:'synthetic.'+role,status:'SCHEMA_PRESENT',rowCount:'100',api:'/api/analytics/source-metrics/'+role,legacyConsumers:[role]})),unmappedTables:[],metricLineage:{versioned:[{metricId:'fetched_leads',label:'Fetched Leads',requiredFacts:['leads'],api:'/api/reporting/reports'}]}};
      else if(endpoint.startsWith('source-metrics/'))data={role:endpoint.split('/').at(-1),metrics:[{id:'source_rows',label:'Selected Source Rows',value:'100',status:'MEASURED',validRows:'100',missingRows:'0',invalidRows:'0'}],scope:{},dateBasis:'Source-specific date'};
      else if(fixtures[endpoint])data=fixtures[endpoint];
      else if(endpoint==='insights'||endpoint==='drivers')data=[{segment:'Synthetic A',current:10,previous:7,change:3,pctChange:42.8}];
      await route.fulfill({status,contentType:'application/json',body:JSON.stringify(status===200?{success:true,data,metadata:{validationStatus:'NOT_VERIFIED'}}:{success:false,error:'Source unavailable; no chart values substituted.'})});
    });
    try{
      await page.goto(base+'/acquisition');const surface=page.locator('[data-visual-surface="media.groups"]');await surface.scrollIntoViewIfNeeded();
      await surface.getByLabel('Dataset to visualise',{exact:true}).selectOption('media.groups:impressions');checks++;
      const chart=surface.getByTestId('visual-view');await chart.getByLabel('Chart type',{exact:true}).waitFor();
      assert.match(await chart.innerText(),/missing or invalid values remain gaps/);checks++;
      const countBefore=apiCalls;
      for(const kind of ['column','heatmap','bar']){await chart.getByLabel('Chart type',{exact:true}).selectOption(kind);if(kind==='heatmap')await chart.getByRole('list',{name:'Heatmap points'}).waitFor();else await chart.getByRole('img',{name:new RegExp(kind+' chart')}).waitFor();checks++;}
      // Check the native option rather than the enclosing label's enabled select control.
      assert.equal(await chart.getByLabel('Chart type',{exact:true}).locator('option[value="line"]').evaluate(option=>option.disabled),true);checks++;
      await chart.getByRole('button',{name:'Adjust chart',exact:true}).click();
      await chart.getByLabel('Chart point limit',{exact:true}).selectOption('10');
      await chart.getByRole('button',{name:'Next chart points',exact:true}).click();await chart.getByText(/Showing 11–20 of 40/).waitFor();checks++;
      await chart.getByRole('button',{name:'Previous chart points',exact:true}).click();await chart.getByText(/Showing 1–10 of 40/).waitFor();checks++;
      await chart.getByLabel('Search chart labels',{exact:true}).fill('Channel 39');await chart.getByText(/Showing 1–1 of 1/).waitFor();checks++;
      const downloadPromise=page.waitForEvent('download');await chart.getByRole('button',{name:'Exact displayed CSV',exact:true}).click();const download=await downloadPromise;
      const csv=fs.readFileSync(await download.path(),'utf8');assert.match(csv,/51000/);assert.match(csv,/Synthetic Channel 39/);assert.doesNotMatch(csv,/Synthetic Channel 0/);checks++;
      await chart.getByRole('button',{name:'Reset chart',exact:true}).click();await chart.getByText(/Showing 1–25 of 40/).waitFor();checks++;
      await chart.getByLabel('Plot mode',{exact:true}).selectOption('records');await chart.getByLabel('Chart type',{exact:true}).selectOption('donut');
      await chart.getByRole('img',{name:/donut chart/}).waitFor();assert.match(await chart.innerText(),/Counts describe returned records/);checks++;
      assert.equal(apiCalls,countBefore,'local visual controls do not query another population');checks++;
      const block=page.locator('[data-visual-table="media.groups"]');await block.getByRole('button',{name:'Table only',exact:true}).click();await block.locator('[data-testid="visual-view"]').waitFor({state:'detached'});assert.equal(await block.locator('[data-testid="visual-view"]').count(),0);checks++;
      await block.getByRole('button',{name:'Chart only',exact:true}).click();await block.locator('.cx-original-table').waitFor({state:'hidden'});assert.equal(await block.getByRole('table',{name:'Media channel metrics'}).count(),0);checks++;
      await block.getByRole('button',{name:'Chart + table',exact:true}).click();await block.getByRole('table',{name:'Media channel metrics'}).waitFor();checks++;
      missing=true;await page.reload();await page.getByRole('alert').getByText(/Source unavailable/).waitFor();assert.equal(await page.getByTestId('visual-view').count(),0);checks++;
      missing=false;
      await page.goto(base+'/visuals');await page.getByLabel('Visual report source',{exact:true}).waitFor();const hub=page.locator('[data-visual-surface="api.response"]');await hub.scrollIntoViewIfNeeded();
      await hub.getByLabel('Dataset to visualise',{exact:true}).selectOption('overview.trend');let plot=hub.getByTestId('visual-view');
      await plot.getByLabel('Chart measure',{exact:true}).selectOption('saleRate');await plot.getByLabel('Chart type',{exact:true}).selectOption('line');
      await plot.getByRole('img',{name:/line chart/}).waitFor();checks++;
      await plot.getByLabel('Chart type',{exact:true}).selectOption('area');await plot.getByRole('img',{name:/area chart/}).waitFor();checks++;
      await plot.getByRole('button',{name:'Adjust chart',exact:true}).click();await plot.getByLabel('Compare series',{exact:true}).selectOption('rpcRate');
      await plot.getByLabel('Chart type',{exact:true}).selectOption('scatter');await plot.getByRole('img',{name:/scatter chart/}).waitFor();checks++;
      await plot.getByLabel('Chart type',{exact:true}).selectOption('column');await plot.getByLabel('Chart measure',{exact:true}).selectOption('revenue');
      await plot.getByRole('button',{name:'Reset chart',exact:true}).click();await plot.getByLabel('Chart measure',{exact:true}).selectOption('revenue');
      await plot.getByText(/Plot positions use approximate/).waitFor();checks++;
      await plot.getByText(/Inspect exact plotted values/).click();await plot.getByRole('button',{name:/9,007,199,254,740,993.01/}).click();await plot.getByLabel('Selected chart point',{exact:true}).getByText(/9,007,199,254,740,993.01/).waitFor();checks++;
      await page.screenshot({path:`verification/visual-workspace-${viewport.width}.png`,fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
      // Each configured physical source has a selectable chart-backed response.
      for(const role of sourceRoles){await page.getByLabel('Visual report source',{exact:true}).selectOption('source-metrics/'+role);await page.getByTestId('visual-view').getByRole('heading',{name:'Selected Source Rows',exact:true}).waitFor();checks++;}
      // Every live table page is exercised with its own API fixture. Unrouted historical models are compile-only.
      const pages=[['/sources','sources.performance'],['/cohorts','cohorts.maturity'],['/quality','quality.grades'],['/validation','validation.checks'],['/data-quality','quality.issues'],['/call-performance','calls.bands'],['/speed-to-lead','speed.bands'],['/routing','routing.depth'],['/consumers','consumers.tiers'],['/revetting','revetting.comparison'],['/data-trust','trust.capabilities'],['/outcomes','outcomes.status'],['/explorer','records.leads']];
      for(const [route,id] of pages){await page.goto(base+route);const panel=page.locator(`[data-visual-surface="${id}"]`).first();await panel.scrollIntoViewIfNeeded();await panel.getByLabel('Chart type',{exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'This page could not be displayed'}).count(),0);checks++;visited.push(route);}
      await page.goto(base+'/data-coverage');const coverage=page.locator('[data-visual-surface="sources.coverage"]');await coverage.scrollIntoViewIfNeeded();await coverage.getByLabel('Plot mode',{exact:true}).selectOption('records');await coverage.getByLabel('Chart dimension',{exact:true}).selectOption('status');await coverage.getByLabel('Chart type',{exact:true}).selectOption('donut');await coverage.getByRole('img',{name:/donut chart/}).waitFor();checks++;
      await page.screenshot({path:`verification/visual-source-coverage-${viewport.width}.png`,fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
      assert.deepEqual(errors,[]);checks++;
    }catch(e){await page.screenshot({path:`verification/visual-failure-${viewport.width}.png`,fullPage:true});fs.writeFileSync(`verification/visual-failure-${viewport.width}.json`,JSON.stringify({error:String(e),stack:e.stack,url:page.url(),errors,controls:await page.locator('select').evaluateAll(items=>items.map(el=>({label:el.getAttribute('aria-label'),value:el.value,options:Array.from(el.options).map(o=>({value:o.value,disabled:o.disabled}))}))),body:await page.locator('body').innerText()},null,2));throw e;}
    finally{await page.close();}
  }
  fs.writeFileSync('verification/visual-controls.json',JSON.stringify({checks,routes:[...new Set(visited)],viewports:['1440x1000','390x844'],fixture:'synthetic API data; no live warehouse queries'},null,2));return checks;
}
