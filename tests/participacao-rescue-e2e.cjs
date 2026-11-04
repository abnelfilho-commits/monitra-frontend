// Requires disposable PostgreSQL + local FastAPI fixture on 127.0.0.1:18765.
// /test/session must expose an operator with CONTEXTO_ADMINISTRAR and authority
// to delegate both clinical capabilities, plus institution/person/context/professional_link.
// /test/evidence must count participations and clinical_grants. Start from zero.
// The older serve_participation_rescue.py fixture lacks clinical delegation authority:
// do not report full E2E PASS with that fixture. No HML/PROD destination is allowed.
// Real local API + PostgreSQL fixture, never HML. No production tokens or records.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT='http://127.0.0.1:5176', API='http://127.0.0.1:18765';
(async()=>{
 const session=await (await fetch(API+'/test/session')).json();
 const before=await (await fetch(API+'/test/evidence')).json();assert.equal(before.participations,0);assert.equal(before.clinical_grants,0);
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();page.setDefaultTimeout(15000);const writes=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(token=>localStorage.setItem('access_token',token),session.token);
  await page.route('**/*',async route=>{
   const request=route.request(),u=new URL(request.url());if(u.origin===FRONT)return route.continue();
   assert.ok(u.pathname==='/me'||u.pathname.startsWith('/operacao-assistencial/')||u.pathname==='/saude-mental/pessoas'||u.pathname==='/saude-mental/cockpit/gestao','Unexpected API '+u.pathname);
   if(request.method()!=='GET') {assert.ok([`/operacao-assistencial/contextos/${session.context}/participacoes`,`/operacao-assistencial/contextos/${session.context}/grants`].includes(u.pathname));writes.push(request.postDataJSON());}
   const response=await route.fetch({url:API+u.pathname+u.search});await route.fulfill({response});
  });
  const open=async()=>{
   await page.goto(FRONT+'/operacao-assistencial');await page.getByRole('button',{name:'Vincular Pessoa a Profissional',exact:true}).click();
   await page.getByLabel('Instituição',{exact:true}).selectOption(String(session.institution));
   await page.getByLabel('Paciente',{exact:true}).selectOption(String(session.person));
   await page.getByLabel('Profissional',{exact:true}).waitFor();
   assert.equal(await page.getByRole('navigation',{name:'Etapas da configuração'}).count(),0);
  };
  await open();await page.getByLabel('Profissional',{exact:true}).selectOption(String(session.professional_link));
  await page.getByLabel('Data de início',{exact:true}).fill('2026-11-04');await page.getByLabel('Motivo',{exact:true}).fill('E2E local sintético');
  await page.getByRole('button',{name:'Confirmar vínculo',exact:true}).evaluate(b=>{b.click();b.click();});
  await page.getByText('Vínculo registrado e confirmado. Participação concluída.',{exact:true}).waitFor();assert.equal(writes.length,1);
  const grant = async capability => {
    await page.getByLabel('Permissão de atendimento',{exact:true}).selectOption(capability);
    const select=page.getByLabel('Destinatário',{exact:true});
    const options=await select.locator('option').evaluateAll(rows=>rows.map(o=>o.value).filter(Boolean));
    assert.equal(options.length,1);await select.selectOption(options[0]);
    await page.getByLabel('Motivo da operação *',{exact:true}).fill('E2E local explícito');
    await page.getByRole('button',{name:'Conceder permissão',exact:true}).click();
    await page.getByText('Permissão concedida e confirmada na reconsulta.',{exact:true}).waitFor();
  };
  await grant('ASSISTENCIAL_LER');
  await open();await page.getByRole('region',{name:'Vínculos registrados'}).getByText(/PROFISSIONAL.*Registrado/).waitFor();
  await page.getByRole('button',{name:'Continuar permissões',exact:true}).click();
  await page.getByText(/Participação existente confirmada/).waitFor();
  assert.equal(writes.length,2);
  await grant('ASSISTENCIAL_REGISTRAR');
  await page.getByRole('button',{name:'Fechar vínculo',exact:true}).click();
  await open();
  await page.getByRole('button',{name:'Continuar permissões',exact:true}).click();
  await page.getByText(/Consultar atendimento: concedida/).waitFor();
  await page.getByText(/Registrar atendimento e check-ins: concedida/).waitFor();
  const after=await (await fetch(API+'/test/evidence')).json();assert.equal(after.participations,1);assert.equal(after.clinical_grants,2);assert.equal(writes.length,3);assert.deepEqual(errors,[]);
  console.log('PASS REAL LOCAL E2E: authorized non-ADMIN -> existing patient/context -> one POST -> PostgreSQL persisted -> API readback -> full page reload -> participation visible; two explicit clinical grants; reload/reopen/resume; zero duplicate writes.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
