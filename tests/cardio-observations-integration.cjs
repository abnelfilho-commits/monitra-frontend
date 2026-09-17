/* Existing Portal UI and real APP API against disposable synthetic runtime only. */
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT='http://127.0.0.1:5174', API='http://127.0.0.1:8019';
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const page=await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('dialog',dialog=>dialog.accept());
    await page.goto(FRONT+'/login');
    await page.locator('input[type=email]').fill('gate1@example.invalid');
    await page.locator('input[type=password]').fill('synthetic-gate1-only');
    await page.locator('button[type=submit]').click(); await page.waitForURL('**/plataforma');
    const token=await page.evaluate(()=>localStorage.getItem('access_token'));
    const headers={Authorization:'Bearer '+token};
    const note='  Synthetic complementary observation\nNo clinical classification  ';
    await page.goto(FRONT+'/cardiometabolico/pacientes/3/registro-diario');
    await page.locator('input[type=number]').first().fill('180');
    await page.locator('input[type=number]').nth(2).fill('140');
    await page.locator('input[type=number]').nth(3).fill('90');
    await page.locator('input[type=number]').nth(4).fill('85');
    await page.locator('textarea').fill(note);
    const posted=page.waitForResponse(r=>r.url()===API+'/cardiometabolico/registro-diario' && r.request().method()==='POST');
    await page.getByRole('button',{name:'Salvar registro clínico'}).click();
    const response=await posted; assert.equal(response.status(),200,await response.text());
    assert.equal(response.request().postDataJSON().observacoes,note);
    assert.equal(response.request().postDataJSON().glicemia_pos_prandial,null);
    const portal=await response.json();
    await page.waitForURL('**/cardiometabolico/pacientes/3');
    const login=await page.request.post(API+'/auth/responsavel/login',{form:{username:'gate2@example.invalid',password:'synthetic-gate2-only'}});
    assert.equal(login.status(),200);
    const responsibleHeaders={Authorization:'Bearer '+(await login.json()).access_token};
    const clinicalDate=new Date(); clinicalDate.setDate(clinicalDate.getDate()-1);
    const today=clinicalDate.toLocaleDateString('en-CA');
    const app=await page.request.post(API+'/responsavel/pacientes/3/registros-cardio',{headers:responsibleHeaders,data:{
      data:today,glicemia_jejum:180,pressao_sistolica:140,pressao_diastolica:90,peso:85,observacoes:note}});
    assert.equal(app.status(),200,await app.text());
    const appBody=await app.json();
    const read=await page.request.get(API+'/responsavel/pacientes/3/registros-cardio',{headers:responsibleHeaders});
    assert.equal(read.status(),200);
    const saved=(await read.json()).find(r=>r.id===appBody.registro_id);
    assert.equal(saved.observacoes,note);
    assert.equal(saved.origem,'RESPONSAVEL_APP');
    assert.equal(saved.criado_por_responsavel_id,9);
    const unauthorized=await page.request.post(API+'/cardiometabolico/registro-diario',{data:{paciente_id:3,observacoes:note}});
    assert.equal(unauthorized.status(),401);
    const wrongLine=await page.request.post(API+'/cardiometabolico/registro-diario',{headers,data:{paciente_id:1,observacoes:note}});
    assert.equal(wrongLine.status(),403);
    const wrongClinic=await page.request.post(API+'/cardiometabolico/registro-diario',{headers,data:{paciente_id:4,observacoes:note}});
    assert.equal(wrongClinic.status(),404);
    const neuro=await page.request.get(API+'/timeline/pacientes/3',{headers});
    assert.equal(neuro.status(),200);
    assert.ok(!(await neuro.json()).some(r=>r.tipo_evento==='REGISTRO_DIARIO' && [portal.registro_id,appBody.registro_id].includes(r.id)));
    console.log('PASS Portal browser submission, blank optional numeric values, APP canonical text readback, authentication and line/clinic isolation.');
    console.log(JSON.stringify({portal_record_id:portal.registro_id,app_record_id:appBody.registro_id}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
