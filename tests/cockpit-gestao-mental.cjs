const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.MENTAL_FRONT_URL || 'http://127.0.0.1:5182';
function payload(weeks=4, institution='', profile='ADMIN', zero=false) {
 const start=new Date('2026-10-12T00:00:00Z'); start.setUTCDate(start.getUTCDate()-7*weeks);
 const series=Array.from({length:weeks},(_,i)=>({semana:new Date(+start+i*604800000).toISOString().slice(0,10),programados:zero?0:i+1,realizados:zero?0:i}));
 return {indicadores:{instituicoes_ativas:institution?1:2,profissionais_vinculados:zero?0:7,atendimentos_programados:zero?0:30,atendimentos_realizados:zero?0:20},atendimentos_programados_realizados:series,evolucao_atendimentos:series.map(({semana,realizados})=>({semana,realizados})),metadados:{data_inicio:start.toISOString().slice(0,10),data_fim:'2026-10-11',data_consulta:'2026-10-14',semanas:weeks,fuso:'America/Cuiaba',instituicao_ids:institution?[Number(institution)]:[5,6],escopo:profile==='ADMIN'&&!institution?'GLOBAL':'INSTITUICOES_AUTORIZADAS',limitacoes:['Informação operacional restrita; inferência residual em grupos pequenos.']}};
}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}); let passed=0;
 try {
  const page=await browser.newPage({timezoneId:'Asia/Tokyo',viewport:{width:1440,height:1000}});
  page.setDefaultTimeout(12000);
  let profile='ADMIN',failure=0,namesFailure=false,zero=false,invalid=false,hold=false,releases=[];
  const calls=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url()); if(u.origin===FRONT)return route.continue();
   const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   calls.push({path:u.pathname,query:u.search,method:route.request().method()});
   if(u.pathname==='/me')return reply({id:99,nome:'Sintético',perfil:profile});
   if(u.pathname==='/operacao-assistencial/instituicoes')return reply([]);
   if(['/admin/instituicoes/','/saude-mental/instituicoes'].includes(u.pathname))return namesFailure?reply({},500):reply([{id:5,nome:'Alfa',nome_fantasia:'Alfa'},{id:6,nome:'Beta',nome_fantasia:'Beta'},{id:99,nome:'Não autorizado'}]);
   if(u.pathname==='/saude-mental/cockpit/gestao'){
    const institution=u.searchParams.get('instituicao_id')||'',weeks=Number(u.searchParams.get('semanas'));
    const response=payload(weeks,institution,profile,zero),status=failure;
    if(hold&&institution==='5')await new Promise(resolve=>releases.push(resolve));
    if(status==='network')return route.abort();
    if(status)return reply({},status);
    return reply(invalid?{...response,indicadores:{}}:response);
   }
   return reply({},403);
  });
  const open=()=>page.goto(FRONT+'/saude-mental/gestao');
  const ready=()=>page.getByRole('heading',{name:'Resumo operacional',exact:true}).waitFor();
  const values=()=>page.locator('.stat-card__value').allTextContents();
  await open();await ready();
  assert.equal(await page.getByRole('navigation',{name:'Navegação institucional'}).count(),1);
  assert.equal(await page.getByRole('navigation',{name:'Navegação Saúde Mental'}).count(),0);
  assert.deepEqual(await values(),['2','7','30','20']);passed++;
  await page.getByRole('link',{name:'Visão Geral',exact:true}).waitFor();passed++;
  const select=page.getByLabel('Instituição gerencial');
  assert.deepEqual(await select.locator('option').allTextContents(),['Todas as instituições autorizadas','Alfa','Beta']);
  assert.ok(calls.some(c=>c.path==='/admin/instituicoes/'));passed++;
  await select.selectOption('5');await ready();assert.deepEqual(await select.locator('option').allTextContents(),['Todas as instituições autorizadas','Alfa','Beta']);
  assert.deepEqual(await values(),['1','7','30','20']);passed++;
  for(const weeks of ['8','12','4']){
   await page.getByLabel('Período gerencial').selectOption(weeks);await ready();
   assert.ok(calls.some(c=>c.path.endsWith('/cockpit/gestao')&&new URLSearchParams(c.query).get('semanas')===weeks&&new URLSearchParams(c.query).get('instituicao_id')==='5'));
  }passed++;
  assert.equal(await page.locator('.recharts-wrapper').count(),2);passed++;
  fs.mkdirSync('/private/tmp/f20-visual',{recursive:true});
  for(const width of [1440,768,390]){
   await page.setViewportSize({width,height:1000});await page.waitForTimeout(150);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.screenshot({path:`/private/tmp/f20-visual/gestao-${width}.png`,fullPage:true});
  }passed++;
  // Delayed old institution must never replace the new filter; cards vanish immediately.
  await select.selectOption('6');await ready();hold=true;
  await select.selectOption('5');await page.getByText('Carregando gestão institucional…',{exact:true}).waitFor();
  assert.equal((await values()).length,0);
  await page.waitForFunction(()=>true);await page.waitForTimeout(100);
  await select.selectOption('6');await ready();hold=false;releases.splice(0).forEach(r=>r());await page.waitForTimeout(150);
  assert.equal(await select.inputValue(),'6');assert.equal(await page.locator('[role="alert"]').count(),0);passed++;
  zero=true;await page.getByRole('button',{name:'Atualizar',exact:true}).click();await ready();
  assert.deepEqual(await values(),['1','0','0','0']);await page.getByRole('heading',{name:'Nenhum atendimento no período',exact:true}).waitFor();passed++;
  zero=false;namesFailure=true;await page.getByRole('button',{name:'Atualizar',exact:true}).click();await ready();
  await page.getByText(/Nomes institucionais indisponíveis/).waitFor();
  assert.deepEqual(await select.locator('option').allTextContents(),['Todas as instituições autorizadas','Instituição #5','Instituição #6']);passed++;
  namesFailure=false;failure=403;await page.getByRole('button',{name:'Atualizar',exact:true}).click();
  await page.getByRole('alert').waitFor();assert.equal((await values()).length,0);assert.equal(await select.isDisabled(),true);
  assert.equal(await select.locator('option[value="5"]').count(),0);assert.equal(await page.getByRole('link',{name:'Visão Geral',exact:true}).count(),0);passed++;
  failure=0;await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await ready();await page.getByRole('link',{name:'Visão Geral',exact:true}).waitFor();passed++;
  for(const status of [401,422,503,500,'network']){
   failure=status;await page.getByRole('button',{name:'Atualizar',exact:true}).click();await page.getByRole('alert').waitFor();
   assert.equal((await values()).length,0);
   if(status===500||status==='network')assert.match(await page.getByRole('alert').innerText(),/Falha técnica/);
   failure=0;await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await ready();
  }passed++;
  invalid=true;await page.getByRole('button',{name:'Atualizar',exact:true}).click();await page.getByRole('alert').waitFor();
  assert.match(await page.getByRole('alert').innerText(),/incompleta ou inválida/);assert.equal((await values()).length,0);invalid=false;passed++;
  // Direct manager route is determined by the endpoint, not global role or operational discovery.
  profile='GESTOR';await open();await ready();
  assert.equal(await select.locator('option').first().textContent(),'Todas as minhas instituições autorizadas');
  assert.ok(calls.some(c=>c.path==='/saude-mental/instituicoes'));passed++;
  profile='SUPORTE';await open();await ready();passed++; // 200 is authoritative, not this global label.
  failure=403;await open();await page.getByRole('alert').waitFor();assert.equal((await values()).length,0);passed++;
  failure='network';await open();await page.getByRole('alert').waitFor();
  await page.getByRole('link',{name:'Visão Geral (verificar acesso)',exact:true}).waitFor();passed++;
  failure=0;await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await ready();
  assert.ok(calls.every(c=>c.method==='GET'));
  assert.ok(!calls.some(c=>/pessoas|pacientes|contextos|cockpit\/profissional/.test(c.path)));passed++;
  // F20.5-A: only confirmed access redirects the institutional landing.
  profile='GESTOR';failure=0;
  await page.goto(FRONT+'/gestao-institucional');await page.waitForURL(FRONT+'/saude-mental/gestao');await ready();
  await page.getByRole('heading',{name:'Visão Geral — Saúde Mental',exact:true}).waitFor();
  await page.getByRole('heading',{name:'Gestão operacional institucional',exact:true}).waitFor();
  assert.equal(await page.getByRole('link',{name:'Visão Geral',exact:true}).getAttribute('aria-current'),'page');passed++;
  // Other institutional permissions must survive a denied managerial discovery.
  profile='SUPORTE';failure=403;
  await page.goto(FRONT+'/gestao-institucional');await page.getByRole('heading',{name:'Gestão Institucional',exact:true}).waitFor();
  await page.waitForTimeout(200);assert.equal(page.url(),FRONT+'/gestao-institucional');
  assert.equal(await page.getByRole('alert').count(),0);
  await page.getByRole('link',{name:'Atividades Terapêuticas',exact:true}).waitFor();
  assert.equal(await page.getByRole('link',{name:'Visão Geral',exact:true}).count(),0);passed++;
  failure='network';await page.goto(FRONT+'/gestao-institucional');
  await page.getByRole('link',{name:'Visão Geral (verificar acesso)',exact:true}).waitFor();
  assert.equal(page.url(),FRONT+'/gestao-institucional');
  await page.getByRole('link',{name:'Atividades Terapêuticas',exact:true}).waitFor();
  failure=0;await page.getByRole('link',{name:'Visão Geral (verificar acesso)',exact:true}).click();await ready();passed++;
  // A successful discovery must never redirect another administrative route.
  profile='ADMIN';await page.goto(FRONT+'/admin/instituicoes');
  await page.getByRole('link',{name:'Visão Geral',exact:true}).waitFor();
  assert.equal(page.url(),FRONT+'/admin/instituicoes');passed++;
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(`F20_2_PASS: ${passed} groups; real browser, mocked API, 1440/768/390, no HML. Screenshots /private/tmp/f20-visual`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
