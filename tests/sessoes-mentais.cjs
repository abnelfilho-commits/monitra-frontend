const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const FRONT='http://127.0.0.1:5177';
(async()=>{
 const {sessionEvents}=await import('../src/pages/saudeMental/bemEstarPresentation.js');
 const event=sessionEvents([{id:1,status:'AGENDADA'},{id:2,status:'REALIZADA',registro_longitudinal_id:5,numero_sessao:2,narrativa:'Sessão realizada',profissional_id:5,autor_usuario_id:99,proximos_passos:[]}]);assert.equal(event.length,1);assert.equal(event[0].tipo,'Sessão assistencial');assert.equal(event[0].id,'SESSAO:2');

 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(12000);
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  const base='/saude-mental/pessoas/18/contextos/9';let rows=[{id:7,pts_id:1,objetivo_id:2,status:'PLANEJADO',quantidade_sessoes:52,atividade_nome:'Psicoterapia individual',ocupacao_nome:'Psicólogo',profissional_nome:'Executor institucional'}],allowed=true,writes=0,sessions=[];
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const req=route.request(),u=new URL(req.url());if(u.origin===FRONT)return route.continue();
   const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(u.pathname==='/me')return reply({id:99,nome:'Synthetic',perfil:'PROFISSIONAL',modulos:[]});
   assert.equal(u.searchParams.get('instituicao_id'),'5');assert.ok(u.pathname.startsWith(base));
   if(u.pathname===base)return reply({pessoa_id:18,nome_completo:'Pessoa teste',instituicao_id:5,instituicao_nome:'Instituição teste',contexto_assistencial_id:9,modulo_id:3,contexto_estado:'ABERTO',linha_estado:'ATIVA',data_inicio:'2026-01-01',bem_estar:{checkins:[],pode_registrar:allowed},sessoes:sessions.filter(s=>s.status==='REALIZADA')});
   if(u.pathname===base+'/pts')return reply({pode_registrar:allowed,itens:[{id:1,status:'ATIVO',data_inicio:'2026-01-01',objetivo_geral:'Plano profissional',objetivos:[{id:2,descricao:'Objetivo contextual',status:'ABERTO',prioridade:'ALTA'}]}]});
   if(u.pathname.endsWith('/catalogo-planejamento'))return reply({atividades:[{id:3,nome:'Psicoterapia individual'}],ocupacoes:[{id:4,nome:'Psicólogo'}],associacoes:[{atividade_id:3,ocupacao_id:4}],executores:[{profissional_id:5,nome:'Executor institucional',ocupacao_id:4,data_inicio:'2020-01-01',data_fim:null}]});
   if(u.pathname.endsWith('/calcular-quantidade')){const p=req.postDataJSON();return p.quantidade_sessoes>52?reply({detail:{message:'Quantidade manual incompatível com o período.'}},422):reply({quantidade_sessoes:p.quantidade_sessoes||52,quantidade_calculada:52,origem_quantidade:p.quantidade_sessoes?'MANUAL':'CALCULADA'});}
   assert.ok(u.pathname.includes('/pts/1/objetivos/2/planejamentos'));
   if(u.pathname.includes('/planejamentos/7/')) {
    if(req.method()==='POST') {
     assert.ok(allowed);writes++;
     if(u.pathname.endsWith('/cronograma')) {assert.equal(sessions.length,0);sessions=Array.from({length:52},(_,i)=>({id:i+1,numero_sessao:i+1,data_agendada:'2026-11-01',duracao_minutos:50,status:'AGENDADA',hora_inicio:null}));}
     else if(u.pathname.endsWith('/atendimento')) {assert.equal(req.postDataJSON().narrativa,'Atendimento teste');Object.assign(sessions[0],{registro_longitudinal_id:99,narrativa:'Atendimento teste',autor_usuario_id:99});}
     else {const action=req.postDataJSON().acao;sessions[0].status={confirmar:'CONFIRMADA',iniciar:'EM_ANDAMENTO',finalizar:'REALIZADA'}[action];}
    }
    return reply({quantidade_planejada:52,quantidade_materializada:sessions.length,pode_registrar:allowed,atividade:'Psicoterapia individual',ocupacao:'Psicólogo',profissional:'Executor institucional',sessoes:sessions,proposta:sessions.length?[]:Array.from({length:52},(_,i)=>({numero:i+1,data:'2026-11-01',duracao_minutos:50}))});
   }
   if(req.method()==='GET')return reply(rows);
   assert.ok(allowed);writes++;const p=req.postDataJSON();assert.ok(!('clinica_id' in p));assert.ok(!('paciente_id' in p));
   if(p.quantidade_sessoes>52)return reply({detail:{message:'Quantidade manual incompatível com o período.'}},422);
   rows=[{...p,id:7,pts_id:1,objetivo_id:2,status:'PLANEJADO',quantidade_sessoes:p.quantidade_sessoes||52,atividade_nome:'Psicoterapia individual',ocupacao_nome:'Psicólogo',profissional_nome:'Executor institucional'}];return reply(rows[0],req.method()==='POST'?201:200);
  });
  const url=FRONT+base+'/pts?instituicao_id=5';await page.goto(url);
  const open=async()=>{await page.getByRole('button',{name:'Consultar planejamentos',exact:true}).click();await page.getByRole('button',{name:'Consultar cronograma',exact:true}).click();};await open();
  await page.getByText('Planejado: 52 · Cronograma: 0',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Gerar cronograma',exact:true}).click();
  await page.getByText('Planejado: 52 · Cronograma: 52',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Gerar cronograma',exact:true}).count(),0);
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`overflow ${width}`);}
  await page.getByRole('button',{name:'Confirmar sessão 1',exact:true}).click();await page.getByRole('button',{name:'Iniciar sessão 1',exact:true}).click();await page.getByRole('button',{name:'Registrar atendimento 1',exact:true}).click();
  await page.getByLabel('Como foi o atendimento?',{exact:true}).fill('Atendimento teste');await page.getByRole('button',{name:'Salvar atendimento',exact:true}).click();await page.getByRole('button',{name:'Finalizar sessão 1',exact:true}).click();
  await page.getByText('REALIZADA',{exact:true}).waitFor();await page.reload();await open();await page.getByText('REALIZADA',{exact:true}).waitFor();
  await page.goto(FRONT+base+'?instituicao_id=5');await page.getByRole('button',{name:'Sessões',exact:true}).click();await page.getByText('Atendimento teste',{exact:true}).waitFor();await page.getByRole('button',{name:'Intervenções',exact:true}).click();await page.getByText('Nenhuma intervenção encontrada para este filtro.',{exact:true}).waitFor();
  allowed=false;await page.goto(url);await open();assert.ok(await page.getByRole('button',{name:'Confirmar sessão 2',exact:true}).isDisabled());assert.equal(writes,5);assert.deepEqual(errors,[]);
  console.log('SESSOES_MENTAIS_PASS: explicit generation, 52, no duplication, lifecycle, attendance, persisted reload, read-only, responsive.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
