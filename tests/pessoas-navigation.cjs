const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.PESSOAS_FRONT_URL || 'http://127.0.0.1:5186';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage();page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(60000);
  const errors=[],writes=[];let nativeDialogs=0,expired=false;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>{nativeDialogs++;d.dismiss();});
  await page.addInitScript(()=>{if(!sessionStorage.getItem('fixture-seeded')){localStorage.setItem('access_token','synthetic-only');sessionStorage.setItem('fixture-seeded','1');}});
  await page.route('**/*',route=>{
   const r=route.request(),u=new URL(r.url());if(u.origin===FRONT)return route.continue();
   if(r.method()!=='GET')writes.push(u.pathname);
   const reply=(v,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(v)});
   const person={id:21,nome_completo:'Pessoa sintética',cpf:'11144477735',ativo:true};
   if(u.pathname==='/me')return reply({id:99,perfil:'ADMIN',nome:'Teste',modulos:[]});
   if(u.pathname==='/saude-mental/cockpit/gestao')return reply({},403);
   if(u.pathname==='/admin/pessoas/')return reply([person]);
   if(u.pathname==='/admin/pessoas/21')return reply(person);
   if(u.pathname.endsWith('/21/vinculos'))return reply({pessoa_id:21,paciente_id:50,paciente_ativo:true,profissional_id:null,profissional_ativo:null,pacientes:[],profissionais:[]});
   if(u.pathname.endsWith('/21/acessos'))return expired?reply({},401):reply({pessoa_id:21,usuario:null,autorizacoes:[]});
   return reply([]);
  });
  const nav=()=>page.getByRole('navigation',{name:'Navegação institucional'});
  const modal=()=>page.getByRole('dialog',{name:'Descartar alterações não salvas?'});
  async function edit(){
   await page.getByRole('button',{name:'Consultar',exact:true}).click();
   await page.getByRole('button',{name:'Identificação e dados cadastrais',exact:true}).click();
   await page.getByRole('button',{name:'Editar dados',exact:true}).click();
   await page.getByLabel('Nome completo *',{exact:true}).fill('Rascunho preservado');
  }
  async function cancel(){
   await modal().waitFor();assert.equal(await modal().count(),1);
   assert.equal(await modal().getByRole('button',{name:'Continuar editando'}).evaluate(e=>e===document.activeElement),true);
   await modal().getByRole('button',{name:'Continuar editando'}).click();
   await modal().waitFor({state:'hidden'});
   assert.equal(new URL(page.url()).pathname,'/admin/pessoas');
   assert.equal(await page.getByLabel('Nome completo *',{exact:true}).inputValue(),'Rascunho preservado');
   assert.equal(await page.evaluate(()=>localStorage.getItem('access_token')),'synthetic-only');
  }
  async function discard(path){await modal().getByRole('button',{name:'Descartar e sair'}).click();await page.waitForURL(FRONT+path);await modal().waitFor({state:'detached'});}
  await page.goto(FRONT+'/admin/instituicoes');
  await nav().getByRole('link',{name:'Pessoas',exact:true}).click();
  await nav().getByRole('link',{name:'Instituições',exact:true}).click();
  await page.goBack();await page.waitForURL('**/admin/pessoas');
  const historyLength=await page.evaluate(()=>history.length);
  await edit();
  await page.evaluate(()=>history.back());await cancel();
  await page.evaluate(()=>history.back());await modal().waitFor();await discard('/admin/instituicoes');
  await page.goForward();await page.waitForURL('**/admin/pessoas');await edit();
  await page.evaluate(()=>history.forward());await cancel();
  await page.evaluate(()=>history.forward());await modal().waitFor();await discard('/admin/instituicoes');
  assert.equal(await page.evaluate(()=>history.length),historyLength);
  await page.goBack();await page.waitForURL('**/admin/pessoas');
  // Clean history traversal must never ask for confirmation.
  await page.goForward();await page.waitForURL('**/admin/instituicoes');assert.equal(await modal().count(),0);
  await page.goBack();await page.waitForURL('**/admin/pessoas');await edit();
  await nav().getByRole('link',{name:'Instituições',exact:true}).click();await cancel();
  await nav().getByRole('link',{name:'Instituições',exact:true}).click();await modal().waitFor();await discard('/admin/instituicoes');
  await page.goBack();await page.waitForURL('**/admin/pessoas');await edit();
  await page.getByRole('button',{name:'Sair',exact:true}).click();await cancel();
  await page.getByRole('button',{name:'Sair',exact:true}).click();await modal().waitFor();await discard('/login');
  assert.equal(await page.evaluate(()=>localStorage.getItem('access_token')),null);
  // A 401 invalidates the token before document navigation: no discard veto.
  await page.evaluate(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.goto(FRONT+'/admin/pessoas');await edit();
  await page.getByRole('button',{name:'Acesso à plataforma',exact:true}).click();expired=true;
  await page.getByRole('button',{name:'Atualizar acesso',exact:true}).click();await page.waitForURL('**/login');
  assert.equal(await page.evaluate(()=>localStorage.getItem('access_token')),null);
  assert.equal(nativeDialogs,0);assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
  console.log('PEOPLE_NAVIGATION PASS: back/forward cancel+confirm, valid future entry, dirty links, clean navigation, logout cancel+confirm, 401 bypass, fields/session preserved, accessible modal focus, zero duplicate/native prompts, stable history length, zero writes/pageerrors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
