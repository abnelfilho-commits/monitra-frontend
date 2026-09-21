/* Isolated real component/service with synthetic HTTP, no backend or database. */
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const FRONT='http://127.0.0.1:5176';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();const requests=[],errors=[];let failure=false;
  page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
  await page.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.pathname==='/__report-test')return route.fulfill({contentType:'text/html',body:`<div id="root"></div><script type="module">
    import React from '/node_modules/.vite/deps/react.js';
    import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
    const {default:ReportDownload}=await import('/src/components/ReportDownload.jsx');
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(ReportDownload,{patientId:3,careLine:new URLSearchParams(location.search).get('line')}));
   </script>`});
   if(u.origin===FRONT)return route.continue();
   requests.push(u);
   if(failure)return route.fulfill({status:500,contentType:'application/json',body:'{}'});
   return route.fulfill({status:200,contentType:'application/pdf',body:'%PDF-1.4\nsynthetic download'});
  });
  let passed=0;
  for(const line of ['NEURO','CARDIO']){
   for(const [start,end] of [['2026-07-08','2026-09-21'],['2026-07-08',''],['','2026-09-21'],['','']]){
    await page.goto(FRONT+'/__report-test?line='+line);
    assert.equal(await page.getByRole('dialog').count(),0);
    await page.getByRole('button',{name:'Gerar relatório',exact:true}).click();
    await page.getByRole('heading',{name:'Período do relatório'}).waitFor();
    assert.equal(await page.getByLabel('Data inicial').evaluate(el=>el===document.activeElement),true);
    await page.getByRole('button',{name:'Cancelar',exact:true}).focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.getByLabel('Data inicial').evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(),0);
    assert.equal(await page.getByRole('button',{name:'Gerar relatório',exact:true}).evaluate(el=>el===document.activeElement),true);
    await page.getByRole('button',{name:'Gerar relatório',exact:true}).click();
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();
    await page.getByRole('button',{name:'Gerar relatório',exact:true}).click();
    await page.getByLabel('Data inicial').fill(start);await page.getByLabel('Data final').fill(end);
    const download=page.waitForEvent('download');await page.getByRole('dialog').getByRole('button',{name:'Gerar relatório',exact:true}).click();
    const result=await download;
    assert.equal(result.suggestedFilename(),`relatorio_${line.toLowerCase()}_3.pdf`);
    assert.equal(await result.failure(),null);
    await page.getByRole('dialog').waitFor({state:'hidden'});
    assert.equal(await page.getByRole('button',{name:'Gerar relatório',exact:true}).evaluate(el=>el===document.activeElement),true);
    const u=requests.at(-1);assert.equal(u.pathname,'/pacientes/3/relatorio-pdf');
    assert.equal(u.searchParams.get('care_line'),line);
    assert.equal(u.searchParams.get('period_start'),start||null);assert.equal(u.searchParams.get('period_end'),end||null);passed++;
   }
   await page.getByRole('button',{name:'Gerar relatório',exact:true}).click();
   await page.getByLabel('Data inicial').fill('2026-09-21');await page.getByLabel('Data final').fill('2026-07-08');
   const before=requests.length;await page.getByRole('dialog').getByRole('button',{name:'Gerar relatório',exact:true}).click();
   await page.getByRole('alert').filter({hasText:'Período inválido.'}).waitFor();assert.equal(requests.length,before);passed++;
   failure=true;
   await page.getByLabel('Data inicial').fill('2026-07-08');
   await page.getByLabel('Data final').fill('2026-09-21');
   await page.getByRole('dialog').getByRole('button',{name:'Gerar relatório',exact:true}).click();
   await page.getByRole('alert').filter({hasText:'Não foi possível gerar o relatório.'}).waitFor();
   assert.equal(await page.getByRole('dialog').isVisible(),true);
   assert.equal(await page.getByLabel('Data inicial').inputValue(),'2026-07-08');
   assert.equal(await page.getByLabel('Data final').inputValue(),'2026-09-21');
   assert.equal(requests.at(-1).searchParams.get('period_start'),'2026-07-08');
   assert.equal(requests.at(-1).searchParams.get('period_end'),'2026-09-21');
   failure=false;passed++;
  }
  await page.getByLabel('Data inicial').fill('2026-07-08');
  await page.getByRole('dialog').getByRole('button',{name:'Gerar relatório',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.screenshot({path:'/private/tmp/pacote-b-period.png'});
  assert.deepEqual(errors,[]);console.log(`PASS: ${passed} report period scenarios; both lines, complete/partial/default parameters, downloads, invalid period.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
