// Synthetic browser tests: local Vite only; every API request intercepted (no HML).
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.CAPACIDADE_FRONT_URL || 'http://127.0.0.1:5176';
const path = '/admin/instituicoes/capacidade?instituicao_id=3&data_referencia=2026-11-10';
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 let passed=0;
 try {
  const page=await browser.newPage(); page.setDefaultTimeout(10000);
  let role='ADMIN', mode='normal', delay=false; const calls=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const r=route.request(),u=new URL(r.url()); if(u.origin===FRONT)return route.continue();
   const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   assert.equal(r.method(),'GET');
   if(u.pathname==='/me')return reply({id:99,nome:'Admin sintético',perfil:role,modulos:[]});
   if(u.pathname==='/admin/instituicoes/')return reply([3,4].map(id=>({id,razao_social:`Instituição ${id}`,ativo:true,tipo_instituicao:'EMPRESA'})));
   if(!u.pathname.endsWith('/capacidades/consolidacao'))return reply([]);
   calls.push(Object.fromEntries(u.searchParams));
   if(mode==='network')return route.abort();
   if(typeof mode==='number')return reply({detail:{code:'DENIED'}},mode);
   const id=Number(u.searchParams.get('instituicao_id')),occupation=Number(u.searchParams.get('ocupacao_id'))||null;
   const totals={minutos_semanais:120,horas_semanais:'2.00',profissionais_distintos:2,vinculos_com_capacidade:1,vinculos_sem_capacidade:1,informacao_completa:false};
   const rows=[0,1].map(n=>({vinculo_id:100+n,profissional_id:20+n,profissional_nome:`Profissional ${id}-${n}`,ocupacao_id:10,ocupacao_nome:'Psicólogo',ocupacao_ativa:false,vinculo_data_inicio:'2026-01-01',vinculo_data_fim:null,capacidade_id:n?null:200,capacidade_data_inicio:n?null:'2026-01-01',capacidade_data_fim:null,minutos_semanais:n?null:120,situacao:n?'NAO_INFORMADA':'INFORMADA'}));
   if(mode==='zero')rows[0].minutos_semanais=0;
   if(mode==='90'||mode==='45')rows[0].minutos_semanais=Number(mode);
   const data={instituicao_id:mode==='scope'?999:id,data_referencia:u.searchParams.get('data_referencia'),ocupacao_id:occupation,totais:totals,ocupacoes:[{...totals,ocupacao_id:10,ocupacao_nome:'Psicólogo',ocupacao_ativa:false}],vinculos:rows};
   if(mode==='empty'){data.vinculos=[];data.ocupacoes=[];data.totais={minutos_semanais:0,horas_semanais:'0.00',profissionais_distintos:0,vinculos_com_capacidade:0,vinculos_sem_capacidade:0,informacao_completa:true};}
   if(delay&&id===3)await new Promise(resolve=>setTimeout(resolve,700));
   return reply(data);
  });
  const loaded=()=>page.locator('[data-vinculo-id="100"]').waitFor();
  await page.goto(FRONT+'/admin/instituicoes');
  await page.getByRole('row',{name:/Instituição 3/}).getByRole('link',{name:'Capacidade instalada'}).click();await loaded();assert.match(page.url(),/data_referencia=/);passed++;
  await page.goto(FRONT+path);await loaded();
  assert.match(await page.locator('.capacity-indicators').innerText(),/2,00 h/);
  assert.match(await page.locator('[data-vinculo-id="101"]').innerText(),/Não informada/);
  assert.match(await page.locator('[data-vinculo-id="100"]').innerText(),/inativa/);passed++;
  await page.getByRole('combobox',{name:/^Ocupação/}).selectOption('10');await loaded();assert.equal(calls.at(-1).ocupacao_id,'10');
  await page.reload();await loaded();assert.equal(await page.getByRole('combobox',{name:/^Ocupação/}).inputValue(),'10');passed++;
  await page.getByLabel('Data de referência').fill('2026-11-11');await loaded();assert.equal(calls.at(-1).data_referencia,'2026-11-11');assert.ok(!new URL(page.url()).searchParams.has('ocupacao_id'));passed++;
  assert.match(await page.locator('[data-vinculo-id="100"]').innerText(),/2h/);
  mode='zero';await page.goto(FRONT+path);await loaded();assert.match(await page.locator('[data-vinculo-id="100"]').innerText(),/0min/);passed++;
  for(const [minutes,label] of [['90','1h30'],['45','45min']]){mode=minutes;await page.goto(FRONT+path);await loaded();assert.ok((await page.locator('[data-vinculo-id="100"]').innerText()).includes(label));}
  mode='empty';await page.goto(FRONT+path);await page.getByText('Nenhum vínculo elegível',{exact:true}).waitFor();assert.match(await page.locator('.capacity-indicators').innerText(),/Sem vínculos elegíveis/);passed++;
  for(const value of [403,404,409,422,'network','scope']){mode=value;await page.goto(FRONT+path);await page.getByRole('alert').waitFor();assert.equal(await page.locator('[data-vinculo-id]').count(),0);passed++;}
  mode=401;await page.goto(FRONT+path);await page.waitForURL('**/login');passed++;
  mode='normal';delay=true;await page.goto(FRONT+path);await page.getByText('Carregando capacidade...').waitFor();await page.getByRole('combobox',{name:/^Instituição/}).selectOption('4');await loaded();await page.waitForTimeout(900);assert.match(await page.locator('[data-vinculo-id="100"]').innerText(),/Profissional 4-0/);passed++;delay=false;
  for(const width of [1440,390]){await page.setViewportSize({width,height:900});await page.screenshot({path:`/private/tmp/capacidade-${width}.png`,fullPage:true});assert.ok(await page.locator('.capacity-panel').evaluate(el=>el.scrollWidth<=el.clientWidth));assert.equal(await page.locator('[data-vinculo-id="100"] [data-label]').count(),6);assert.ok(await page.locator('[data-vinculo-id="100"] [data-label]').evaluateAll(els=>els.every(el=>el.getBoundingClientRect().width>0)));assert.ok(await page.locator('.institutional-table').first().evaluate(el=>getComputedStyle(el).overflowX===(window.innerWidth<=600?'visible':'auto')));passed++;}
  for(const perfil of ['GESTOR','PROFISSIONAL']){role=perfil;const before=calls.length;await page.goto(FRONT+path);await page.waitForURL('**/dashboard');assert.equal(calls.length,before);passed++;}
  assert.deepEqual(errors,[]); console.log(`PASS: ${passed} cenários, zero escritas API e zero erros JS.`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
