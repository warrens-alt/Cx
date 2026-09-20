from pathlib import Path
import json
R=Path.cwd()
p=R/'src/pages/Explore.tsx'
s=p.read_text().replace('<table className="enterprise-table w-full">','<table className="enterprise-table w-full" aria-label="Explorer results">')
s=s.replace('<th>','<th scope="col">').replace('<th className="text-right">','<th scope="col" className="text-right">')
s=s.replace('<th scope="col" className="text-right">{METRICS.find(m => m.id === metric)?.label}</th>', '<th scope="col" className="text-right" aria-label={METRICS.find(m => m.id === metric)?.label}>{METRICS.find(m => m.id === metric)?.label}</th>')
p.write_text(s)
p=R/'index.html'
s=p.read_text().replace('ConversionX | Revenue Intelligence','ConversionX | Lead & Revenue Analytics').replace('Production-ready, vendor-centric, BigQuery-backed Lead-to-Revenue Intelligence Platform.','Versioned lead, vendor and revenue reporting with explicit metric definitions and supporting evidence.')
p.write_text(s)
p=R/'tests/naming.test.ts'
s=p.read_text()+'''
test('browser title and social metadata match the application brand',()=>{
  const html=read('index.html');
  assert.match(html,/<title>ConversionX \\| Lead &amp; Revenue Analytics<\\/title>|<title>ConversionX \\| Lead & Revenue Analytics<\\/title>/);
  assert.doesNotMatch(html,/Production-ready|Revenue Intelligence/);
});
test('explorer metric header exposes its denominator to assistive technology',()=>{
  const source=read('src/pages/Explore.tsx');
  assert.match(source,/aria-label="Explorer results"/);
  assert.match(source,/scope="col" className="text-right" aria-label=\\{METRICS/);
});
'''
p.write_text(s)
p=R/'tooling/browser/smoke.mjs'
s=p.read_text()
s=s.replace("assert.equal(await page.getByRole('heading',{level:1}).textContent(),'Evidence Reports');checks++;", "assert.equal(await page.getByRole('heading',{level:1}).textContent(),'Evidence Reports');checks++;\n    assert.equal(await page.title(),'ConversionX | Lead & Revenue Analytics');checks++;")
old="    assert.equal(await page.getByRole('columnheader',{name:/^Sales \\/ Dialled Leads \\(%\\)$/i}).count(),1);checks++;"
new="""    const explorerTable=page.getByRole('table',{name:'Explorer results',exact:true});
    const metricHeader=explorerTable.getByRole('columnheader',{name:'Sales / Dialled Leads (%)',exact:true});
    await metricHeader.waitFor();assert.equal((await metricHeader.textContent()).trim(),'Sales / Dialled Leads (%)');checks++;"""
assert old in s
s=s.replace(old,new)
s=s.replace("fs.writeFileSync('verification/browser-failure.html',await activePage.content());", "fs.writeFileSync('verification/browser-failure.html',await activePage.content());fs.writeFileSync('verification/browser-failure.json',JSON.stringify({url:activePage.url(),checks,message:String(error),stack:error.stack,headers:await activePage.locator('thead th').allTextContents(),accessibility:await activePage.locator('body').ariaSnapshot()},null,2));")
p.write_text(s)
p=R/'.maintenance/naming/expected.json';m=json.loads(p.read_text())
m.update({'src/pages/Explore.tsx':'26c36c565643cce877b5e6946405cc91e7db43d8','index.html':'3b83fd18ba31f0eefb0b6817d42d7fd9249caebf','tests/naming.test.ts':'31aaa3a4cb991c9d6fac2d7b5adb39a4667a3ab1','tooling/browser/smoke.mjs':'5f2217f76de9e55c577739b05c022bbeab916741'})
p.write_text(json.dumps(m,indent=2)+'\n')
