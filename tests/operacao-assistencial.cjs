const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.MENTAL_FRONT_URL || 'http://127.0.0.1:5176';
(async () => {
 const browser = await chromium.launch({channel:'chrome', headless:true});
 try {
  const page = await browser.newPage(); page.setDefaultTimeout(10000);
  let actor='ADMIN', active=false, nominated=false, manage=false, failure=null, delay=false, empty=false, wrongScope=false, readFailure=false;
  const caps=['CONTEXTO_ADMINISTRAR','ASSISTENCIAL_LER','ASSISTENCIAL_REGISTRAR'];
  const grants=[], parts=[], calls=[], errors=[];
  const state=()=>({instituicao_id:wrongScope?99:4, contexto_id:9, linha:{id:8,ativo:active},
   acoes:{ativar_linha:actor==='ADMIN'&&!active,desativar_linha:actor==='ADMIN'&&active,bootstrap:actor==='ADMIN'&&!nominated,recovery_capacidades:[],conceder_capacidades:actor==='A'?caps:[],administrar_participacao:actor==='D'&&manage},
   contas:empty?[]:[{id:11,nome:'Responsável local'},{id:12,nome:'Gestor local'},{id:13,nome:'Profissional local'}],
   profissionais:empty?[]:[{id:21,profissional:'Profissional local',usuario_instituicao_acesso_id:13,data_inicio:'2020-01-01',data_fim:null,pode_receber_grant:true}],
   autoridades:nominated?caps.map((c,i)=>({id:41+i,nome:'Responsável local',capacidade_delegavel:c,revogado_em:null})):[],
   grants:grants.map(g=>({...g,pode_revogar:actor==='A'&&!g.revogado_em})),participacoes:parts});
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  // Every non-local request is fulfilled locally. No real API or permission writes.
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url()); if(u.origin===FRONT)return route.continue();
   const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(u.pathname==='/me')return reply({id:99,nome:actor,perfil:actor==='ADMIN'?'ADMIN':'SUPORTE',modulos:[]});
   if(!u.pathname.startsWith('/operacao-assistencial'))return reply([]);
   const body=req.postDataJSON();calls.push({path:u.pathname,method:req.method(),query:u.search,body});
   if(u.pathname.endsWith('/instituicoes'))return reply([{id:4,nome:'Instituição sintética'},{id:5,nome:'Outra instituição'}]);
   if(u.pathname==='/operacao-assistencial/contextos')return reply(actor==='C'||u.searchParams.get('instituicao_id')==='5'?[]:[{id:9,data_inicio:'2026-01-01',data_fim:null}]);
   if(req.method()==='GET')return readFailure?reply({detail:{code:'OPERATION_DENIED'}},403):reply(state());
   if(failure)return reply({detail:{code:failure.code}},failure.status);
   if(delay)await new Promise(r=>setTimeout(r,250));
   if(u.pathname.endsWith('/ativar'))active=true;
   else if(u.pathname.endsWith('/desativar'))active=false;
   else if(u.pathname.endsWith('/bootstrap'))nominated=true;
   else if(u.pathname.endsWith('/grants')){grants.push({id:51+grants.length,nome:body.usuario_instituicao_acesso_id===12?'Gestor local':'Profissional local',capacidade:body.capacidade,revogado_em:null});if(body.capacidade==='CONTEXTO_ADMINISTRAR')manage=true;}
   else if(u.pathname.endsWith('/participacoes'))parts.push({id:61,...body,encerrado_em:null,invalidado_em:null});
   else if(u.pathname.endsWith('/revogar'))grants.find(g=>g.id===Number(u.pathname.split('/').at(-2))).revogado_em='2026-10-06';
   else throw Error('Unexpected command '+u.pathname);
   return reply({ok:true});
  });
  const step=async n=>{await page.getByRole('navigation',{name:'Etapas da configuração'}).getByRole('button',{name:new RegExp('^'+n+'\\.')}).click();};
  const open=async who=>{actor=who;await page.goto(FRONT+'/operacao-assistencial?instituicao_id=4&contexto_id=9');await page.getByText('Instituição e contexto disponíveis para a conta conectada.').waitFor();};
  const reason=async()=>page.getByLabel('Motivo da operação *',{exact:true}).fill('Teste local explícito');
  const confirmed=async()=>page.getByRole('status').filter({hasText:'Operação confirmada.'}).waitFor();
  await open('ADMIN');
  await page.getByRole('button',{name:'Ativar Saúde Mental',exact:true}).click(); await confirmed();
  assert.equal(grants.length,0);assert.equal(parts.length,0);
  await step(2); await reason();
  if(process.env.SETUP_SCREENSHOTS) await page.screenshot({path:process.env.SETUP_SCREENSHOTS+'/context-desktop.png',fullPage:true});
  await page.getByLabel('Responsável por delegar permissões',{exact:true}).selectOption('11');
  for(const name of ['Administrar participações','Consultar atendimento','Registrar atendimento e check-ins'])await page.getByRole('checkbox',{name,exact:true}).check();
  await page.getByRole('button',{name:'Nomear responsável',exact:true}).click();await confirmed();
  assert.equal(grants.length,0);
  await step(3);await page.getByText(/Esta conta não está autorizada a delegar/).waitFor();
  assert.equal(await page.getByRole('button',{name:'Conceder permissão',exact:true}).count(),0);
  await step(4);await page.getByText(/Esta conta não possui permissão para administrar/).waitFor();
  await open('A');await step(3);await reason();await page.getByLabel('Destinatário',{exact:true}).selectOption('12');
  delay=true;await page.getByRole('button',{name:'Conceder permissão',exact:true}).evaluate(b=>{b.click();b.click();});await confirmed();delay=false;
  assert.equal(grants.length,1);assert.equal(grants[0].capacidade,'CONTEXTO_ADMINISTRAR');
  await step(6);await page.getByText('Gestor local · Administrar participações · Não revogada',{exact:true}).waitFor();
  await open('D');await step(4);await reason();
  await page.getByLabel('Profissional com vínculo vigente',{exact:true}).selectOption('21');
  await page.getByLabel('Início da participação',{exact:true}).fill('2026-01-01');
  await page.getByRole('button',{name:'Estabelecer participação',exact:true}).click();await confirmed();
  assert.equal(parts.length,1);assert.equal(grants.length,1);
  await open('A');await step(5);
  for(const cap of ['ASSISTENCIAL_LER','ASSISTENCIAL_REGISTRAR']){
   await reason();await page.getByLabel('Permissão de atendimento',{exact:true}).selectOption(cap);
   await page.getByLabel('Destinatário',{exact:true}).selectOption('13');await page.getByRole('button',{name:'Conceder permissão',exact:true}).click();await confirmed();
  }
  await step(6);await page.getByText(/Profissional local · 01\/01\/2026 → em aberto · Não encerrada/).waitFor();
  assert.equal(grants.length,3);
  await reason();await page.getByLabel('Permissão a revogar',{exact:true}).selectOption('52');
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Revogar permissão',exact:true}).click();await confirmed();
  assert.ok(grants[1].revogado_em);
  // Reopening reads persisted state, never repeats writes.
  const writes=calls.filter(c=>c.method==='POST').length;
  await page.reload();await step(6);await page.getByText('Profissional local · Consultar atendimento · Revogada',{exact:true}).waitFor();
  assert.equal(calls.filter(c=>c.method==='POST').length,writes);
  await step(5);await reason();await page.getByLabel('Permissão de atendimento',{exact:true}).selectOption('ASSISTENCIAL_LER');await page.getByLabel('Destinatário',{exact:true}).selectOption('13');
  failure={code:'AUTHORITY_DENIED',status:403};await page.getByRole('button',{name:'Conceder permissão',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'não possui autoridade'}).waitFor();assert.equal(grants.length,3);
  failure=null;await page.getByRole('button',{name:'Atualizar estado',exact:true}).click();await reason();
  await page.getByLabel('Permissão de atendimento',{exact:true}).selectOption('ASSISTENCIAL_LER');await page.getByLabel('Destinatário',{exact:true}).selectOption('13');
  failure={code:'OPERATION_NOT_CONFIRMED',status:500};await page.getByRole('button',{name:'Conceder permissão',exact:true}).click();await page.getByRole('alert').filter({hasText:'Novas escritas bloqueadas'}).waitFor();
  failure=null;await page.getByRole('button',{name:'Atualizar estado',exact:true}).click();await page.getByRole('button',{name:'Conceder permissão',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Conceder permissão',exact:true}).isDisabled(),true);
  nominated=false;empty=true;await open('ADMIN');await step(2);await page.getByText(/Nenhum candidato disponível/).waitFor();
  assert.equal(await page.getByRole('button',{name:'Nomear responsável',exact:true}).count(),0);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(process.env.SETUP_SCREENSHOTS) await page.screenshot({path:process.env.SETUP_SCREENSHOTS+'/context-mobile.png',fullPage:true});
  await step(1);assert.equal(await page.locator('h2:focus').textContent(),'Identificação e pré-requisitos');
  empty=false;await page.getByLabel('Instituição',{exact:true}).selectOption('5');await page.getByText(/Nenhum contexto disponível nesta instituição/).waitFor();
  assert.equal(await page.getByRole('navigation',{name:'Etapas da configuração'}).count(),0);
  wrongScope=true;await page.goto(FRONT+'/operacao-assistencial?instituicao_id=4&contexto_id=9');await page.getByRole('alert').waitFor();
  assert.equal(await page.getByRole('button',{name:'Ativar Saúde Mental',exact:true}).count(),0);wrongScope=false;
  readFailure=true;await page.reload();await page.getByRole('alert').filter({hasText:'não autorizada'}).waitFor();readFailure=false;
  actor='C';await page.goto(FRONT+'/operacao-assistencial?instituicao_id=4&contexto_id=9');await page.getByText(/O contexto informado não está disponível/).waitFor();
  assert.equal(await page.getByRole('navigation',{name:'Etapas da configuração'}).count(),0);
  assert.equal(errors.length,0,errors.join('\n'));
  for(const c of calls.filter(c=>c.method==='POST')) {assert.equal(c.query,'?instituicao_id=4');assert.ok(c.path.includes('/contextos/9/'));if(c.body)assert.equal('ator_usuario_id' in c.body,false);}
  console.log('PASS: line, nomination, actor separation, grants, participation, revoke, readback/resume, double click, denied/uncertain, empty candidates, institution isolation, wrong scope, responsive and focus.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
