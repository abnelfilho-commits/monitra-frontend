/* Browser regression with synthetic HTTP responses; no HML or external API. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT=process.env.COCKPIT_FRONT_URL || 'http://127.0.0.1:5176';
const neuro={care_line:'NEURO',total_pacientes:2,pacientes_prioritarios:[{paciente_id:11,nome:'Synthetic Neuro',risco_atual:'alto_risco',tendencia:'piora',status_resumido:'Neuro unchanged',pontuacao_risco:8}],atividades_recentes:[{id:1,paciente_id:11,paciente_nome:'Synthetic Neuro',tipo:'REGISTRO_DIARIO',data:'2026-09-20T12:00:00Z',descricao:'Synthetic Neuro activity'}]};
const cardio={care_line:'CARDIO',composition:{indicadores:{total_pacientes:3,critico:1,alto_risco:0,moderado:0,baixo:0,indisponivel:2},pacientes_criticos:[{id:22,nome:'Synthetic Cardio',risco:'critico',tendencia:null,motivo_principal:'RISCO_CLINICO_CRITICO',sinais:['RISCO_CLINICO_CRITICO'],continuidade:{classification:'REGULAR'},resumo:'Cardio preserved',ultima_atualizacao:'2026-07-08'}],pagination:{offset:0,limit:20,total:1},recent_activity:[],evolution:{com_registro:1,sem_registro:2},continuidade:{REGULAR:1,ATENCAO:0,CRITICA:0},capabilities:{daily_record:'ACTIVE',interventions:'ACTIVE',timeline:'ACTIVE'}}};
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 let passed=0;
 try {
  const page=await browser.newPage();page.setDefaultTimeout(10000);
  let role='PROFISSIONAL',cardioResponse=cardio,modules=[1,2],hold=null,sessionFailure=false,cockpitFailure=false,empty=false,sessionHold=false,sessionRows=[];const requests=[],errors=[],pending=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin===FRONT)return route.continue();
   requests.push(u.pathname+u.search);
   const json=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname==='/me')return json({id:99,nome:'Synthetic Professional',perfil:role,modulos:modules.map(id=>({id,nome:id===1?'Neurodesenvolvimento':'Cardiometabólico'}))});
   if(u.pathname==='/cockpit/profissional'){
    const line=u.searchParams.get('care_line');assert.ok(['1','2'].includes(line));
    if(line===hold){await new Promise(resolve=>pending.push(resolve));}
    if(cockpitFailure)return route.fulfill({status:500,contentType:'application/json',body:'{}'});
    return json(line==='1'?(empty?{...neuro,total_pacientes:0,pacientes_prioritarios:[],atividades_recentes:[]}: {...neuro,total_pacientes:7}):cardioResponse);
   }
   if(u.pathname==='/cardiometabolico/dashboard-analytics')return json(cardioResponse.composition);
   if(u.pathname==='/sessoes-assistenciais/minhas'){
    if(sessionHold)await new Promise(resolve=>pending.push(resolve));
    if(sessionFailure)return route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({detail:'Acesso negado (clínica diferente)'})});
    return json(sessionRows);
   }
   return json([]);
  });
  await page.goto(FRONT+'/dashboard');await page.getByRole('combobox',{name:'Linha de Cuidado ativa'}).waitFor();
  assert.equal(requests.filter(r=>r.startsWith('/cockpit/')).length,0);passed++;
  await page.getByRole('combobox').selectOption('1');
  await page.getByRole('heading',{name:'Synthetic Neuro',exact:true}).first().waitFor();
  assert.ok(requests.some(r=>r.includes('/cockpit/profissional?')&&r.includes('care_line=1')));
  assert.ok(requests.some(r=>r.includes('/sessoes-assistenciais/minhas')));passed++;
  const before=requests.length;
  await page.getByRole('combobox').selectOption('2');
  await page.getByRole('heading',{name:'Synthetic Cardio',exact:true}).first().waitFor();
  assert.equal(await page.getByRole('heading',{name:'Synthetic Neuro',exact:true}).count(),0);
  assert.ok(requests.slice(before).some(r=>r.includes('care_line=2')));
  assert.ok(!requests.slice(before).some(r=>/sessoes|pts|agenda|analytics/.test(r)));
  for(const name of ['PTS','Planejamento PTS','Agenda','Sessões Assistenciais'])assert.equal(await page.getByRole('button',{name,exact:true}).count(),0);
  await page.getByText('Tendência: indisponível',{exact:true}).first().waitFor();passed++;
  await page.getByRole('button',{name:'Abrir prontuário',exact:true}).click();
  assert.ok(page.url().endsWith('/cardiometabolico/pacientes/22'));passed++;
  await page.goto(FRONT+'/dashboard?care_line=1');await page.getByRole('heading',{name:'Synthetic Neuro',exact:true}).first().waitFor();
  await page.getByRole('button',{name:'Ver prontuário',exact:true}).click();
  assert.ok(page.url().endsWith('/pacientes/11?care_line=1'));passed++;
  // A pending Neuro response must never overwrite a later Cardio selection.
  hold='1';await page.goto(FRONT+'/dashboard?care_line=1');
  await page.waitForFunction(()=>document.querySelector('select')?.value==='1');
  while(!pending.length)await new Promise(resolve=>setTimeout(resolve,20));
  await page.getByRole('combobox').selectOption('2');await page.getByRole('heading',{name:'Synthetic Cardio',exact:true}).first().waitFor();
  hold=null;pending.splice(0).forEach(resolve=>resolve());
  await page.waitForTimeout(150);
  assert.equal(await page.getByRole('heading',{name:'Synthetic Neuro',exact:true}).count(),0);
  assert.equal(await page.getByRole('heading',{name:'Synthetic Cardio',exact:true}).count(),1);passed++;
  // Inverse delayed response and explicit selection for single-line profiles.
  hold='2';await page.getByRole('combobox').selectOption('1');await page.getByRole('heading',{name:'Synthetic Neuro',exact:true}).first().waitFor();
  await page.getByRole('combobox').selectOption('2');
  while(!pending.length)await new Promise(resolve=>setTimeout(resolve,20));
  await page.getByRole('combobox').selectOption('1');await page.getByRole('heading',{name:'Synthetic Neuro',exact:true}).first().waitFor();
  hold=null;pending.splice(0).forEach(resolve=>resolve());await page.waitForTimeout(150);
  assert.equal(await page.getByRole('heading',{name:'Synthetic Cardio',exact:true}).count(),0);passed++;
  for(const id of [1,2]){
   modules=[id];const start=requests.length;
   await page.goto(FRONT+'/dashboard');await page.getByRole('combobox').waitFor();
   assert.equal(requests.slice(start).filter(r=>r.startsWith('/cockpit/')).length,0);
   await page.getByRole('combobox').selectOption(String(id));
   await page.getByRole('heading',{name:id===1?'Synthetic Neuro':'Synthetic Cardio',exact:true}).first().waitFor();
   assert.equal(await page.locator('select option').count(),2);passed++;
  }
  modules=[1,2];sessionFailure=true;
  await page.goto(FRONT+'/dashboard?care_line=1');
  await page.getByText('Agenda Assistencial indisponível.',{exact:false}).waitFor();
  assert.match(await page.locator('.welcome-widget__message').innerText(),/7 pacientes/);
  await page.getByRole('heading',{name:'Synthetic Neuro',exact:true}).first().waitFor();
  await page.getByText('Synthetic Neuro activity',{exact:false}).first().waitFor();
  assert.equal(await page.getByText('Tudo tranquilo por enquanto',{exact:false}).count(),0);passed++;
  // A pending auxiliary request cannot hold back successful cockpit data.
  sessionHold=true;
  await page.goto(FRONT+'/dashboard?care_line=1');
  await page.getByRole('heading',{name:'Synthetic Neuro',exact:true}).first().waitFor();
  assert.match(await page.locator('.welcome-widget__message').innerText(),/7 pacientes/);
  await page.getByText('Carregando Agenda Assistencial...',{exact:true}).waitFor();
  sessionHold=false;pending.splice(0).forEach(resolve=>resolve());
  await page.getByText('Agenda Assistencial indisponível.',{exact:false}).waitFor();passed++;
  sessionFailure=false;empty=true;
  await page.goto(FRONT+'/dashboard?care_line=1');
  await page.getByText('Nenhuma sessão na Agenda Assistencial.',{exact:true}).waitFor();
  assert.match(await page.locator('.welcome-widget__message').innerText(),/0 pacientes/);
  assert.equal(await page.getByRole('alert').count(),0);passed++;
  cockpitFailure=true;
  await page.goto(FRONT+'/dashboard?care_line=1');
  await page.getByText('Não foi possível carregar os pacientes, prioridades e atividades do Cockpit.',{exact:true}).waitFor();
  assert.equal(await page.locator('.welcome-widget__message').count(),0);
  assert.equal(await page.getByText('Tudo tranquilo por enquanto',{exact:false}).count(),0);
  await page.getByText('Nenhuma sessão na Agenda Assistencial.',{exact:true}).waitFor();passed++;
  sessionRows=[{id:91,paciente:'Synthetic scheduled',data_agendada:'2099-01-01',hora_inicio:'10:00',status:'AGENDADA',atividade:'Synthetic activity'}];
  await page.goto(FRONT+'/dashboard?care_line=1');
  await page.getByText('Não foi possível carregar os pacientes, prioridades e atividades do Cockpit.',{exact:true}).waitFor();
  await page.getByText('Próximo atendimento',{exact:true}).waitFor();
  await page.getByText('Synthetic scheduled',{exact:false}).waitFor();passed++;
  cockpitFailure=false;empty=false;
  await page.goto(FRONT+'/dashboard?care_line=1');
  await page.getByRole('heading',{name:'Synthetic Neuro',exact:true}).first().waitFor();
  await page.getByText('Synthetic scheduled',{exact:false}).waitFor();
  assert.match(await page.locator('.welcome-widget__message').innerText(),/7 pacientes/);
  assert.equal(await page.getByRole('alert').count(),0);passed++;
  for(const line of ['1','2']){
   await page.goto(FRONT+`/dashboard?care_line=${line}`);
   await page.getByRole('heading',{name:line==='1'?'Synthetic Neuro':'Synthetic Cardio',exact:true}).first().waitFor();
   await page.getByRole('button',{name:'Cockpit Assistencial',exact:true}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Cockpit Neuro',exact:true}).count(),0);
   assert.equal(new URL(page.url()).searchParams.get('care_line'),line);passed++;
  }
  // Presentation must preserve payloads, authorization and pagination.
  modules=[1];const unauthorizedStart=requests.length;
  await page.goto(FRONT+'/dashboard?care_line=2');
  await page.getByText('Selecione uma Linha de Cuidado autorizada para abrir o Cockpit.',{exact:true}).waitFor();
  assert.equal(requests.slice(unauthorizedStart).filter(r=>r.startsWith('/cockpit/')).length,0);passed++;
  modules=[1,2];
  await page.goto(FRONT+'/dashboard?care_line=2');
  await page.getByText('Último registro clínico: 08/07/2026',{exact:true}).waitFor();
  assert.equal(cardio.composition.pacientes_criticos[0].ultima_atualizacao,'2026-07-08');
  await page.getByText('Risco clínico: critico · Continuidade: REGULAR',{exact:true}).waitFor();passed++;
  cardioResponse=structuredClone(cardio);cardioResponse.composition.pagination.total=21;
  await page.reload();await page.getByRole('button',{name:'Próxima',exact:true}).click();
  await page.getByRole('heading',{name:'Synthetic Cardio',exact:true}).waitFor();
  assert.ok(requests.some(r=>r.includes('care_line=2')&&r.includes('offset=20')&&r.includes('limit=20')));
  assert.equal(await page.getByRole('button',{name:'Próxima',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Anterior',exact:true}).click();
  await page.getByRole('heading',{name:'Synthetic Cardio',exact:true}).waitFor();passed++;
  cardioResponse=structuredClone(cardio);
  cardioResponse.composition.pacientes_criticos=[];
  cardioResponse.composition.capabilities={daily_record:'PLANNED',interventions:'UNAVAILABLE',timeline:'UNAVAILABLE'};
  await page.goto(FRONT+'/dashboard?care_line=2');
  await page.getByText('Nenhum paciente prioritário nesta página.',{exact:true}).waitFor();
  for(const name of ['Registro Diário','Intervenções'])assert.equal(await page.getByRole('button',{name,exact:true}).count(),0);
  assert.equal(await page.getByRole('heading',{name:'Atividade recente',exact:true}).count(),0);passed++;
  cockpitFailure=true;await page.reload();
  await page.getByRole('alert').filter({hasText:'Não foi possível carregar o Cockpit.'}).waitFor();
  await page.getByRole('heading',{name:'Bem-vindo ao Cockpit Cardiometabólico'}).waitFor();
  assert.equal(await page.locator('.stat-card').count(),0);passed++;
  cockpitFailure=false;cardioResponse=structuredClone(cardio);
  cardioResponse.composition.pacientes_criticos[0].risco=null;
  cardioResponse.composition.pacientes_criticos[0].ultima_atualizacao=null;
  await page.reload();await page.getByText('Último registro clínico: Não iniciado',{exact:true}).waitFor();
  await page.getByText('Risco clínico: Indisponível · Continuidade: REGULAR',{exact:true}).waitFor();passed++;
  for(const width of [390,1280]){
   await page.setViewportSize({width,height:900});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.locator('select').focus();assert.equal(await page.locator('select').evaluate(el=>el===document.activeElement),true);
   await page.screenshot({path:`/private/tmp/cardio-ux-${width}.png`,fullPage:true});
  }passed++;
  for(const date of ['2026-09-21','2026-06-30']){
   cardioResponse.composition.pacientes_criticos[0].ultima_atualizacao=date;
   await page.reload();await page.getByText(`Último registro clínico: ${date.split('-').reverse().join('/')}`,{exact:true}).waitFor();
  }passed++;
  for(const profile of ['ADMIN','ADMIN_CLINICA']){
   role=profile;
   await page.goto(FRONT+'/pacientes');
   await page.getByRole('button',{name:'Cockpit Neuro',exact:true}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Cockpit Assistencial',exact:true}).count(),0);passed++;
   const start=requests.length;
   await page.goto(FRONT+'/cardiometabolico');
   await page.getByRole('heading',{name:'Synthetic Cardio',exact:true}).waitFor();
   assert.ok(requests.slice(start).some(r=>r.startsWith('/cardiometabolico/dashboard-analytics')));
   assert.ok(!requests.slice(start).some(r=>r.startsWith('/cockpit/profissional')));passed++;
  }
  assert.deepEqual(errors,[]);console.log(`PASS: ${passed} browser scenarios; explicit context, isolation, widgets, links, delayed responses, single/multi-line.`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
