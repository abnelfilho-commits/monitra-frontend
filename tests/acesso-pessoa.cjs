const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT=process.env.PESSOAS_FRONT_URL || 'http://127.0.0.1:5176';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage(); let conflict=false, pending;const writes=[], unexpected=[];
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());if(u.origin===FRONT)return route.continue();
   const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname==='/me')return reply({id:99,perfil:'ADMIN',nome:'Admin',modulos:[]});
   const person={id:10,nome_completo:'Pessoa local',cpf:null,ativo:true};
   if(u.pathname==='/admin/pessoas/')return reply([person]);
   if(u.pathname==='/admin/pessoas/10')return reply(person);
   if(u.pathname==='/admin/instituicoes/')return reply([{id:2,razao_social:'Instituição local',ativo:true}]);
   if(u.pathname==='/admin/pessoas/10/acesso'){
    writes.push(req.postDataJSON());
    if(conflict)return reply({detail:{code:'ACCESS_CONFLICT'}},409);
    await new Promise(resolve=>{pending=resolve;});
    return reply({pessoa_id:10,usuario_id:20,email:'native@example.com',usuario_ativo:true,autorizacao:{id:30,usuario_id:20,instituicao_id:2,perfil_institucional:'SUPORTE',ativo:true}});
   }
   if(req.method()!=='GET')unexpected.push(u.pathname);
   return reply([]);
  });
  await page.goto(FRONT+'/admin/pessoas');
  await page.getByRole('button',{name:'Ver / Editar'}).click();
  await page.getByRole('button',{name:'Habilitar acesso',exact:true}).click();
  const form=page.locator('form').filter({has:page.getByLabel('E-mail de acesso')});
  assert.equal(await form.getByText(/Clínica/).count(),0);
  assert.equal(await page.getByLabel('Instituição do acesso').inputValue(),'');
  assert.equal(await page.getByLabel('Perfil institucional',{exact:true}).inputValue(),'');
  assert.equal(await page.getByLabel('Autorização institucional ativa').isChecked(),false);
  await page.getByLabel('E-mail de acesso').fill('native@example.com');
  await page.getByLabel('Senha inicial',{exact:true}).fill('Synthetic-local-password');
  await page.getByLabel('Instituição do acesso').selectOption('2');
  await page.getByLabel('Perfil institucional',{exact:true}).selectOption('SUPORTE');
  await page.getByLabel('Autorização institucional ativa').check();
  await page.getByRole('button',{name:'Confirmar habilitação'}).click();
  await page.getByText('Habilitando acesso...', {exact:true}).waitFor();pending();
  await page.getByRole('status').filter({hasText:'Acesso institucional habilitado'}).waitFor();
  assert.equal(await form.count(),0);
  assert.equal(await page.getByLabel('Senha inicial',{exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Confirmar habilitação'}).count(),0);
  const summary=page.locator('section').filter({has:page.getByRole('heading',{name:'Acesso à plataforma',exact:true})});
  for(const value of ['native@example.com','Instituição local','SUPORTE','Ativo'])await summary.getByText(value,{exact:true}).waitFor();
  await summary.getByText(/Nenhuma autorização clínica foi concedida/).waitFor();
  assert.deepEqual(unexpected,[]);
  assert.equal(writes.length,1);
  assert.deepEqual(Object.keys(writes[0]).sort(),['email','senha_inicial','instituicao_id','perfil_institucional','ativo'].sort());
  conflict=true;
  await page.reload();
  await page.getByRole('button',{name:'Ver / Editar'}).click();
  await page.getByRole('button',{name:'Habilitar acesso',exact:true}).click();
  await page.getByLabel('E-mail de acesso').fill('native@example.com');
  await page.getByLabel('Instituição do acesso').selectOption('2');
  await page.getByLabel('Perfil institucional',{exact:true}).selectOption('SUPORTE');
  await page.getByLabel('Senha inicial',{exact:true}).fill('Synthetic-local-password');
  await page.getByRole('button',{name:'Confirmar habilitação'}).click();
  await page.getByRole('alert').filter({hasText:'Já existe autorização'}).waitFor();
  assert.equal(writes.length,2);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  console.log('IAM-N1 frontend PASS: explicit scope, default, success/loading/conflict, no clinic, password cleared, responsive.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
