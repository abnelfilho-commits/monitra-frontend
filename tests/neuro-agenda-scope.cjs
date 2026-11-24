/* SEC-002 browser contracts; every non-local request is intercepted, no remote access. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.COCKPIT_FRONT_URL || 'http://127.0.0.1:5193';
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 let passed=0;
 try {
  const page=await browser.newPage();
  page.setDefaultTimeout(10000);
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  let mode='normal', release, requestSeen;
  const requests=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const day=await page.evaluate(()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')});
  const rows=[
   {id:1,paciente:'Synthetic completed',data_agendada:day,hora_inicio:'08:00',status:'REALIZADA'},
   {id:2,paciente:'Synthetic Neuro next',data_agendada:day,hora_inicio:'09:00',status:'AGENDADA'},
   {id:3,paciente:'Synthetic Neuro future',data_agendada:'2099-01-01',hora_inicio:'09:00',status:'AGENDADA'},
  ];
  const mental={id:4,paciente:'Synthetic Mental only',data_agendada:day,hora_inicio:'07:00',status:'AGENDADA',contexto:{id:1,modulo_id:3}};
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin===FRONT)return route.continue();
   const json=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname==='/me')return json({id:99,perfil:'PROFISSIONAL',nome:'Synthetic',modulos:[{id:1,nome:'Neurodesenvolvimento'}]});
   if(u.pathname==='/cockpit/profissional')return json({total_pacientes:1,pacientes_prioritarios:[],atividades_recentes:[]});
   if(u.pathname==='/sessoes-assistenciais/minhas'){
    requests.push(u.pathname+u.search);
    if(!u.search)return json([...rows,mental]);
    assert.equal(u.searchParams.get('care_line'),'NEURO');
    if(mode==='hold')await new Promise(resolve=>{release=resolve;requestSeen()});
    if(mode==='error')return route.fulfill({status:403,contentType:'application/json',body:'{"detail":"Denied"}'});
    return json(mode==='empty'?[]:mode==='malformed'?{}:rows);
   }
   return json([]);
  });
  async function dashboard(){await page.goto(FRONT+'/dashboard?care_line=1')}
  const card=title=>page.locator('.stat-card').filter({hasText:title});
  await dashboard();
  await page.getByText('Synthetic Neuro next',{exact:false}).first().waitFor();
  assert.ok(requests.length>0&&requests.every(r=>r.endsWith('?care_line=NEURO')));passed++;
  for(const [title,value] of [['Atendimentos hoje','2'],['Realizados','1'],['Próximos','1']]){
   assert.equal(await card(title).locator('.stat-card__value').innerText(),value);
  }passed++;
  assert.equal(await page.getByText('Synthetic Mental only',{exact:false}).count(),0);
  await page.getByText('Próximo atendimento',{exact:true}).waitFor();passed++;
  mode='empty';await dashboard();await page.getByText('Nenhuma sessão na Agenda Assistencial.',{exact:true}).waitFor();
  assert.equal(await card('Próximos').locator('.stat-card__value').innerText(),'0');passed++;
  for(const state of ['error','malformed']){
   mode=state;const before=requests.length;await dashboard();
   await page.getByText('Agenda Assistencial indisponível.',{exact:false}).waitFor();
   for(const title of ['Atendimentos hoje','Realizados','Próximos'])assert.equal(await card(title).locator('.stat-card__value').innerText(),'Indisponível');
   assert.ok(requests.slice(before).every(r=>r.endsWith('?care_line=NEURO')));
   assert.equal(await page.getByText('Próximo atendimento',{exact:true}).count(),0);passed++;
  }
  mode='hold';const held=new Promise(resolve=>{requestSeen=resolve});await dashboard();await page.getByText('Carregando Agenda Assistencial...',{exact:true}).waitFor();
  assert.equal(await card('Próximos').locator('.stat-card__value').innerText(),'Carregando…');
  await held;
  mode='normal';release();await page.getByText('Synthetic Neuro next',{exact:false}).first().waitFor();passed++;
  const before=requests.length;await page.goto(FRONT+'/agenda-assistencial');
  await page.getByText('Synthetic Mental only',{exact:false}).first().waitFor();
  assert.ok(requests.slice(before).length>0&&requests.slice(before).every(r=>r==='/sessoes-assistenciais/minhas'));passed++;
  assert.deepEqual(errors,[]);
  console.log('PASS: '+passed+' SEC-002 browser scenarios');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
