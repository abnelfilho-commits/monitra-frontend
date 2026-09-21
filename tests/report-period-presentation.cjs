/* Isolated real component/service with synthetic HTTP, no backend or database. */
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const FRONT='http://127.0.0.1:5176';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();const requests=[],errors=[];
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
   return route.fulfill({status:200,contentType:'application/pdf',body:'%PDF-1.4\nsynthetic download'});
  });
  let passed=0;
  for(const line of ['NEURO','CARDIO']){
   for(const [start,end] of [['2026-07-08','2026-09-21'],['2026-07-08',''],['','2026-09-21'],['','']]){
    await page.goto(FRONT+'/__report-test?line='+line);
    await page.getByRole('heading',{name:'Período do relatório'}).waitFor();
    await page.getByLabel('Data inicial').fill(start);await page.getByLabel('Data final').fill(end);
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'Gerar relatório',exact:true}).click();
    assert.equal((await download).suggestedFilename(),`relatorio_${line.toLowerCase()}_3.pdf`);
    const u=requests.at(-1);assert.equal(u.pathname,'/pacientes/3/relatorio-pdf');
    assert.equal(u.searchParams.get('care_line'),line);
    assert.equal(u.searchParams.get('period_start'),start||null);assert.equal(u.searchParams.get('period_end'),end||null);passed++;
   }
   await page.getByLabel('Data inicial').fill('2026-09-21');await page.getByLabel('Data final').fill('2026-07-08');
   const before=requests.length;await page.getByRole('button',{name:'Gerar relatório',exact:true}).click();
   await page.getByRole('alert').filter({hasText:'Período inválido.'}).waitFor();assert.equal(requests.length,before);passed++;
  }
  await page.getByLabel('Data inicial').fill('2026-07-08');
  await page.getByRole('button',{name:'Gerar relatório',exact:true}).click();
  await page.getByRole('button',{name:'Gerar relatório',exact:true}).waitFor();
  await page.screenshot({path:'/private/tmp/pacote-b-period.png'});
  assert.deepEqual(errors,[]);console.log(`PASS: ${passed} report period scenarios; both lines, complete/partial/default parameters, downloads, invalid period.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
