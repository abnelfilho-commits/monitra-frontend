/* Synthetic HTTP contracts for presentation only. No database or HML access. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.COCKPIT_FRONT_URL || 'http://127.0.0.1:5176';
const ARTIFACTS = '/private/tmp/cardio-cockpit-v2';
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const timelinePath = 'src/pages/cardiometabolico/TimelineCardiometabolico.jsx';
assert.equal(fs.readFileSync(timelinePath, 'utf8'), execFileSync('git', ['show', `HEAD:${timelinePath}`], { encoding: 'utf8' }));
const reasons = ['RISCO_CLINICO_CRITICO','RISCO_CLINICO_ALTO','CONTINUIDADE_CRITICA','RISCO_CLINICO_MODERADO','CONTINUIDADE_ATENCAO'];
function patient(id, nome, risco, classification, sinais, measurements = {}) {
 return {id,nome,risco,continuidade:{classification},sinais,motivo_principal:sinais[0],
  ultima_atualizacao:'2026-09-21',tendencia:null,resumo:'Not a UI explanation',...measurements};
}
// Declared response examples, not modifications to engine or persisted results.
const patients = [
 patient(21,'Paciente sintético A','critico','REGULAR',[reasons[0]],{glicemia:250,pressao:'180x120',peso:120,imc:37,imc_availability:'available'}),
 patient(22,'Paciente sintético B','alto','ATENCAO',[reasons[1],reasons[4]],{glicemia:250,pressao:'140x90',peso:80}),
 patient(23,'Paciente sintético C','baixo','CRITICA',[reasons[2]],{glicemia:100,pressao:'120x80',peso:80}),
 patient(24,'Paciente sintético D','moderado','CRITICA',[reasons[2],reasons[3]],{glicemia:180}),
 patient(25,'Paciente sintético E','moderado','REGULAR',[reasons[3]],{glicemia:180}),
 {...patient(26,'Paciente sintético F',null,'ATENCAO',[reasons[4]]),ultima_atualizacao:'2026-09-16'},
];
const events = [
 {id:'LONGITUDINAL_RECORD:1',tipo:'Registro diário',nome:'Paciente sintético A',data:'2026-09-21',created_at:'2026-09-22T12:00:00Z',origem:'RESPONSAVEL_APP',actor:{namespace:'responsaveis',id:91},metadata:{observacoes:'Observação sintética',answers:[{field_id:1,name:'peso',values:{valor_numero:120}}]}},
 {id:'GENERIC_INTERVENTION:1',tipo:'Intervenção',nome:'Paciente sintético B',data:'2026-09-20',created_at:'2026-09-20T12:00:00Z',actor:{namespace:'usuarios',id:92},descricao:'Intervenção genérica sintética'},
 {id:'CARDIO_INTERVENTION:1',tipo:'Intervenção',nome:'Paciente sintético C',data:null,created_at:'2026-09-19T12:00:00Z',actor:null,descricao:'Intervenção Cardio sintética'},
 {id:'DIAGNOSIS:1',tipo:'Diagnóstico',nome:'Paciente sintético D',data:'2026-09-18',actor:{namespace:'authored_physician',id:null,name:'Médico sintético'},metadata:{cid:'CID sintético'}},
];
const base = {indicadores:{total_pacientes:8,critico:1,alto_risco:1,moderado:2,baixo:2,indisponivel:2},
 continuidade:{REGULAR:3,ATENCAO:2,CRITICA:2,NAO_INICIADA:1},pacientes_criticos:patients,
 pagination:{offset:0,limit:20,total:6},recent_activity:events,evolution:{com_registro:7,sem_registro:1},
 capabilities:{timeline:'ACTIVE',daily_record:'ACTIVE',interventions:'ACTIVE'}};
(async()=>{
 fs.mkdirSync(ARTIFACTS,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:1000}});page.setDefaultTimeout(10000);
 let response=structuredClone(base),failure=false,hold=false,pending=[],passed=0;
 const errors=[],requests=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
 await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.origin===FRONT)return route.continue();
  requests.push(u.pathname+u.search);
  const json=data=>route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  if(u.pathname==='/me')return json({id:99,nome:'Profissional sintético',perfil:'PROFISSIONAL',modulos:[{id:2,nome:'Cardiometabólico'}]});
  if(u.pathname==='/cockpit/profissional'){
   assert.equal(u.searchParams.get('care_line'),'2');assert.equal(u.searchParams.get('limit'),'20');
   if(hold)await new Promise(resolve=>pending.push(resolve));
   if(failure)return route.fulfill({status:500,contentType:'application/json',body:'{}'});
   return json({care_line:'CARDIO',composition:{...response,pagination:{...response.pagination,offset:Number(u.searchParams.get('offset'))}}});
  }
  if(u.pathname==='/cardiometabolico/pacientes/21')return json({id:21,nome:patients[0].nome,ativo:true});
  return json([]);
 });
 const section=title=>page.locator('.cardio-v2 .card-widget').filter({has:page.getByRole('heading',{name:title,exact:true})});
 const load=async()=>{await page.goto(FRONT+'/dashboard?care_line=2');await page.getByRole('heading',{name:'Panorama da população',exact:true}).waitFor();};
 try {
  await load();
  assert.deepEqual(await page.locator('.cardio-v2 .widget-header__title').allTextContents(),['Panorama da população','Continuidade do acompanhamento','Sua atenção hoje','Atividade recente','Acompanhamento da população']);passed++;
  const panorama=section('Panorama da população');
  assert.deepEqual(await panorama.locator('.stat-card__value').allTextContents(),['8','1','1','2','2','2']);
  assert.match(await panorama.innerText(),/não significa baixo risco/);passed++;
  assert.deepEqual(await section('Continuidade do acompanhamento').locator('dd').allTextContents(),['3','2','2','1']);passed++;
  assert.deepEqual(await page.locator('.cardio-v2-patient h3').allTextContents(),patients.map(p=>p.nome));
  assert.equal(await page.locator('.cardio-v2-patient').count(),6);passed++;
  const rows=page.locator('.cardio-v2-patient');
  assert.match(await rows.nth(0).innerText(),/Risco clínico: Crítico/);
  assert.match(await rows.nth(0).innerText(),/Continuidade: Regular/);
  assert.equal(await rows.nth(2).locator('.cardio-v2-reason').innerText(),'Continuidade crítica');
  assert.match(await rows.nth(2).innerText(),/Risco clínico: Baixo/);passed++;
  assert.equal(await rows.nth(3).locator('.cardio-v2-reason').innerText(),'Continuidade crítica');
  assert.equal(await rows.nth(3).locator('li').innerText(),'Risco clínico moderado');passed++;
  assert.equal(await rows.nth(1).locator('li').innerText(),'Continuidade em atenção');passed++;
  assert.match(await rows.nth(5).innerText(),/Risco clínico: Sem leitura/);passed++;
  assert.deepEqual(await rows.nth(0).locator('dd').allTextContents(),['250','180x120','120','37']);passed++;
  assert.deepEqual(await rows.nth(3).locator('dd').allTextContents(),['180','Não disponível','Não disponível','Não disponível']);passed++;
  assert.deepEqual(await rows.nth(5).locator('dd').allTextContents(),Array(4).fill('Não disponível'));passed++;
  assert.match(await rows.nth(0).innerText(),/Último registro clínico: 21\/09\/2026/);passed++;
  assert.equal(await page.locator('.cardio-v2-events article').count(),4);
  const cardioEvent=page.locator('.cardio-v2-events article').nth(2);
  assert.match(await cardioEvent.innerText(),/Data clínica não informada/);
  assert.match(await cardioEvent.innerText(),/Registrado em:/);
  assert.match(await cardioEvent.innerText(),/Autoria não disponível/);passed++;
  assert.match(await page.locator('.cardio-v2-events article').first().innerText(),/Canal: RESPONSAVEL_APP/);
  assert.match(await page.locator('.cardio-v2-events article').first().innerText(),/Autoria: responsaveis #91/);passed++;
  assert.match(await section('Atividade recente').innerText(),/Veja o que aconteceu recentemente com seus pacientes\./);
  assert.deepEqual(await page.locator('.cardio-v2-events h3').allTextContents(),events.map(event=>`${event.tipo} — ${event.nome}`));
  assert.equal(await page.locator('.cardio-v2-events details').count(),0);passed++;
  const coverage=section('Acompanhamento da população');
  assert.deepEqual(await coverage.locator('.stat-card__value').allTextContents(),['7','1']);
  assert.doesNotMatch(await coverage.innerText(),/Regular|Crítica|Atenção|Não iniciada/);passed++;
  assert.equal(await page.getByRole('heading',{name:'Ações rápidas',exact:true}).count(),0);
  assert.doesNotMatch(await page.locator('.cardio-v2').innerText(),/hipertenso|obeso|piora|melhora|estabilidade|Tendência:|Not a UI explanation/i);passed++;
  for(const width of [1280,768,390]){
   await page.setViewportSize({width,height:1000});
   const fits=await page.locator('.cardio-v2').evaluate(el=>el.scrollWidth<=el.clientWidth);
   if(width>=768)assert.equal(fits,true);
   else console.log('390px integrated shell: content fits =',fits,'(fixed sidebar unchanged)');
   await rows.first().getByRole('button',{name:'Abrir prontuário'}).focus();
   assert.equal(await rows.first().getByRole('button').evaluate(el=>el===document.activeElement),true);
   await page.screenshot({path:`${ARTIFACTS}/population-${width}.png`,fullPage:true});passed++;
  }
  await page.setViewportSize({width:1280,height:1000});
  await rows.first().getByRole('button',{name:'Abrir prontuário'}).click();
  assert.equal(new URL(page.url()).pathname,'/cardiometabolico/pacientes/21');
  assert.equal(new URL(page.url()).searchParams.get('care_line'),'2');passed++;
  response=structuredClone(base);response.pacientes_criticos[0].imc_availability='unavailable_same_observation_units_required';
  await load();assert.equal(await rows.first().locator('dd').last().innerText(),'Não disponível');passed++;
  response=structuredClone(base);response.pagination.total=41;
  await load();await page.getByRole('button',{name:'Próxima',exact:true}).click();
  await page.getByRole('heading',{name:'Sua atenção hoje',exact:true}).waitFor();
  assert.ok(requests.at(-1).includes('offset=20'));passed++;
  await page.getByRole('button',{name:'Próxima',exact:true}).click();
  await page.getByRole('heading',{name:'Sua atenção hoje',exact:true}).waitFor();
  assert.ok(requests.at(-1).includes('offset=40'));assert.equal(await page.getByRole('button',{name:'Próxima',exact:true}).isDisabled(),true);passed++;
  await page.getByRole('button',{name:'Anterior',exact:true}).click();
  await page.getByRole('heading',{name:'Sua atenção hoje',exact:true}).waitFor();
  assert.ok(requests.at(-1).includes('offset=20'));passed++;
  failure=true;await page.getByRole('button',{name:'Próxima',exact:true}).click();
  await page.getByRole('alert').waitFor();assert.equal(await page.locator('.cardio-v2 .stat-card').count(),0);passed++;
  failure=false;await page.getByRole('button',{name:'Voltar à primeira página',exact:true}).click();
  await page.getByRole('heading',{name:'Sua atenção hoje',exact:true}).waitFor();
  await page.getByRole('button',{name:'Próxima',exact:true}).click();await page.getByRole('heading',{name:'Sua atenção hoje',exact:true}).waitFor();
  await page.getByRole('button',{name:'Próxima',exact:true}).click();await page.getByRole('heading',{name:'Sua atenção hoje',exact:true}).waitFor();
  assert.equal(await page.getByRole('alert').count(),0);passed++;
  // Visual states; no zeros during loading/error. Screenshots remain outside the repository.
  for(const width of [1280,768,390]){
   await page.setViewportSize({width,height:1000});
   response=structuredClone(base);response.indicadores=Object.fromEntries(Object.keys(base.indicadores).map(k=>[k,0]));
   response.continuidade=Object.fromEntries(Object.keys(base.continuidade).map(k=>[k,0]));
   response.evolution={com_registro:0,sem_registro:0};response.pacientes_criticos=[];response.recent_activity=[];response.pagination.total=0;
   await load();await page.getByText('Nenhum paciente ativo nesta Linha no seu escopo',{exact:true}).waitFor({state:width===390?'attached':'visible'});
   assert.deepEqual(await panorama.locator('.stat-card__value').allTextContents(),Array(6).fill('0'));
   assert.equal(await page.getByRole('button',{name:'Próxima',exact:true}).isDisabled(),true);
   await page.getByText('Nenhum evento encontrado.',{exact:true}).waitFor();
   await page.screenshot({path:`${ARTIFACTS}/zero-${width}.png`,fullPage:true});passed++;
   hold=true;await page.goto(FRONT+'/dashboard?care_line=2');await page.getByText('Processando…',{exact:true}).waitFor();
   assert.equal(await page.locator('.cardio-v2 .stat-card').count(),0);assert.equal(await page.getByRole('alert').count(),0);
   await page.screenshot({path:`${ARTIFACTS}/loading-${width}.png`,fullPage:true});passed++;
   failure=true;hold=false;pending.splice(0).forEach(resolve=>resolve());
   await page.getByRole('alert').waitFor();assert.equal(await page.locator('.cardio-v2 .stat-card').count(),0);
   await page.screenshot({path:`${ARTIFACTS}/error-${width}.png`,fullPage:true});passed++;
   failure=false;
  }
  response=structuredClone(base);delete response.indicadores.critico;
  await page.goto(FRONT+'/dashboard?care_line=2');await page.getByRole('alert').waitFor();
  assert.equal(await page.locator('.cardio-v2 .stat-card').count(),0);passed++;
  response=structuredClone(base);response.capabilities.timeline='UNAVAILABLE';
  await load();assert.equal(await page.getByRole('heading',{name:'Atividade recente',exact:true}).count(),0);passed++;
  // Isolated real V2 content: inspect responsive content without changing the shell.
  let visual;
  await page.route(FRONT+'/__cardio-content-test',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<div id="root"></div><script type="module">
   import React from '/node_modules/.vite/deps/react.js';
   import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
   import RefreshRuntime from '/@react-refresh';
   RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
   await import('/src/index.css');
   const {default:Cockpit}=await import('/src/pages/cardiometabolico/CardioProfessionalCockpit.jsx');
   const {TimelineEvents}=await import('/src/pages/cardiometabolico/TimelineCardiometabolico.jsx');
   const props=${JSON.stringify(visual)};
   ReactDOM.createRoot(document.getElementById('root')).render(props.defaultTimeline ? React.createElement(TimelineEvents,{events:props.events}) : React.createElement(Cockpit,{...props,name:'Profissional sintético',offset:0,onPage:()=>{},onPatient:()=>{}}));
  </script>`}));
  const zero=structuredClone(base);
  zero.indicadores=Object.fromEntries(Object.keys(base.indicadores).map(k=>[k,0]));
  zero.continuidade=Object.fromEntries(Object.keys(base.continuidade).map(k=>[k,0]));
  zero.evolution={com_registro:0,sem_registro:0};zero.pacientes_criticos=[];zero.recent_activity=[];zero.pagination.total=0;
  for(const width of [1280,768,390]){
   await page.setViewportSize({width,height:1000});
   for(const [state,props] of [['population',{data:base}],['zero',{data:zero}],['loading',{loading:true}],['error',{error:true}]]){
    visual=props;await page.goto(FRONT+'/__cardio-content-test');
    await page.getByRole('heading',{name:'Cockpit Assistencial',exact:true}).waitFor();
    assert.equal(await page.locator('.cardio-v2').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
    await page.screenshot({path:`${ARTIFACTS}/content-${state}-${width}.png`,fullPage:true});passed++;
   }
  }
  visual={defaultTimeline:true,events};
  await page.goto(FRONT+'/__cardio-content-test');
  await page.getByText('Intervenção Cardio sintética',{exact:true}).waitFor();
  assert.equal(await page.locator('.cardio-timeline-card').count(),4);
  assert.equal(await page.locator('.cardio-v2-events').count(),0);
  assert.equal(await page.getByText('Autoria não disponível',{exact:true}).count(),0);
  assert.equal(await page.getByText('Detalhes do evento',{exact:true}).count(),0);passed++;
  assert.deepEqual(errors,[]);
  console.log(`PASS: ${passed} Cardio V2 presentation scenarios; screenshots ${ARTIFACTS}`);
 }finally{pending.splice(0).forEach(resolve=>resolve());await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
