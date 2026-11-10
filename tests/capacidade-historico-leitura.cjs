// Read-only browser fixture: every API request must be GET. No HML.
const {test}=require('node:test');const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const FRONT='http://127.0.0.1:5176';
async function fixture(run){const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();page.setDefaultTimeout(8000);let handler=()=>({rows:[]});let reads=0;const methods=[];
 await page.addInitScript(()=>localStorage.setItem('access_token','synthetic'));
 await page.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());if(u.origin===FRONT)return route.continue();methods.push(r.method());assert.equal(r.method(),'GET');
 const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 if(u.pathname==='/me')return reply({id:1,perfil:'ADMIN',modulos:[]});
 if(u.pathname==='/admin/instituicoes/')return reply([{id:3,ativo:true,razao_social:'Sintética'}]);
 if(u.pathname==='/admin/vinculos-institucionais/profissionais')return reply([100,101].map(id=>({id,instituicao_id:3,profissional_id:id,ocupacao_id:10,ativo:true,data_inicio:'2026-01-01',data_fim:null})));
 if(u.pathname.endsWith('/consolidacao'))return reply({instituicao_id:3,data_referencia:'2026-11-10',ocupacao_id:null,totais:{horas_semanais:'0',profissionais_distintos:0,vinculos_com_capacidade:0,vinculos_sem_capacidade:0},ocupacoes:[],vinculos:[]});
 if(u.pathname.endsWith('/capacidades')){reads++;const result=handler(Number(u.pathname.split('/')[4]),reads);if(result.delay)await new Promise(r=>setTimeout(r,result.delay));if(result.abort)return route.abort();return reply(result.rows||[],result.status||200);}return reply([]);});
 await page.goto(FRONT+'/admin/instituicoes/capacidade?instituicao_id=3&data_referencia=2026-11-10');
 const open=id=>page.getByRole('combobox',{name:/Vínculo profissional institucional/}).selectOption(String(id));const dialog=page.getByRole('dialog');
 const row=(id=100,minutes=60)=>({id:1,instituicao_id:3,profissional_instituicao_id:id,data_referencia:'2026-11-10',minutos_semanais:minutes,data_inicio:'2026-01-01',data_fim:null,ativo:true,vigente:true,estado:'VIGENTE'});
 await run({page,dialog,open,row,setHandler:h=>handler=h,reads:()=>reads});assert.ok(methods.every(m=>m==='GET'));
 }finally{await browser.close();}}
test('StrictMode: cancelamento seguido de sucesso sem alerta',()=>fixture(async c=>{await c.open(100);await c.dialog.getByText('Nenhuma capacidade cadastrada.').waitFor();await c.page.waitForTimeout(200);assert.equal(await c.dialog.getByRole('alert').count(),0);}));
test('falhas reais de rede e HTTP preservadas; atualização limpa erro',()=>fixture(async c=>{c.setHandler(()=>({abort:true}));await c.open(100);await c.dialog.getByRole('alert').filter({hasText:'Falha de comunicação'}).waitFor();c.setHandler(()=>({status:403}));await c.dialog.getByRole('button',{name:'Atualizar histórico'}).click();await c.dialog.getByRole('alert').filter({hasText:'não autorizada'}).waitFor();c.setHandler(()=>({rows:[]}));await c.dialog.getByRole('button',{name:'Atualizar histórico'}).click();await c.dialog.getByText('Nenhuma capacidade cadastrada.').waitFor();assert.equal(await c.dialog.getByRole('alert').count(),0);}));
test('resposta inicial tardia não sobrescreve atualização manual',()=>fixture(async c=>{c.setHandler(()=>({rows:[c.row(100,30)],delay:600}));await c.open(100);await c.page.waitForTimeout(100);c.setHandler(()=>({rows:[c.row(100,90)]}));await c.dialog.getByRole('button',{name:'Atualizar histórico'}).click();await c.dialog.getByText('Capacidade vigente: 90 min',{exact:true}).waitFor();await c.page.waitForTimeout(700);assert.equal(await c.dialog.getByText('Capacidade vigente: 90 min',{exact:true}).count(),1);assert.equal(await c.dialog.getByRole('alert').count(),0);}));
test('desmontagem e troca de vínculo descartam leitura anterior',()=>fixture(async c=>{c.setHandler(id=>({rows:[c.row(id,id===100?30:120)],delay:id===100?600:0}));await c.open(100);await c.page.waitForTimeout(100);await c.dialog.getByRole('button',{name:'Fechar',exact:true}).click();await c.open(101);await c.dialog.getByText('Capacidade vigente: 120 min',{exact:true}).waitFor();await c.page.waitForTimeout(700);assert.equal(await c.dialog.getByText('Capacidade vigente: 120 min',{exact:true}).count(),1);assert.equal(await c.dialog.getByRole('alert').count(),0);}));
