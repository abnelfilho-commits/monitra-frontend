/* Real browser + disposable API, using Gate3 synthetic HTTP fixture. */
const assert = require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT='http://127.0.0.1:5174', API='http://127.0.0.1:8019';
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const page=await browser.newPage();page.setDefaultTimeout(15000);
    page.on('dialog',dialog=>dialog.accept());
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=500)errors.push(r.status()+' '+new URL(r.url()).pathname)});
    await page.goto(FRONT+'/login');
    await page.locator('input[type=email]').fill('gate1@example.invalid');
    await page.locator('input[type=password]').fill('synthetic-gate1-only');
    await page.locator('button[type=submit]').click();await page.waitForURL('**/plataforma');
    const token=await page.evaluate(()=>localStorage.getItem('access_token'));
    const headers={Authorization:'Bearer '+token};
    const r=await page.request.get(API+'/cardiometabolico/pacientes',{headers});assert.equal(r.status(),200);
    const patients=await r.json();
    const multi=patients.filter(p=>p.nome.startsWith('Gate3 Multi ')).sort((a,b)=>b.id-a.id)[0];
    const empty=patients.filter(p=>p.nome.startsWith('Gate3 NoRecord ')).sort((a,b)=>b.id-a.id)[0];
    assert.ok(multi && empty,'Run backend Gate3 HTTP fixture first');
    await page.goto(FRONT+'/cardiometabolico');
    await page.getByRole('heading',{name:'Bem-vindo ao Cockpit Cardiometabólico'}).waitFor();
    for(const title of ['Ações rápidas','Prioridade do dia','Atividade recente','Evolução do acompanhamento'])
      assert.equal(await page.getByRole('heading',{name:title,exact:true}).count(),1);
    for(const forbidden of ['PTS','Planejamento PTS','Agenda','Sessões Assistenciais'])
      assert.equal(await page.getByRole('button',{name:forbidden,exact:true}).count(),0);
    await page.goto(FRONT+`/cardiometabolico/pacientes/${multi.id}`);
    await page.getByRole('heading',{name:multi.nome,exact:true}).waitFor();
    await page.getByRole('heading',{name:'Timeline clínica'}).waitFor();
    await page.getByText('Canal: RESPONSAVEL_WHATSAPP',{exact:true}).waitFor();
    assert.equal(await page.getByText('Canal: RESPONSAVEL_APP',{exact:true}).count(),1);
    assert.ok(await page.getByText('Gate3 diagnosis CARDIO',{exact:false}).count());
    assert.equal(await page.getByText('Gate3 diagnosis NEURO',{exact:false}).count(),0);
    await page.getByRole('heading',{name:'Evolução do IMC',exact:true}).waitFor();
    const bmi=page.locator('section').filter({has:page.getByRole('heading',{name:'Evolução do IMC',exact:true})});
    await bmi.locator('svg').first().waitFor();
    await page.goto(FRONT+`/cardiometabolico/pacientes/${empty.id}`);
    await page.getByRole('heading',{name:empty.nome,exact:true}).waitFor();
    await page.getByText('Nenhum evento encontrado.',{exact:true}).waitFor();
    assert.ok(await page.getByText('Indisponível',{exact:true}).count());
    assert.equal(await page.getByText('baixo',{exact:true}).count(),0);
    assert.equal(await page.getByText('Indisponível — sem medições válidas para este indicador.',{exact:true}).count(),4);
    await page.goto(FRONT+`/cardiometabolico/pacientes/${multi.id}/registro-diario`);
    await page.locator('input[type=number]').first().fill('180');
    await page.locator('textarea').fill('Gate3 browser portal');
    const posted=page.waitForResponse(r=>r.url()===API+'/cardiometabolico/registro-diario' && r.request().method()==='POST');
    await page.getByRole('button',{name:'Salvar registro clínico'}).click();
    assert.equal((await posted).status(),200);
    await page.waitForURL(`**/cardiometabolico/pacientes/${multi.id}`);
    await page.getByText('Observações: Gate3 browser portal',{exact:true}).first().waitFor();
    await page.goto(FRONT+`/pacientes/${multi.id}`);
    await page.getByRole('button',{name:/Diagnóstico/}).first().waitFor();
    assert.equal(await page.getByText('Gate3 diagnosis CARDIO',{exact:false}).count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS Gate3 browser: Cockpit sections/capabilities; contextual 360; three channels; diagnosis isolation; BMI chart/unavailability; Neuro; no runtime/server errors.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
