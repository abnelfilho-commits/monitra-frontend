const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const FRONT=process.env.MENTAL_FRONT_URL||'http://127.0.0.1:5176';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();page.setDefaultTimeout(10000);
  let actor='ADMIN',active=false,nominated=false,manage=false,failure=null,delay=false;
  const caps=['CONTEXTO_ADMINISTRAR','ASSISTENCIAL_LER','ASSISTENCIAL_REGISTRAR'];
  const grants=[],parts=[],calls=[],errors=[];
  const state=()=>({instituicao_id:4,contexto_id:9,linha:{id:8,modulo_id:3,contexto_assistencial_id:9,ativo:active},
   acoes:{ativar_linha:actor==='ADMIN'&&!active,desativar_linha:actor==='ADMIN'&&active,bootstrap:actor==='ADMIN'&&!nominated,recovery_capacidades:[],conceder_capacidades:actor==='A'?caps:[],administrar_participacao:actor==='D'&&manage},
   contas:[{id:11,nome:'Autoridade A'},{id:12,nome:'Gestor D'},{id:13,nome:'Profissional B'}],
   profissionais:[{id:21,profissional:'Profissional B',usuario_instituicao_acesso_id:13,data_inicio:'2020-01-01',data_fim:null,pode_receber_grant:true}],
   autoridades:nominated?[{id:41,nome:'Autoridade A',capacidade_delegavel:'ASSISTENCIAL_LER',revogado_em:null}]:[],
   grants:grants.map(g=>({...g,pode_revogar:actor==='A'&&!g.revogado_em})),participacoes:parts});
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());if(u.origin===FRONT)return route.continue();
   const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(u.pathname==='/me')return reply({id:99,nome:actor,perfil:actor==='ADMIN'?'ADMIN':'SUPORTE',modulos:[]});
   if(!u.pathname.startsWith('/operacao-assistencial'))return reply([]);
   const body=req.postDataJSON();calls.push({path:u.pathname,method:req.method(),query:u.search,body});
   if(u.pathname.endsWith('/instituicoes'))return reply([{id:4,nome:'Instituição sintética'}]);
   if(u.pathname==='/operacao-assistencial/contextos')return reply(actor==='C'?[]:[{id:9,data_inicio:'2026-01-01',data_fim:null}]);
   if(req.method()==='GET')return actor==='C'?reply({detail:{code:'OPERATION_DENIED'}},403):reply(state());
   if(failure)return reply({detail:{code:failure.code}},failure.status);
   if(delay)await new Promise(r=>setTimeout(r,250));
   if(u.pathname.endsWith('/ativar'))active=true;
   else if(u.pathname.endsWith('/desativar'))active=false;
   else if(u.pathname.endsWith('/bootstrap'))nominated=true;
   else if(u.pathname.endsWith('/grants')){grants.push({id:51+grants.length,nome:body.usuario_instituicao_acesso_id===12?'Gestor D':'Profissional B',capacidade:body.capacidade,revogado_em:null});if(body.capacidade==='CONTEXTO_ADMINISTRAR')manage=true;}
   else if(u.pathname.endsWith('/participacoes'))parts.push({id:61,...body,encerrado_em:null,invalidado_em:null});
   else if(u.pathname.endsWith('/revogar'))grants.find(g=>g.id===Number(u.pathname.split('/').at(-2))).revogado_em='2026-10-06';
   else throw Error('Unexpected command '+u.pathname);
   return reply({ok:true});
  });
  const open=async who=>{actor=who;await page.goto(FRONT+'/operacao-assistencial?instituicao_id=4&contexto_id=9');await page.getByRole('heading',{name:'Estado operacional do contexto'}).waitFor();};
  await open('ADMIN');
  assert.equal(await page.getByRole('button',{name:'Conceder capacidade selecionada',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Estabelecer participação',exact:true}).count(),0);
  await page.getByRole('button',{name:'Ativar Saúde Mental',exact:true}).click();
  await page.getByRole('button',{name:'Desativar Saúde Mental',exact:true}).waitFor();
  assert.equal(grants.length,0);assert.equal(parts.length,0);
  await page.getByLabel('Motivo da operação *',{exact:true}).fill('Nomeação explícita');
  await page.getByLabel('Conta A',{exact:true}).selectOption('11');
  for(const name of ['Administrar participação contextual','Consultar jornada assistencial','Registrar atendimento / check-in'])await page.getByRole('checkbox',{name:'Autoridade para delegar: '+name,exact:true}).check();
  await page.getByRole('button',{name:'Nomear autoridade (bootstrap)',exact:true}).click();
  await page.getByText('Autoridade A · Consultar jornada assistencial · Não revogada',{exact:true}).waitFor();
  assert.equal(grants.length,0);
  await open('A');assert.equal(await page.getByRole('button',{name:'Ativar Saúde Mental',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Estabelecer participação',exact:true}).count(),0);
  await page.getByLabel('Motivo da operação *',{exact:true}).fill('Grant administrativo');
  await page.getByLabel('Capacidade',{exact:true}).selectOption('CONTEXTO_ADMINISTRAR');
  await page.getByLabel('Destinatário',{exact:true}).selectOption('12');
  delay=true;
  await page.getByRole('button',{name:'Conceder capacidade selecionada',exact:true}).evaluate(button=>{button.click();button.click();});
  await page.getByText('Gestor D · Administrar participação contextual · Não revogada',{exact:true}).waitFor();
  delay=false;assert.equal(grants.length,1);
  await open('D');assert.equal(await page.getByRole('button',{name:'Conceder capacidade selecionada',exact:true}).count(),0);
  await page.getByLabel('Motivo da operação *',{exact:true}).fill('Participação explícita');
  await page.getByLabel('Profissional B / vínculo vigente',{exact:true}).selectOption('21');
  await page.getByLabel('Início da participação',{exact:true}).fill('2026-01-01');
  await page.getByRole('button',{name:'Estabelecer participação',exact:true}).click();
  await page.getByText('Profissional B · 2026-01-01 → aberto · Não encerrada',{exact:true}).waitFor();
  assert.equal(grants.length,1);assert.equal(parts.length,1);
  await open('A');
  for(const capability of ['ASSISTENCIAL_LER','ASSISTENCIAL_REGISTRAR']){
   await page.getByLabel('Motivo da operação *',{exact:true}).fill('Grant clínico explícito');
   await page.getByLabel('Capacidade',{exact:true}).selectOption(capability);
   await page.getByLabel('Destinatário',{exact:true}).selectOption('13');
   await page.getByRole('button',{name:'Conceder capacidade selecionada',exact:true}).click();
   await page.getByRole('button',{name:'Revogar '+(capability==='ASSISTENCIAL_LER'?'Consultar jornada assistencial':'Registrar atendimento / check-in'),exact:true}).waitFor();
  }
  page.once('dialog',d=>d.accept());
  await page.getByRole('button',{name:'Revogar Consultar jornada assistencial',exact:true}).click();
  await page.getByText('Profissional B · Consultar jornada assistencial · Revogada',{exact:true}).waitFor();
  failure={code:'AUTHORITY_DENIED',status:403};
  await page.getByLabel('Capacidade',{exact:true}).selectOption('ASSISTENCIAL_LER');await page.getByLabel('Destinatário',{exact:true}).selectOption('13');
  await page.getByRole('button',{name:'Conceder capacidade selecionada',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'não possui autoridade'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Conceder capacidade selecionada',exact:true}).count(),0);
  failure=null;await page.getByRole('button',{name:'Atualizar estado',exact:true}).click();
  await page.getByLabel('Capacidade',{exact:true}).selectOption('ASSISTENCIAL_LER');await page.getByLabel('Destinatário',{exact:true}).selectOption('13');
  failure={code:'OPERATION_NOT_CONFIRMED',status:500};await page.getByRole('button',{name:'Conceder capacidade selecionada',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Novas escritas bloqueadas'}).waitFor();
  failure=null;await page.getByRole('button',{name:'Atualizar estado',exact:true}).click();
  await page.getByRole('button',{name:'Conceder capacidade selecionada',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Conceder capacidade selecionada',exact:true}).isDisabled(),true);
  actor='C';await page.goto(FRONT+'/operacao-assistencial?instituicao_id=4&contexto_id=9');await page.getByRole('alert').filter({hasText:'não autorizada'}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Estado operacional do contexto'}).count(),0);
  assert.equal(errors.length,0,errors.join('\n'));
  for(const c of calls.filter(c=>c.method==='POST')){assert.equal(c.query,'?instituicao_id=4');assert.ok(c.path.includes('/contextos/9/'));if(c.body){assert.equal('ator_usuario_id' in c.body,false);assert.equal('clinica_id' in c.body,false);}}
  console.log('PASS: ADMIN/A/D separated by backend actions, line-only activation, explicit bootstrap/participation/grants/revoke, double-submit, 403 fail closed, indeterminate write locked, unauthorized context denied, no implicit grants.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
