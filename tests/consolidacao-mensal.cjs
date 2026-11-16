const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
// Requires local Vite allowing /private/tmp/c2-f12-evidence. No HML access:
// every request outside the local frontend is intercepted with synthetic data.
const FRONT = process.env.MENTAL_FRONT_URL || 'http://127.0.0.1:5177';
const TMP = '/private/tmp/c2-f12-evidence';
fs.mkdirSync(TMP, { recursive: true });
fs.writeFileSync(TMP + '/monthly-harness.jsx', `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {AuthContext} from '/src/context/AuthContext.jsx';
import Dimensionamento from '/src/pages/Dimensionamento.jsx';
function Harness(){const [identity,setIdentity]=React.useState({user:{id:1,perfil:'ADMIN'},loading:false});window.setIdentity=setIdentity;return <AuthContext.Provider value={identity}><BrowserRouter><Dimensionamento/></BrowserRouter></AuthContext.Provider>}
createRoot(document.getElementById('root')).render(<React.StrictMode><Harness/></React.StrictMode>);
`);
let browser;
before(async () => { browser = await chromium.launch({channel:'chrome',headless:true}); });
after(async () => { await browser?.close(); });
const response = { qualidade:'ESTIMADO', ocupacoes:[{ocupacao_id:8}], demanda_mensal_projetada:0, capacidade_mensal_equivalente:null, capacidade_mensal_conhecida:'12.30', saldo_mensal:null };
async function fixture(t, options={}) {
 const context=await browser.newContext();t.after(()=>context.close());
 await context.addInitScript(()=>{if(location.pathname!=='/login')localStorage.setItem('access_token','synthetic-test-token')});
 const page=await context.newPage(); const calls=[]; const errors=[];
 page.on('pageerror',e=>errors.push(e.message)); t.after(()=>assert.deepEqual(errors,[]));
 const state={status:200,data:response,...options};
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin===FRONT){
   if(url.pathname==='/__monthly')return route.fulfill({contentType:'text/html',body:`<div id="root"></div><script type="module" src="/@fs${TMP}/monthly-harness.jsx"></script>`});
   if(url.pathname==='/login')return route.fulfill({contentType:'text/html',body:'Login local simulado'});
   return route.continue();
  }
  let data=[];let status=200;
  if(url.pathname==='/admin/consolidacao-gerencial/mensal'){
   calls.push({params:Object.fromEntries(url.searchParams),authorization:req.headers().authorization,method:req.method()});
   if(state.handler)return state.handler(route,calls.length);
   if(state.network)return route.abort('failed');
   data=state.status===200?state.data:{detail:'SQL SECRET INTERNAL patient 999'};status=state.status;
  }
  if(url.pathname==='/admin/instituicoes/')data=[{id:3,nome_fantasia:'Instituição Sintética A'},{id:4,razao_social:'Instituição Sintética B'}];
  if(url.pathname==='/atividades-terapeuticas/ocupacoes-profissionais'){data=[{id:8,nome:'Psicólogo'},{id:9,nome:'Outra ocupação'}];if(state.catalogFail)status=403;}
  return route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto(FRONT+'/__monthly');
 await page.getByRole('tab',{name:'Consolidação Mensal',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('.dimensionamento-mensal-filtros select')?.disabled);
 return {page,calls,state, async select(){await page.getByLabel('Instituição',{exact:true}).selectOption('3');}, async query(){await this.select();await page.getByRole('button',{name:'Atualizar',exact:true}).click();}};
}
async function success(page){await page.getByText('Consulta concluída.',{exact:false}).waitFor();}
async function settle(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
test('Sem consulta automática, instituição não selecionada e competência local',async t=>{
 const {page,calls}=await fixture(t);
 assert.equal(await page.getByLabel('Instituição',{exact:true}).inputValue(),'');
 assert.equal(await page.getByLabel('Competência',{exact:true}).inputValue(),await page.evaluate(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}));
 await page.getByLabel('Instituição',{exact:true}).selectOption('3');await settle(page);assert.equal(calls.length,0);
});
test('Instituição obrigatória impede HTTP',async t=>{const f=await fixture(t);await f.page.getByRole('button',{name:'Atualizar'}).click();await f.page.getByText('Selecione uma instituição válida.').waitFor();assert.equal(f.calls.length,0);});
test('Competência inválida e IDs inválidos bloqueados pelo serviço',async t=>{
 const f=await fixture(t);await f.select();await f.page.getByLabel('Competência',{exact:true}).fill('');await f.page.getByRole('button',{name:'Atualizar'}).click();await f.page.getByText('Informe uma competência válida no formato AAAA-MM.').waitFor();
 const rejected=await f.page.evaluate(async()=>{const {consultarConsolidacaoMensal:run}=await import('/src/services/consolidacaoMensal.js');let n=0;for(const params of [{instituicao_id:0,mes_referencia:'2026-11'},{instituicao_id:3,mes_referencia:'2026-13'},{instituicao_id:3,mes_referencia:'0000-01'},{instituicao_id:3,mes_referencia:'2026-11',ocupacao_id:-1}])try{await run(params)}catch{n++}return n});assert.equal(rejected,4);assert.equal(f.calls.length,0);
});
test('GET autenticado, parâmetros sem ocupação e com filtro opcional',async t=>{
 const f=await fixture(t);await f.page.getByLabel('Competência',{exact:true}).fill('2026-11');await f.query();await success(f.page);
 assert.deepEqual(f.calls[0],{params:{instituicao_id:'3',mes_referencia:'2026-11'},authorization:'Bearer synthetic-test-token',method:'GET'});
 await f.page.getByLabel('Ocupação',{exact:true}).selectOption('8');assert.equal(f.calls.length,1);await f.page.getByRole('button',{name:'Atualizar'}).click();await success(f.page);assert.equal(f.calls[1].params.ocupacao_id,'8');
});
test('Serviço preserva zero, null e strings decimais sem cálculo',async t=>{
 const f=await fixture(t);const data=await f.page.evaluate(async()=>{const s=await import('/src/services/consolidacaoMensal.js');return s.consultarConsolidacaoMensal({instituicao_id:3,mes_referencia:'2026-11'})});assert.deepEqual(data,response);
});
test('Resultado identifica filtros consultados mesmo após edição',async t=>{
 const f=await fixture(t);await f.page.getByLabel('Competência',{exact:true}).fill('2026-11');await f.query();await success(f.page);await f.page.getByLabel('Instituição',{exact:true}).selectOption('4');await f.page.getByLabel('Competência',{exact:true}).fill('2026-12');
 const summary=f.page.locator('.dimensionamento-mensal-resumo');assert.match(await summary.innerText(),/Instituição Sintética A/);assert.match(await summary.innerText(),/2026-11/);assert.equal(f.calls.length,1);
});
test('Clique duplo não duplica consulta em andamento',async t=>{
 let release;const gate=new Promise(r=>release=r);const f=await fixture(t,{handler:async route=>{await gate;await route.fulfill({json:response})}});t.after(()=>release());await f.select();
 await f.page.getByRole('button',{name:'Atualizar'}).evaluate(b=>{b.click();b.click()});await f.page.getByText('Consultando consolidação mensal…').waitFor();assert.equal(await f.page.getByRole('button',{name:'Atualizar'}).isDisabled(),true);release();await success(f.page);assert.equal(f.calls.length,1);
});
test('Alternância preserva consulta em andamento sem duplicar GET',async t=>{
 let release;const gate=new Promise(r=>release=r);
 const f=await fixture(t,{handler:async route=>{await gate;await route.fulfill({json:response})}});t.after(()=>release());
 await f.query();await f.page.getByText('Consultando consolidação mensal…').waitFor();
 await f.page.getByRole('tab',{name:'Planejamento de Equipe',exact:true}).click();
 assert.equal(await f.page.getByRole('button',{name:'Atualizar'}).count(),0);
 await f.page.getByRole('tab',{name:'Consolidação Mensal',exact:true}).click();
 assert.equal(await f.page.getByRole('button',{name:'Atualizar'}).isDisabled(),true);
 assert.equal(f.calls.length,1);release();await success(f.page);assert.equal(f.calls.length,1);
});
test('Resposta antiga após troca de ADMIN não substitui nova consulta',async t=>{
 let old;const f=await fixture(t,{handler:async(route,n)=>{if(n===1){old=route;return;}await route.fulfill({json:{...response,qualidade:'CONCLUSIVO'}})}});
 await f.query();await f.page.getByText('Consultando consolidação mensal…').waitFor();
 await f.page.evaluate(()=>window.setIdentity({user:{id:2,perfil:'ADMIN'},loading:false}));
 await f.page.getByRole('tab',{name:'Planejamento de Equipe',exact:true}).waitFor();
 await f.page.getByRole('tab',{name:'Consolidação Mensal',exact:true}).click();
 await f.page.waitForFunction(()=>!document.querySelector('.dimensionamento-mensal-filtros select')?.disabled);
 await f.query();await success(f.page);assert.ok(old);
 await old.fulfill({json:{...response,qualidade:'INCONSISTENTE'}}).catch(()=>{});await settle(f.page);
 assert.equal(await f.page.getByText('Conclusivo',{exact:true}).count(),1);assert.equal(await f.page.getByText('Inconsistente',{exact:true}).count(),0);assert.equal(f.calls.length,2);
});
test('Troca de identidade descarta resposta e resultados da sessão anterior',async t=>{
 let old;const f=await fixture(t,{handler:async route=>{old=route}});await f.query();await f.page.getByText('Consultando consolidação mensal…').waitFor();await f.page.evaluate(()=>window.setIdentity({user:{id:2,perfil:'GESTOR'},loading:false}));await f.page.getByRole('tab',{name:'Consolidação Mensal',exact:true}).waitFor({state:'detached'});
 assert.ok(old, "Consulta anterior efetivamente iniciada");await old.fulfill({json:response}).catch(()=>{});await f.page.evaluate(()=>window.setIdentity({user:{id:3,perfil:'ADMIN'},loading:false}));await f.page.getByRole('tab',{name:'Consolidação Mensal',exact:true}).click();await f.page.getByText('Selecione os filtros e clique em Atualizar para consultar.').waitFor();assert.equal(await f.page.getByText('Consulta concluída.',{exact:false}).count(),0);
});
test('Catálogo de ocupações indisponível permite consulta sem filtro',async t=>{const f=await fixture(t,{catalogFail:true});await f.page.getByText('Não foi possível carregar as ocupações.',{exact:false}).waitFor();await f.query();await success(f.page);assert.equal(f.calls[0].params.ocupacao_id,undefined);});
test('Sucesso vazio não é erro nem presume demanda zero',async t=>{const f=await fixture(t,{data:{...response,ocupacoes:[]}});await f.query();await f.page.getByText('Nenhuma ocupação retornada para este recorte.',{exact:false}).waitFor();assert.equal(await f.page.getByRole('alert').count(),0);});
for(const [status,text] of [[403,'Sua conta não tem autorização'],[404,'Instituição não encontrada'],[409,'A instituição não está disponível'],[422,'Os filtros não foram aceitos'],[500,'Não foi possível concluir'],[503,'Serviço temporariamente indisponível']])test(`HTTP ${status} sanitizado e recuperação após nova consulta`,async t=>{const f=await fixture(t,{status});await f.query();await f.page.getByText(text,{exact:false}).waitFor();assert.doesNotMatch(await f.page.locator('body').innerText(),/SQL SECRET|patient 999/);f.state.status=200;await f.page.getByRole('button',{name:'Atualizar'}).click();await success(f.page);assert.equal(await f.page.getByRole('alert').count(),0);});
test('HTTP 401 preserva redirecionamento e remoção de token do cliente existente',async t=>{const f=await fixture(t,{status:401});await f.query();await f.page.waitForURL(FRONT+'/login');assert.equal(await f.page.evaluate(()=>localStorage.getItem('access_token')),null);});
test('Falha de rede mostra mensagem genérica sem afetar aba Planejamento',async t=>{const f=await fixture(t,{network:true});await f.query();await f.page.getByText('Falha de comunicação.',{exact:false}).waitFor();await f.page.getByRole('tab',{name:'Planejamento de Equipe',exact:true}).click();await f.page.getByRole('combobox',{name:'Linha de Cuidado'}).waitFor();});
test('Filtros e resumo sem overflow em 1440, 768 e 390 pixels',async t=>{const f=await fixture(t);await f.query();await success(f.page);for(const width of [1440,768,390]){await f.page.setViewportSize({width,height:900});assert.ok(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await f.page.getByRole('tablist').count(),1);await f.page.screenshot({path:`/private/tmp/c2-f13-evidence/monthly-${width}.png`,fullPage:true});}});
