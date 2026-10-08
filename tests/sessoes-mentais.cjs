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
  const base='/saude-mental/pessoas/18/contextos/9';let rows=[{id:7,pts_id:1,objetivo_id:2,status:'PLANEJADO',quantidade_sessoes:52,duracao_minutos:50,data_inicio:'2026-11-01',data_fim:'2027-04-30',atividade_nome:'Psicoterapia individual',ocupacao_nome:'Psicólogo',profissional_nome:'Executor institucional'}],allowed=true,writes=0,sessions=[],failFinalize=true;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const req=route.request(),u=new URL(req.url());if(u.origin===FRONT)return route.continue();
   const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(u.pathname==='/me')return reply({id:99,nome:'Synthetic',perfil:'PROFISSIONAL',modulos:[]});
   if(u.pathname.startsWith('/sessoes-assistenciais')) {
    const contextual={id:9,instituicao_id:5,instituicao:'Instituição teste',modulo_id:3,pts_id:1};
    if(u.pathname.endsWith('/minhas'))return reply(sessions.map(s=>({...s,pessoa:'Pessoa teste',contexto:contextual,pode_registrar:allowed,atividade:'Psicoterapia individual'})));
    const session=sessions[0];
    if(req.method()==='POST') {
     assert.ok(allowed);writes++;
     if(u.pathname.endsWith('/registrar-atendimento')){assert.equal(req.postDataJSON().narrativa,'Atendimento teste');assert.deepEqual(req.postDataJSON().proximos_passos,['retornoAntecipado']);Object.assign(session,{proximos_passos:req.postDataJSON().proximos_passos,registro_longitudinal_id:99,narrativa:'Atendimento teste',autor_usuario_id:99});return reply({success:true,sessao_id:1,registro_id:99});}
     if(u.pathname.endsWith('/finalizar') && failFinalize){failFinalize=false;return reply({detail:'Finalização temporariamente indisponível'},409);}
     session.status={confirmar:'CONFIRMADA',iniciar:'EM_ANDAMENTO',finalizar:'REALIZADA'}[u.pathname.split('/').pop()];return reply(session);
    }
    return reply({sessao:{id:1,numero:1,status:session.status,data:session.data_agendada,hora_inicio:session.hora_inicio,hora_fim:session.hora_fim,duracao_minutos:50},pessoa:{id:18,nome:'Pessoa teste'},contexto:contextual,pode_registrar:allowed,objetivo:{id:2,descricao:'Objetivo contextual'},atividade:{id:3,nome:'Psicoterapia individual'},profissional:{id:5,nome:'Executor institucional',ocupacao:'Psicólogo'},registro_longitudinal:session.registro_longitudinal_id?{id:99,data:session.data_agendada,origem:'PROFISSIONAL'}:null,narrativa:session.narrativa,proximos_passos:session.proximos_passos || [],autor_usuario_id:99,avaliacoes:[],intervencoes:[],resumo:{titulo:'Sessão nº 1',descricao:'Atividade contextual',avaliacoes_realizadas:0,intervencoes:0,registro_realizado:Boolean(session.registro_longitudinal_id),total_sessoes:52,sessoes_realizadas:session.status==='REALIZADA'?1:0,percentual_conclusao:0}});
   }
   assert.equal(u.searchParams.get('instituicao_id'),'5');assert.ok(u.pathname.startsWith(base));
   if(u.pathname===base)return reply({pessoa_id:18,nome_completo:'Pessoa teste',instituicao_id:5,instituicao_nome:'Instituição teste',contexto_assistencial_id:9,modulo_id:3,contexto_estado:'ABERTO',linha_estado:'ATIVA',data_inicio:'2026-01-01',bem_estar:{checkins:[],pode_registrar:allowed},sessoes:sessions.filter(s=>s.status==='REALIZADA')});
   if(u.pathname===base+'/pts')return reply({pode_registrar:allowed,itens:[{id:1,status:'ATIVO',data_inicio:'2026-01-01',objetivo_geral:'Plano profissional',objetivos:[{id:2,descricao:'Objetivo contextual',status:'ABERTO',prioridade:'ALTA'}]}]});
   if(u.pathname.endsWith('/catalogo-planejamento'))return reply({atividades:[{id:3,nome:'Psicoterapia individual'}],ocupacoes:[{id:4,nome:'Psicólogo'}],associacoes:[{atividade_id:3,ocupacao_id:4}],executores:[{profissional_id:5,nome:'Executor institucional',ocupacao_id:4,data_inicio:'2020-01-01',data_fim:null}]});
   if(u.pathname.endsWith('/calcular-quantidade')){const p=req.postDataJSON();return p.quantidade_sessoes>52?reply({detail:{message:'Quantidade manual incompatível com o período.'}},422):reply({quantidade_sessoes:p.quantidade_sessoes||52,quantidade_calculada:52,origem_quantidade:p.quantidade_sessoes?'MANUAL':'CALCULADA'});}
   assert.ok(u.pathname.includes('/pts/1/objetivos/2/planejamentos'));
   if(u.pathname.includes('/planejamentos/7/')) {
    if(req.method()==='POST') {
     assert.ok(allowed);writes++;
     if(u.pathname.endsWith('/cronograma')) {assert.equal(sessions.length,0);sessions=req.postDataJSON().cronograma.map((s,i)=>({id:i+1,numero_sessao:s.numero,data_agendada:s.data,duracao_minutos:50,status:'AGENDADA',hora_inicio:s.hora_inicio,hora_fim:s.hora_fim}));assert.equal(sessions.length,52);assert.equal(sessions[0].hora_inicio,'09:00');}
     else if(u.pathname.endsWith('/atendimento')) {assert.equal(req.postDataJSON().narrativa,'Atendimento teste');Object.assign(sessions[0],{registro_longitudinal_id:99,narrativa:'Atendimento teste',autor_usuario_id:99});}
     else {const action=req.postDataJSON().acao;sessions[0].status={confirmar:'CONFIRMADA',iniciar:'EM_ANDAMENTO',finalizar:'REALIZADA'}[action];}
    }
    return reply({quantidade_planejada:52,quantidade_materializada:sessions.length,pode_registrar:allowed,atividade:'Psicoterapia individual',ocupacao:'Psicólogo',profissional:'Executor institucional',sessoes:sessions,proposta:sessions.length?[]:Array.from({length:52},(_,i)=>({numero:i+1,data:new Date(Date.UTC(2026,10,1+i*3)).toISOString().slice(0,10),duracao_minutos:50}))});
   }
   if(req.method()==='GET')return reply(rows);
   assert.ok(allowed);writes++;const p=req.postDataJSON();assert.ok(!('clinica_id' in p));assert.ok(!('paciente_id' in p));
   if(p.quantidade_sessoes>52)return reply({detail:{message:'Quantidade manual incompatível com o período.'}},422);
   rows=[{...p,id:7,pts_id:1,objetivo_id:2,status:'PLANEJADO',quantidade_sessoes:p.quantidade_sessoes||52,atividade_nome:'Psicoterapia individual',ocupacao_nome:'Psicólogo',profissional_nome:'Executor institucional'}];return reply(rows[0],req.method()==='POST'?201:200);
  });
  const url=FRONT+base+'/pts?instituicao_id=5';await page.goto(url);
  const open=async()=>{await page.getByRole('button',{name:'Planejar Atividade',exact:true}).click();await page.getByRole('button',{name:'Sugerir Cronograma',exact:true}).click();};await open();
  await page.getByText('Planejado: 52 · Cronograma: 0',{exact:true}).waitFor();
  assert.equal(sessions.length,0);assert.equal(await page.getByLabel('Início sessão 1',{exact:true}).inputValue(),'');
  for(let i=1;i<=52;i++){await page.getByLabel(`Início sessão ${i}`,{exact:true}).fill('09:00');await page.getByLabel(`Fim sessão ${i}`,{exact:true}).fill('09:50');}
  const responsive=async(label)=>{for(const width of [1440,768,390]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`overflow ${label} ${width}`);await page.screenshot({path:`/tmp/contextual-${label}-${width}.png`,fullPage:true});}};
  await responsive('schedule');
  await page.getByRole('button',{name:'Confirmar Cronograma',exact:true}).click();
  await page.getByText('Planejado: 52 · Cronograma: 52',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Confirmar sessão 1',exact:true}).count(),0);
  await page.getByRole('link',{name:'Abrir Agenda Assistencial',exact:true}).click();
  await page.getByRole('button',{name:'Visualizar Sessão',exact:true}).first().waitFor();await responsive('agenda');
  await page.getByRole('button',{name:'Visualizar Sessão',exact:true}).first().click();
  await page.getByRole('heading',{name:'Sessão nº 1',exact:true}).waitFor();await responsive('session');
  await page.getByRole('button',{name:'Registrar Atendimento',exact:true}).click();
  await page.getByLabel('Como foi o atendimento?',{exact:true}).fill('Atendimento teste');await responsive('attendance');
  await page.getByRole('button',{name:/Retorno antecipado/}).click();
  await page.getByRole('button',{name:'Finalizar Atendimento'}).click();
  await page.getByText('Finalização temporariamente indisponível',{exact:true}).waitFor();await page.reload();
  await page.getByText('Atendimento já registrado. Finalize a sessão para concluir.',{exact:true}).waitFor();assert.ok(await page.getByLabel('Como foi o atendimento?',{exact:true}).isDisabled());await page.getByText('Retorno antecipado',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Finalizar Atendimento'}).click();
  await page.waitForURL(u=>u.pathname==='/sessoes-assistenciais/1');await page.getByText('Atendimento teste',{exact:true}).waitFor();await page.reload();await page.getByText('Atendimento teste',{exact:true}).waitFor().catch(async e=>{console.error(errors,await page.locator('body').innerText());throw e;});
  await page.getByRole('button',{name:'Voltar ao prontuário',exact:true}).click();
  await page.goto(FRONT+base+'?instituicao_id=5');await page.getByRole('button',{name:'Sessões',exact:true}).click();await page.getByText('Atendimento teste',{exact:true}).waitFor();await page.getByRole('button',{name:'Intervenções',exact:true}).click();await page.getByText('Nenhuma intervenção encontrada para este filtro.',{exact:true}).waitFor();
  allowed=false;sessions[0].status='CONFIRMADA';await page.goto(FRONT+'/sessoes-assistenciais/1?espaco=saude-mental');await page.getByText('Atendimento teste',{exact:true}).waitFor();assert.ok(await page.getByRole('button',{name:'Registrar Atendimento',exact:true}).isDisabled());await page.goto(url);await open();assert.equal(await page.getByRole('button',{name:'Confirmar Cronograma',exact:true}).count(),0);assert.equal(writes,6);assert.deepEqual(errors,[]);
  console.log('SESSOES_MENTAIS_PASS: explicit generation, 52, no duplication, lifecycle, attendance, persisted reload, read-only, responsive.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
