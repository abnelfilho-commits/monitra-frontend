const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.MENTAL_FRONT_URL || 'http://127.0.0.1:5177';
const scope={pessoa_id:18,pessoa:'Pessoa sintética',instituicao_id:5,instituicao:'Instituição Alfa',contexto_assistencial_id:9};
const other={...scope,instituicao_id:6,instituicao:'Instituição Beta',contexto_assistencial_id:10};
const session={...scope,sessao_id:40,data_agendada:'2026-10-13',hora_inicio:'09:00:00',hora_fim:'09:50:00',duracao_minutos:50,status:'AGENDADA',atividade:'Atividade sintética',pode_registrar:true};
const payload={resumo:{pessoas_em_acompanhamento:27,atendimentos_hoje:12,realizados_hoje:3,proximos_atendimentos:42},agenda_hoje:[session,{...session,sessao_id:41,hora_inicio:'11:00:00',pode_registrar:false}],proximos_atendimentos:[{...session,sessao_id:42,data_agendada:'2026-10-14',pode_registrar:false},{...session,sessao_id:43,data_agendada:'2026-10-15',hora_inicio:null}],pessoas_para_acompanhamento:[{pessoa_id:18,pessoa:scope.pessoa,evidencia_mais_recente:'2026-10-13T13:00:00Z',motivos:[{...scope,codigo:'APOIO_AUTORREFERIDO',data:'2026-10-13T13:00:00Z',fonte:'CHECKIN',referencia_id:1,dimensoes:[]},{...other,codigo:'INSTRUMENTO_REVISAO',data:'2026-10-12T13:00:00Z',fonte:'PHQ9',referencia_id:2,dimensoes:[]}]}],atividade_recente:[{...scope,tipo:'DIAGNOSTICO',referencia_id:1,data:'2026-10-13T00:00:00-04:00',precisao:'DATA'},{...other,tipo:'CHECKIN',referencia_id:2,data:'2026-10-13T13:00:00Z',precisao:'INSTANTE'}],metadados:{data_referencia:'2026-10-13',fuso:'America/Cuiaba',tem_mais:{agenda_hoje:true,pessoas_para_acompanhamento:true,atividade_recente:true}}};
(async()=>{
 payload.pessoas_para_acompanhamento[0].motivos.push({...scope,codigo:'MUDANCA_OBSERVACIONAL',data:'2026-10-11T13:00:00Z',referencia_id:3,dimensoes:['Bem-estar']});
 payload.pessoas_para_acompanhamento.push({pessoa_id:19,pessoa:'Outra pessoa sintética',evidencia_mais_recente:'2026-10-10T13:00:00Z',motivos:[{...scope,pessoa_id:19,codigo:'SESSAO_SEM_DESFECHO',data:'2026-10-10T13:00:00Z',referencia_id:4}]});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 let passed=0;
 try{
  const page=await browser.newPage({timezoneId:'Asia/Tokyo'});page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(60000);
  const calls=[],errors=[];let failure=0,empty=false,hold=false,releases=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());if(u.origin===FRONT)return route.continue();
   const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   calls.push({path:u.pathname,query:u.search,method:req.method()});
   if(u.pathname==='/me')return reply({id:99,nome:'Alex Sintético',perfil:'PROFISSIONAL',modulos:[]});
   if(u.pathname==='/saude-mental/instituicoes')return reply([{id:5,nome:'Instituição Alfa'},{id:6,nome:'Instituição Beta'}]);
   if(u.pathname==='/saude-mental/cockpit/profissional'){
    if(hold)await new Promise(r=>releases.push(r));
    if(failure)return reply({},failure);
    if(empty||u.searchParams.get('instituicao_id')==='6')return reply({...payload,resumo:{pessoas_em_acompanhamento:0,atendimentos_hoje:0,realizados_hoje:0,proximos_atendimentos:0},agenda_hoje:[],proximos_atendimentos:[],pessoas_para_acompanhamento:[],atividade_recente:[],metadados:{...payload.metadados,tem_mais:{}}});
    return reply(payload);
   }
   if(u.pathname==='/saude-mental/pessoas')return reply({itens:[],tem_mais:false});
   return reply({},403);
  });
  await page.goto(FRONT+'/saude-mental');
  await page.getByRole('heading',{name:/Alex Sintético!/}).waitFor();
  await page.getByRole('heading',{name:'Minha Agenda Hoje',exact:true}).waitFor();
  assert.equal(calls.find(c=>c.path.endsWith('/cockpit/profissional')).query,'');passed++;
  assert.deepEqual(await page.locator('.stat-card__value').allTextContents(),['27','12','3','42']);passed++;
  assert.equal(await page.getByRole('button',{name:'Registrar Atendimento',exact:true}).count(),2);passed++;
  assert.equal(await page.getByRole('link',{name:'Abrir Jornada · Contexto #9'}).first().getAttribute('href'),'/saude-mental/pessoas/18/contextos/9?instituicao_id=5');
  assert.equal(await page.getByRole('link',{name:'Abrir Jornada · Contexto #10'}).getAttribute('href'),'/saude-mental/pessoas/18/contextos/10?instituicao_id=6');passed++;
  assert.equal(await page.locator('.recent-activity__time').first().innerText(),'13/10/2026');
  assert.match(await page.locator('.recent-activity__time').nth(1).innerText(),/09:00/);passed++;
  assert.equal(await page.getByText('Há outros registros além desta lista limitada.',{exact:true}).count(),3);passed++;
  assert.equal(calls.filter(c=>/contextos|jornada/.test(c.path)).length,0);passed++;
  const groups=page.locator('.mental-cockpit-context');
  assert.equal(await groups.count(),3);
  assert.equal(await groups.nth(0).locator('li').count(),2);
  assert.equal(await groups.nth(0).getByText('Instituição Alfa · Contexto #9',{exact:true}).count(),1);
  assert.equal(await groups.nth(0).getByRole('link').count(),1);
  assert.deepEqual(await groups.nth(0).locator('time').evaluateAll(nodes=>nodes.map(n=>n.dateTime)),['2026-10-13T13:00:00Z','2026-10-11T13:00:00Z']);
  assert.equal(await groups.nth(0).getByText('Bem-estar',{exact:true}).count(),1);
  assert.equal(await groups.nth(2).getByRole('link').getAttribute('href'),'/saude-mental/pessoas/19/contextos/9?instituicao_id=5');passed++;
  const upcoming=page.locator('.mental-cockpit-session--compact');
  assert.equal(await upcoming.count(),2);
  assert.match(await upcoming.nth(0).innerText(),/14\/10\/2026.*09:00/);
  assert.match(await upcoming.nth(1).innerText(),/15\/10\/2026.*Horário não definido/);
  assert.equal(await upcoming.nth(0).getByRole('button',{name:'Registrar Atendimento',exact:true}).count(),0);
  assert.equal(await upcoming.nth(1).getByRole('button',{name:'Registrar Atendimento',exact:true}).count(),1);passed++;
  await upcoming.nth(1).getByRole('button',{name:'Registrar Atendimento',exact:true}).click();
  assert.match(page.url(),/sessoes-assistenciais\/43\/executar\?espaco=saude-mental$/);passed++;
  await page.goto(FRONT+'/saude-mental');await page.getByRole('heading',{name:'Minha Agenda Hoje',exact:true}).waitFor();
  fs.mkdirSync('/private/tmp/cockpit-refinement-visual',{recursive:true});
  for(const width of [1440,768,390]){
   await page.setViewportSize({width,height:1000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:`/private/tmp/cockpit-refinement-visual/cockpit-${width}.png`,fullPage:true});
  }passed++;
  await page.getByRole('button',{name:'Visualizar Sessão',exact:true}).first().click();
  assert.match(page.url(),/sessoes-assistenciais\/40\?espaco=saude-mental$/);passed++;
  await page.goto(FRONT+'/saude-mental');await page.getByRole('button',{name:'Registrar Atendimento',exact:true}).first().click();
  assert.match(page.url(),/sessoes-assistenciais\/40\/executar\?espaco=saude-mental$/);passed++;
  await page.goto(FRONT+'/saude-mental');await page.getByRole('link',{name:'Abrir Jornada · Contexto #10'}).click();
  assert.match(page.url(),/pessoas\/18\/contextos\/10\?instituicao_id=6$/);passed++;
  await page.goto(FRONT+'/saude-mental');await page.getByRole('link',{name:'Minhas Pessoas',exact:true}).click();
  await page.getByText('Selecione explicitamente uma instituição').waitFor();passed++;
  await page.goto(FRONT+'/saude-mental');await page.getByRole('heading',{name:'Minha Agenda Hoje',exact:true}).waitFor();
  hold=true;await page.getByLabel('Instituição (opcional)').selectOption('6');
  await page.getByText('Carregando Cockpit Saúde Mental…',{exact:true}).waitFor();
  assert.equal(await page.getByText('Pessoa sintética',{exact:true}).count(),0);
  hold=false;for(const release of releases)release();releases=[];
  await page.getByRole('heading',{name:'Nenhuma evidência de acompanhamento nesta consulta',exact:true}).waitFor();
  assert.deepEqual(await page.locator('.stat-card__value').allTextContents(),['0','0','0','0']);passed++;
  assert.ok(calls.some(c=>c.path.endsWith('/cockpit/profissional')&&c.query==='?instituicao_id=6'));passed++;
  for(const status of [401,403,422,500,503]){
   failure=status;await page.reload();await page.getByRole('alert').waitFor();
   assert.equal(await page.locator('.stat-card').count(),0);passed++;
  }
  failure=0;empty=true;await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();
  await page.getByRole('heading',{name:'Nenhuma novidade por enquanto',exact:true}).waitFor();passed++;
  assert.ok(calls.every(c=>c.method==='GET'));assert.equal(errors.length,0,errors.join('\n'));passed++;
  console.log(`PASS: ${passed} checks cockpit MH; read-only mocked HTTP, responsive 1440/768/390.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
