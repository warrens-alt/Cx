// Synthetic, intercepted browser evidence for the shared chart/table system.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const trend=Array.from({length:1000},(_,i)=>({date:`2026-08-${String(i%31+1).padStart(2,'0')}`,source:`Fixture ${String(i).padStart(4,'0')}`,leads:String(i),revenue:`9007199254740993.${String(i).padStart(3,'0')}`}));
const overview={leads:1000,delivered:800,called:600,rpcs:400,sales:200,activations:100,revenue:3000,trend,sources:[],attentionItems:[]};

export async function verifyVisualRefinements(browser,base,evidenceDirectory='verification/visual-refinements'){
  fs.mkdirSync(evidenceDirectory,{recursive:true});let checks=0;const results=[];
  for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:360,height:800}]){
    const page=await browser.newPage({viewport}),errors=[],consoleErrors=[];let queries=0;
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
    await page.route('**/api/**',async route=>{
      const endpoint=new URL(route.request().url()).pathname;let data={};
      if(endpoint==='/api/analytics/clients')data=[{id:'default_tenant',name:'Synthetic chart QA',currency:'ZAR',timezone:'UTC',capabilities:{}}];
      else if(endpoint==='/api/analytics/filter-options')data={vendors:[],sources:[],mediums:[]};
      else if(endpoint==='/api/analytics/overview'){data=overview;queries++;}
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data,metadata:{validationStatus:'NOT_VERIFIED'}})});
    });
    try{
      await page.goto(base+'/overview?startDate=2026-08-01&endDate=2026-08-31');
      await page.getByRole('heading',{name:'Executive Overview (Legacy)',exact:true}).waitFor();
      assert.match(await page.title(),/ConversionX/);checks++;
      assert.equal(await page.locator('vite-error-overlay').count(),0);checks++;
      const exactButton=page.getByRole('button',{name:'Exact values',exact:true}).first();
      await exactButton.click();const dialog=page.getByRole('dialog',{name:'Exact values: Daily Capture-Cohort Performance',exact:true});await dialog.waitFor();
      const table=dialog.getByRole('table');await table.locator('tbody tr').first().waitFor();
      assert.equal(await table.locator('tbody tr').count(),25);checks++;
      assert.match(await dialog.innerText(),/1000 returned rows · 1000 matching · 1–25 displayed/);checks++;
      const before=queries;
      assert.deepEqual(await dialog.getByLabel('Search exact values',{exact:true}).evaluate(input=>({visible:input.labels[0].innerText.trim(),name:input.getAttribute('aria-label')})),{visible:'Search exact values',name:'Search exact values'});checks++;
      await dialog.getByLabel('Search exact values',{exact:true}).fill('Fixture 00');
      await dialog.getByText(/1000 returned rows · 100 matching · 1–25 displayed/).waitFor();checks++;
      const revenue=table.getByRole('columnheader',{name:/Recorded Revenue/});
      await revenue.getByRole('button').click();assert.equal(await revenue.getAttribute('aria-sort'),'ascending');checks++;
      await revenue.getByRole('button').click();assert.equal(await revenue.getAttribute('aria-sort'),'descending');checks++;
      assert.match(await table.locator('tbody tr').first().innerText(),/9,007,199,254,740,993.099/);checks++;
      await dialog.getByLabel('Exact rows per page',{exact:true}).selectOption('50');assert.equal(await table.locator('tbody tr').count(),50);checks++;
      await dialog.getByRole('button',{name:'Next',exact:true}).click();await dialog.getByText(/51–100 displayed/).waitFor();checks++;
      await dialog.getByText('Export exact chart values',{exact:true}).click();
      for(const [label,count] of [['Export displayed rows',50],['Export matching rows',100],['Export all loaded rows',1000]]){
        const promise=page.waitForEvent('download');await dialog.getByRole('button',{name:label,exact:true}).click();
        const download=await promise,csv=fs.readFileSync(await download.path(),'utf8');
        assert.equal(csv.split('\r\n').length,count+1);assert.match(csv,/9007199254740993\./);assert.match(csv,/Capture dates: 2026-08-01 to 2026-08-31/);checks+=3;
      }
      assert.equal(queries,before,'search/sort/page/export are local display operations');checks++;
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
      assert.ok(await dialog.evaluate(element=>element.getBoundingClientRect().width<=innerWidth));checks++;
      await page.screenshot({path:path.join(evidenceDirectory,`exact-values-${viewport.width}.png`),fullPage:false});
      await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
      assert.equal(await exactButton.evaluate(element=>element===document.activeElement),true);checks++;
      await page.goto(base+'/visuals?startDate=2026-08-01&endDate=2026-08-31');
      const surface=page.locator('[data-visual-surface="api.response"]');await surface.scrollIntoViewIfNeeded();
      await surface.getByLabel('Dataset to visualise',{exact:true}).selectOption('overview.trend');
      const visual=surface.getByTestId('visual-view');await visual.getByLabel('Chart type',{exact:true}).selectOption('bar');
      await visual.getByLabel('Chart dimension',{exact:true}).selectOption('source');
      await visual.getByLabel('Chart measure',{exact:true}).selectOption('revenue');
      assert.deepEqual(await visual.getByLabel('Search chart labels',{exact:true}).evaluate(input=>({visible:input.labels[0].innerText.trim(),name:input.getAttribute('aria-label')})),{visible:'Search chart labels',name:'Search chart labels'});checks++;
      await visual.getByLabel('Search chart labels',{exact:true}).fill('Fixture 00');await visual.getByText(/Showing 1–25 of 100/).waitFor();checks++;
      await visual.getByText('More export options',{exact:true}).click();
      for(const [label,count] of [['Exact displayed CSV',25],['Export matching points CSV',100],['Export all loaded points CSV',1000]]){
        const promise=page.waitForEvent('download');await visual.getByRole('button',{name:label,exact:true}).click();
        const download=await promise,csv=fs.readFileSync(await download.path(),'utf8');assert.equal(csv.split('\r\n').length,count+1);checks++;
      }
      await visual.getByLabel('Chart type',{exact:true}).selectOption('heatmap');
      const mark=visual.getByRole('list',{name:'Heatmap points'}).getByRole('button').first();await mark.click();
      await visual.getByLabel('Selected chart point',{exact:true}).waitFor();checks++;
      await visual.getByRole('button',{name:'Close chart point',exact:true}).click();assert.equal(await mark.evaluate(element=>element===document.activeElement),true);checks++;
      await visual.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(evidenceDirectory,`visual-controls-${viewport.width}.png`),fullPage:false});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
      assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);checks+=2;
      results.push({viewport,queries,errors,consoleErrors,tableInitialRows:25,loadedRows:1000,matchingRows:100,displayedExportRows:50});
    }catch(error){await page.screenshot({path:path.join(evidenceDirectory,`failure-${viewport.width}.png`),fullPage:false});fs.writeFileSync(path.join(evidenceDirectory,`failure-${viewport.width}.json`),JSON.stringify({message:String(error),stack:error.stack,url:page.url(),errors,consoleErrors,body:await page.locator('body').innerText()},null,2));throw error;}
    finally{await page.close();}
  }
  fs.writeFileSync(path.join(evidenceDirectory,'results.json'),JSON.stringify({checks,results,fixture:'Synthetic API responses; no live warehouse data.',browser:'Chromium'},null,2));
  return {checks,evidenceDirectory};
}
