/* Gate4: real browser + API. Only the dedicated local disposable runtime. */
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT='http://127.0.0.1:5173', API='http://127.0.0.1:8020';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=500)errors.push(r.status()+' '+new URL(r.url()).pathname)});
  await page.goto(FRONT+'/login');
  await page.locator('input[type=email]').fill('gate1@example.invalid');
  await page.locator('input[type=password]').fill('synthetic-gate1-only');
  await page.locator('button[type=submit]').click();await page.waitForURL('**/plataforma');
  const token=await page.evaluate(()=>localStorage.getItem('access_token'));
  const headers={Authorization:'Bearer '+token};
  for(const [line,id] of [['NEURO',1],['CARDIO',2],['NEURO',3],['CARDIO',3]]) {
   await page.goto(FRONT+(line==='NEURO'?`/pacientes/${id}`:`/cardiometabolico/pacientes/${id}`));
   await page.getByRole('button',{name:'Gerar relatório',exact:true}).waitFor();
   await page.getByLabel('Data inicial').fill('2026-09-01');
   await page.getByLabel('Data final').fill('2026-09-30');
   const responsePromise=page.waitForResponse(r=>new URL(r.url()).pathname===`/pacientes/${id}/relatorio-pdf`);
   const downloadPromise=page.waitForEvent('download');
   await page.getByRole('button',{name:'Gerar relatório',exact:true}).click();
   const response=await responsePromise, download=await downloadPromise;
   assert.equal(response.status(),200);
   const params=new URL(response.url()).searchParams;
   assert.equal(params.get('care_line'),line);assert.equal(params.get('period_start'),'2026-09-01');assert.equal(params.get('period_end'),'2026-09-30');
   assert.ok((await response.body()).subarray(0,4).equals(Buffer.from('%PDF')));
   assert.equal(download.suggestedFilename(),`relatorio_${line.toLowerCase()}_${id}.pdf`);
   if(line==='CARDIO') for(const name of ['PTS','Planejamento PTS','Agenda','Sessões Assistenciais'])
     assert.equal(await page.getByRole('button',{name,exact:true}).count(),0);
   console.log(`PASS ${line} ${id}: contextual period + real API + PDF download`);
  }
  for(const [path,status] of [
   ['/pacientes/3/relatorio-pdf',409],
   ['/pacientes/4/relatorio-pdf?care_line=CARDIO',404],
   ['/pacientes/3/relatorio-pdf?care_line=CARDIO&period_start=2026-10-01&period_end=2026-09-01',422]])
    assert.equal((await page.request.get(API+path,{headers})).status(),status);
  assert.equal((await page.request.get(API+'/pacientes/3/relatorio-pdf?care_line=CARDIO')).status(),401);
  await page.getByLabel('Data inicial').fill('2026-10-01');
  await page.getByRole('button',{name:'Gerar relatório',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Período inválido.'}).waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS authorization, ambiguity, invalid period and frontend errors');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
