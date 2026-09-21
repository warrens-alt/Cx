// UI contract checks use synthetic API responses, not a real warehouse query.
import assert from 'node:assert/strict';
import fs from 'node:fs';
function rowsFor(url){
  const metric=url.searchParams.get('metric'),dimension=url.searchParams.get('dimension'),secondary=url.searchParams.get('secondaryDimension');
  const ratio=metric.endsWith('_rate')||metric==='call_coverage';
  if(dimension==='date')return Array.from({length:20},(_,i)=>({dim1:`2026-08-${String(Math.floor(i/(secondary?2:1))+1).padStart(2,'0')}`,...(secondary?{dim2:i%2?'Organic':'Paid Search'}:{}),value:ratio?12.5:i+1,sampleSize:40,fullFunnel:{leads:40,called:20,sales:5}}));
  return Array.from({length:80},(_,i)=>({dim1:`Group ${String(i+1).padStart(2,'0')}`,...(secondary?{dim2:i%2?'Class A':'Class B'}:{}),value:ratio?(i===1?null:12.5):i===0?'9007199254740993':i===1?'9007199254740992':String(80-i),sampleSize:i===3?null:100-i,fullFunnel:{leads:100-i,called:50,sales:4,revenue:'0.01'}}));
}
export async function verifyExploreWorkspace(browser,base){
  let checks=0;
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    const page=await browser.newPage({viewport});let fail=false,malformed=false,slow=false,requests=0;const errors=[],urls=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/**',async route=>{
      const url=new URL(route.request().url());let data={};
      if(url.pathname==='/api/analytics/clients')data=[{id:'default_tenant',name:'Explore fixture',currency:'ZAR',timezone:'UTC',capabilities:{}}];
      else if(url.pathname==='/api/analytics/explore'){
        requests++;urls.push(url);
        if(slow)await new Promise(r=>setTimeout(r,700));
        if(fail)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,error:'Synthetic Explore service unavailable'})});
        if(malformed)return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{}})});
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:rowsFor(url),metadata:{metric:url.searchParams.get('metric'),dimension:url.searchParams.get('dimension'),secondaryDimension:url.searchParams.get('secondaryDimension')||'',clientId:'default_tenant',currency:'ZAR',rateUnit:'percent',durationMs:8,truncated:false,validationStatus:'NOT_VERIFIED'}})});
      }
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});
    });
    const table=()=>page.getByRole('table',{name:'Explorer results',exact:true});
    async function download(button){const[file]=await Promise.all([page.waitForEvent('download'),button.click()]);let text='';for await(const c of await file.createReadStream())text+=c;return text;}
    try{
      await page.goto(base+'/explore?startDate=2026-08-01&endDate=2026-08-31');
      await page.getByRole('img',{name:'bar: Fetched Leads',exact:true}).waitFor();checks++;
      assert.equal(await page.getByRole('heading',{level:1}).textContent(),'Data Explorer');checks++;
      assert.equal(await page.title(),'ConversionX | Lead & Revenue Analytics');checks++;
      assert.equal(await page.locator('vite-error-overlay').count(),0);checks++;
      assert.equal(urls.at(-1).searchParams.get('clientId'),'default_tenant');checks++;
      const beforeView=requests;
      await page.getByLabel('Visualisation',{exact:true}).selectOption('table');await table().waitFor();
      assert.equal(await table().locator('tbody tr').count(),25);checks++;
      assert.equal(requests,beforeView,'Changing chart mode reuses the loaded result');checks++;
      assert.equal(await table().locator('tbody tr').first().getByRole('rowheader').textContent(),'Group 01');checks++;
      assert.ok((await table().locator('tbody tr').first().textContent()).includes('9,007,199,254,740,993'));checks++;
      await page.getByRole('button',{name:'Next page',exact:true}).click();assert.equal(await table().locator('tbody tr').first().getByRole('rowheader').textContent(),'Group 26');checks++;
      await page.getByLabel('Explore rows per page',{exact:true}).selectOption('10');assert.equal(await table().locator('tbody tr').count(),10);checks++;
      await page.getByLabel('Find Explore groups',{exact:true}).fill('Group 03');await table().getByRole('rowheader',{name:'Group 03',exact:true}).waitFor();
      assert.equal(await table().locator('tbody tr').count(),1);checks++;
      const all=await download(page.getByRole('button',{name:'Export loaded CSV',exact:true}));assert.ok(all.includes('Group 80'));assert.ok(all.includes('9007199254740993'));checks+=2;
      const matching=await download(page.getByRole('button',{name:'Export matching CSV',exact:true}));assert.ok(matching.includes('Group 03'));assert.ok(!matching.includes('Group 80'));checks+=2;
      assert.equal(requests,beforeView,'Local search, paging and exports issue no analytical query');checks++;
      await page.getByRole('button',{name:'Inspect Group 03',exact:true}).click();await page.getByRole('dialog',{name:'Explore group details',exact:true}).waitFor();checks++;
      await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'Explore group details',exact:true}).waitFor({state:'hidden'});checks++;
      await page.getByLabel('Minimum reported sample',{exact:true}).fill('999');await page.getByRole('heading',{name:'No matching groups',exact:true}).waitFor();checks++;
      await page.getByRole('button',{name:'Clear local filters',exact:true}).click();await table().getByRole('rowheader',{name:'Group 01',exact:true}).waitFor();checks++;
      await page.getByLabel('Measure',{exact:true}).selectOption('sale_rate');await table().getByRole('columnheader',{name:'Sales / Dialled Leads (%)',exact:true}).waitFor();
      assert.equal(await page.getByText('Not additive',{exact:true}).count(),1);checks++;
      assert.ok((await table().locator('tbody').textContent()).includes('12.5%'));checks++;
      assert.equal(await page.getByText('1,250%',{exact:true}).count(),0);checks++;
      assert.equal(await page.getByLabel('Visualisation',{exact:true}).locator('option[value="donut"]').isDisabled(),true);checks++;
      assert.equal(await page.getByLabel('Visualisation',{exact:true}).locator('option[value="line"]').isDisabled(),true);checks++;
      await page.getByLabel('Find Explore groups',{exact:true}).fill('Group 02');await table().getByRole('cell',{name:'Unavailable',exact:true}).waitFor();checks++;
      await page.screenshot({path:`verification/explore-unavailable-${viewport.width}.png`,fullPage:true});
      await page.getByRole('button',{name:/Capture trend Daily lead volume by source/}).click();await page.getByRole('img',{name:'line: Fetched Leads',exact:true}).waitFor();checks++;
      assert.equal(urls.at(-1).searchParams.get('secondaryDimension'),'source');checks++;
      assert.equal(await page.getByRole('checkbox').count(),2);checks++;
      const beforeSeries=requests;await page.getByRole('checkbox',{name:'Organic',exact:true}).uncheck();assert.equal(requests,beforeSeries);checks++;
      await page.getByLabel('Explore chart point limit',{exact:true}).selectOption('10');assert.equal(requests,beforeSeries);checks++;
      await page.getByLabel('Visualisation',{exact:true}).selectOption('area');await page.getByRole('img',{name:'area: Fetched Leads',exact:true}).waitFor();checks++;
      await page.reload();await page.getByRole('img',{name:'area: Fetched Leads',exact:true}).waitFor();assert.equal(await page.getByLabel('Second dimension',{exact:true}).inputValue(),'source');checks++;
      await page.screenshot({path:`verification/explore-trends-${viewport.width}.png`,fullPage:true});
      await page.getByRole('button',{name:/Lead supply Where lead volume comes from/}).click();await page.getByRole('img',{name:'bar: Fetched Leads',exact:true}).waitFor();
      await page.getByLabel('Visualisation',{exact:true}).selectOption('donut');await page.getByRole('img',{name:'donut: Fetched Leads',exact:true}).waitFor();checks++;
      await page.getByLabel('Visualisation',{exact:true}).selectOption('bar');
      slow=true;await page.getByLabel('Measure',{exact:true}).selectOption('sales');await page.getByLabel('Loading Explore results',{exact:true}).waitFor();
      assert.equal(await page.getByRole('button',{name:'Export loaded CSV',exact:true}).count(),0);checks++;
      await page.getByLabel('Measure',{exact:true}).selectOption('activations');await page.getByRole('img',{name:'bar: Leads with Activations',exact:true}).waitFor();assert.equal(urls.at(-1).searchParams.get('metric'),'activations');checks++;
      await page.getByRole('button',{name:'Run Query',exact:true}).click();await page.getByRole('button',{name:'Cancel request',exact:true}).click();await page.getByRole('heading',{name:'Explore request cancelled',exact:true}).waitFor();checks++;
      assert.equal(await page.getByRole('button',{name:'Export loaded CSV',exact:true}).count(),0);checks++;
      slow=false;await page.getByRole('button',{name:'Run Query',exact:true}).first().click();await page.getByRole('img',{name:'bar: Leads with Activations',exact:true}).waitFor();checks++;
      fail=true;await page.getByRole('button',{name:'Run Query',exact:true}).click();await page.getByRole('alert').getByText('Synthetic Explore service unavailable',{exact:true}).waitFor();checks++;
      assert.equal(await page.getByRole('button',{name:'Export loaded CSV',exact:true}).count(),0);checks++;
      fail=false;await page.getByRole('button',{name:'Retry Explore request',exact:true}).click();await page.getByRole('img',{name:'bar: Leads with Activations',exact:true}).waitFor();checks++;
      malformed=true;await page.getByRole('button',{name:'Run Query',exact:true}).click();await page.getByRole('alert').getByText(/missing its result rows/).waitFor();checks++;
      malformed=false;
      const beforeBad=requests;await page.goto(base+'/explore?exMetric=leads&exMetric=sales');await page.getByRole('alert').getByText(/Repeated Explore parameter/).waitFor();assert.equal(requests,beforeBad);checks++;
      await page.getByRole('button',{name:'Reset Explore view',exact:true}).click();await page.getByRole('img',{name:'bar: Fetched Leads',exact:true}).waitFor();checks++;
      const beforeScope=requests;await page.goto(base+'/explore?filters=invalid');await page.getByRole('button',{name:'Reset reporting scope',exact:true}).waitFor();assert.equal(requests,beforeScope);checks++;
      await page.getByRole('button',{name:'Reset reporting scope',exact:true}).click();await page.getByRole('img',{name:'bar: Fetched Leads',exact:true}).waitFor();checks++;
      await page.screenshot({path:`verification/explore-overview-${viewport.width}.png`,fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Explore must fit the viewport');checks++;
      assert.deepEqual(errors,[]);checks++;
    }catch(error){fs.mkdirSync('verification',{recursive:true});await page.screenshot({path:`verification/explore-failure-${viewport.width}.png`,fullPage:true});fs.writeFileSync(`verification/explore-failure-${viewport.width}.json`,JSON.stringify({message:String(error),stack:error.stack,url:page.url(),requests,urls:urls.map(u=>u.toString()),errors,checks,body:await page.locator('body').innerText()},null,2));throw error;}
    finally{await page.close();}
  }
  fs.writeFileSync('verification/explore-browser.json',JSON.stringify({checks,passed:checks,source:'synthetic API fixtures',liveWarehouseTested:false},null,2));return checks;
}
