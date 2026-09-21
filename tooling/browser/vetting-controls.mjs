// Handwritten source observations for UI interactions, not executed warehouse results.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const classMissing='[No class recorded]',colourMissing='[No colour result]',unmapped='[Result without recognised colour]';
const records=[
  {class:'A',colour:'Green',raw:'Green, confirmed',date:'2026-08-01',source:'Paid Search',vendor:'Vendor A',delivered:1,called:1,rpc:1,sales:1,activations:1},
  {class:'A',colour:'Blue',raw:'Blue',date:'2026-08-02',source:'Paid Search',vendor:'Vendor A',delivered:1,called:1,rpc:1,sales:0,activations:0},
  {class:'A',colour:'Green',raw:'Green',date:'2026-08-03',source:'Organic',vendor:'Vendor B',delivered:1,called:1,rpc:0,sales:0,activations:0},
  {class:'B',colour:'Orange',raw:'Orange',date:'2026-08-01',source:'Organic',vendor:'Vendor B',delivered:1,called:0,rpc:0,sales:0,activations:0},
  {class:'B',colour:'Blue',raw:'Blue',date:'2026-08-02',source:'Paid Search',vendor:'Vendor A',delivered:1,called:1,rpc:1,sales:1,activations:0},
  {class:'C',colour:'Charcoal',raw:'Charcoal',date:'2026-08-03',source:'Partner',vendor:'Vendor B',delivered:0,called:0,rpc:0,sales:0,activations:0},
  {class:'U',colour:unmapped,raw:'Contract failed vetting',date:'2026-08-04',source:'Partner',vendor:'Vendor A',delivered:0,called:0,rpc:0,sales:0,activations:0},
  {class:classMissing,colour:colourMissing,raw:'',date:'2026-08-04',source:'Organic',vendor:'Vendor B',delivered:0,called:0,rpc:0,sales:0,activations:0},
];
const keys=['leads','classRecorded','recognisedClass','colourRecorded','namedColour','bothRecorded','withHlc','valid','invalid','unknownValidity','delivered','called','rpc','sales','activations','classTimed','colourTimed','classBeforeCapture','colourBeforeCapture','classInvalidTime','colourInvalidTime','classFutureTime','colourFutureTime'];
function aggregate(rows){
  const value=Object.fromEntries(keys.map(k=>[k,'0']));value.leads=String(rows.length);
  value.classRecorded=String(rows.filter(r=>r.class!==classMissing).length);value.recognisedClass=value.classRecorded;
  value.colourRecorded=String(rows.filter(r=>r.colour!==colourMissing).length);value.namedColour=String(rows.filter(r=>!r.colour.startsWith('[')).length);value.bothRecorded=value.namedColour;
  for(const key of ['delivered','called','rpc','sales','activations'])value[key]=String(rows.reduce((n,r)=>n+r[key],0));
  value.withHlc=String(rows.length);value.valid=String(rows.length);value.classTimed=value.classRecorded;value.colourTimed=value.namedColour;
  return {...value,classMeanSeconds:rows.length?'120':null,colourMeanSeconds:rows.length?'180':null};
}
function fixture(url){
  const selected=records.filter(r=>(!url.searchParams.get('classValue')||r.class===url.searchParams.get('classValue'))&&(!url.searchParams.get('colourValue')||r.colour===url.searchParams.get('colourValue')));
  const prior=selected.filter(r=>records.indexOf(r)<4),groups=[];
  const interval=url.searchParams.get('interval')||'day';
  const periodKey=r=>interval==='month'?'2026-08-01':interval==='week'?'2026-07-27':r.date;
  const definitions={class:r=>[r.class,''],colour:r=>[r.colour,''],matrix:r=>[r.class,r.colour],sourceClass:r=>[r.source,r.class],sourceColour:r=>[r.source,r.colour],vendorClass:r=>[r.vendor,r.class],vendorColour:r=>[r.vendor,r.colour],rawClass:r=>[r.class,r.class],rawColour:r=>[r.raw||colourMissing,r.colour],trend:r=>[periodKey(r),''],trendClass:r=>[periodKey(r),r.class],trendColour:r=>[periodKey(r),r.colour]};
  for(const[period,rows]of [['current',selected],['previous',prior]])for(const[section,group]of Object.entries(definitions)){
    const map=new Map();for(const r of rows){const [key,series]=group(r),id=JSON.stringify([key,series]);const item=map.get(id)||{key,series,items:[]};item.items.push(r);map.set(id,item);}
    for(const {key,series,items}of map.values())groups.push({...aggregate(items),period,section,key,series});
  }
  const fieldNames={leadClass:'offershop_grade',leadColour:'offershop_color_vetting',leadClassDate:'offershop_grade_date',leadColourDate:'offershop_color_vetting_date','hlc.sale':'hlc_details.sale'};
  return {current:aggregate(selected),previous:aggregate(prior),groups,fields:Object.fromEntries(Object.entries(fieldNames).map(([k,sourceField])=>[k,{sourceField,available:true}])),
    diagnostics:[{period:'current',sourceRows:'10',missingIdRows:'1',conflictingLeads:'0',conflictingRows:'0',duplicateRowsCollapsed:'1',eligibleUniqueLeads:'8'},{period:'previous',sourceRows:'4',missingIdRows:'0',conflictingLeads:'0',conflictingRows:'0',duplicateRowsCollapsed:'0',eligibleUniqueLeads:'4'}],
    timing:[{kind:'Class',sample:'7',meanSeconds:'120',medianSeconds:'90',p90Seconds:'210'},{kind:'Colour',sample:'6',meanSeconds:'180',medianSeconds:'120',p90Seconds:'360'}],
    scope:{clientId:'default_tenant',startDate:'2026-08-01',endDate:'2026-08-31',previousStart:'2026-07-01',previousEnd:'2026-07-31',days:31,interval,classValue:url.searchParams.get('classValue')||null,colourValue:url.searchParams.get('colourValue')||null,filters:{}},
    evidence:{version:'cx.vetting.1.0.0',table:'fixture.ledger.leads',jobId:'fixture-vetting-query',referencedTables:['fixture.ledger.leads'],bytesProcessed:'100',generatedAt:'2026-09-21T10:00:00Z',snapshotPinned:false,validationStatus:'SOURCE_QUERY_NOT_INDEPENDENTLY_RECONCILED'},
    notes:['Synthetic browser records only. Outcomes use selected HLC source evidence, not live warehouse reconciliation.']};
}
export async function verifyVettingControls(browser,base){
  let checks=0;
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    const page=await browser.newPage({viewport});let fail=false,slow=false;const errors=[];let lastUrl;
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/**',async route=>{
      const url=new URL(route.request().url());let data={};
      if(url.pathname==='/api/analytics/clients')data=[{id:'default_tenant',name:'Vetting fixture',currency:'ZAR',timezone:'UTC',capabilities:{}}];
      else if(url.pathname==='/api/analytics/vetting'){
        lastUrl=url;
        if(slow)await new Promise(r=>setTimeout(r,500));
        if(fail)return route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({success:false,error:'Fixture: class source unavailable'})});
        data=fixture(url);
      }
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});
    });
    try{
      await page.goto(base+'/vetting?startDate=2026-08-01&endDate=2026-08-31');
      await page.getByText('Included leads: 8',{exact:true}).waitFor();checks++;
      assert.equal(await page.getByRole('heading',{level:1}).textContent(),'Vetting');checks++;
      assert.equal(await page.title(),'ConversionX | Lead & Revenue Analytics');checks++;
      assert.equal(await page.locator('vite-error-overlay').count(),0);checks++;
      await page.getByRole('img',{name:'pie: Class lead distribution',exact:true}).waitFor();checks++;
      await page.getByRole('img',{name:'donut: Colour lead distribution',exact:true}).waitFor();checks++;
      await page.getByLabel('Class lead distribution chart type',{exact:true}).selectOption('bar');await page.getByRole('img',{name:'bar: Class lead distribution',exact:true}).waitFor();checks++;
      await page.getByLabel('Class lead distribution chart type',{exact:true}).selectOption('pie');
      await page.screenshot({path:`verification/vetting-overview-${viewport.width}.png`,fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Vetting fits the viewport');checks++;
      await page.getByRole('tab',{name:'Class Leads',exact:true}).click();await page.getByRole('img',{name:'column: Class mix: current vs previous',exact:true}).waitFor();checks++;
      await page.getByLabel('Class result',{exact:true}).selectOption('A');await page.getByText('Included leads: 3',{exact:true}).waitFor();checks++;
      assert.equal(lastUrl.searchParams.get('classValue'),'A');checks++;
      await page.getByLabel('Vetting comparison measure',{exact:true}).selectOption('saleShare');await page.getByRole('region',{name:'Downstream evidence by classification',exact:true}).getByText(/Sale-Evidenced \/ Included Leads/).first().waitFor();checks++;
      await page.getByLabel('Class result',{exact:true}).selectOption('');await page.getByText('Included leads: 8',{exact:true}).waitFor();
      await page.getByRole('tab',{name:'Colour Leads',exact:true}).click();await page.getByLabel('Colour result',{exact:true}).selectOption('Green');await page.getByText('Included leads: 2',{exact:true}).waitFor();checks++;
      assert.equal(lastUrl.searchParams.get('colourValue'),'Green');checks++;
      await page.getByLabel('Class result',{exact:true}).selectOption('B');await page.getByText('Included leads: 0',{exact:true}).waitFor();checks++;
      await page.getByRole('button',{name:'Clear class and colour',exact:true}).click();await page.getByText('Included leads: 8',{exact:true}).waitFor();checks++;
      await page.getByLabel('Vetting comparison measure',{exact:true}).selectOption('leads');
      await page.getByRole('tab',{name:'Class × Colour',exact:true}).click();await page.getByRole('grid',{name:'Class by colour heatmap',exact:true}).waitFor();checks++;
      await page.getByRole('gridcell',{name:'Class A, colour Green: 2',exact:true}).click();await page.getByText('Included leads: 2',{exact:true}).waitFor();checks++;
      assert.equal(await page.getByLabel('Class result',{exact:true}).inputValue(),'A');assert.equal(await page.getByLabel('Colour result',{exact:true}).inputValue(),'Green');checks+=2;
      await page.getByRole('button',{name:'Clear class and colour',exact:true}).click();await page.getByText('Included leads: 8',{exact:true}).waitFor();
      await page.screenshot({path:`verification/vetting-matrix-${viewport.width}.png`,fullPage:true});
      await page.getByRole('tab',{name:'Sources & Vendors',exact:true}).click();await page.getByLabel('Vetting segment dimension',{exact:true}).selectOption('vendor');await page.getByText(/Vendor totals must not be summed/).waitFor();checks++;
      await page.getByRole('tab',{name:'Timing & Coverage',exact:true}).click();await page.getByRole('img',{name:'column: Capture-to-vetting delay',exact:true}).waitFor();checks++;
      await page.getByText('Raw colour-vetting results — full scorecard (7 groups)',{exact:true}).click();await page.getByRole('rowheader',{name:'Contract failed vetting',exact:true}).waitFor();checks++;
      await page.getByRole('tab',{name:'Overview',exact:true}).click();
      await page.getByLabel('Vetting trend interval',{exact:true}).selectOption('week');await page.getByText('Included leads: 8',{exact:true}).waitFor();assert.equal(lastUrl.searchParams.get('interval'),'week');checks++;
      const [file]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export complete analysis',exact:true}).click()]);
      const stream=await file.createReadStream();let body='';for await(const chunk of stream)body+=chunk;const exported=JSON.parse(body);assert.equal(exported.current.leads,'8');assert.equal(exported.scope.interval,'week');assert.equal(exported.evidence.jobId,'fixture-vetting-query');checks+=3;
      slow=true;await page.getByLabel('Class result',{exact:true}).selectOption('A');await page.getByRole('region',{name:'Class lead distribution',exact:true}).waitFor({state:'hidden'});checks++;await page.getByText('Included leads: 3',{exact:true}).waitFor();slow=false;
      fail=true;await page.getByLabel('Class result',{exact:true}).selectOption('B');await page.getByRole('alert').getByText('Fixture: class source unavailable',{exact:true}).waitFor();checks++;
      assert.equal(await page.getByRole('button',{name:'Export complete analysis',exact:true}).isDisabled(),true);checks++;
      fail=false;await page.getByRole('button',{name:'Retry request',exact:true}).click();await page.getByText('Included leads: 2',{exact:true}).waitFor();checks++;
      await page.getByRole('button',{name:'Clear class and colour',exact:true}).click();await page.getByText('Included leads: 8',{exact:true}).waitFor();
      await page.getByRole('tab',{name:'Overview',exact:true}).focus();await page.keyboard.press('ArrowRight');assert.equal(await page.getByRole('tab',{name:'Class Leads',exact:true}).getAttribute('aria-selected'),'true');checks++;
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No document overflow after interactions');checks++;
      assert.deepEqual(errors,[]);checks++;
    }catch(e){await page.screenshot({path:`verification/vetting-failure-${viewport.width}.png`,fullPage:true});fs.writeFileSync(`verification/vetting-failure-${viewport.width}.json`,JSON.stringify({message:String(e),stack:e.stack,url:page.url(),checks,errors,body:await page.locator('body').innerText()},null,2));throw e;}
    finally{await page.close();}
  }
  fs.writeFileSync('verification/vetting-browser.json',JSON.stringify({checks,passed:checks,source:'synthetic API data',liveWarehouseTested:false},null,2));return checks;
}
