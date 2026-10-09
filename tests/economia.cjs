const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT=process.env.AE1_FRONT_URL || 'http://127.0.0.1:5176';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();page.setDefaultTimeout(12000);
  let role='ADMIN', failure=0, delay=0;
  const rows=[], calls=[], errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.origin===FRONT)return route.continue();
   const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname==='/me')return reply({id:99,nome:'Admin sintético',perfil:role,modulos:[]});
   if(u.pathname==='/atividades-terapeuticas/ocupacoes-profissionais')return reply([{id:1,nome:'Psicologia'}]);
   if(!u.pathname.startsWith('/admin/economia/servicos'))return reply([]);
   calls.push({method:req.method(),path:u.pathname,body:req.postDataJSON()});
   if(delay)await new Promise(r=>setTimeout(r,delay));
   if(failure)return reply({detail:{code:failure===409?'SERVICE_CODE_EXISTS':'ECONOMIC_OPERATION_FAILED'}},failure);
   const id=Number(u.pathname.split('/')[4]),row=rows.find(r=>r.id===id),body=req.postDataJSON();
   if(req.method()==='GET')return reply(id?row:rows);
   if(req.method()==='PUT'||req.method()==='PATCH'){Object.assign(row,body);return reply(row);}
   const newRow={id:rows.length+1,...body,ocupacao_nome:'Psicologia',em_uso:false};rows.push(newRow);return reply(newRow);
  });
  await page.goto(FRONT+'/admin/economia');
  await page.getByRole('heading',{name:'Administração Econômica',exact:true}).waitFor();
  assert.equal(await page.getByRole('link',{name:'Tabelas de Preços'}).count(),0);
  await page.getByRole('link',{name:'Administrar Serviços Econômicos'}).click();
  await page.getByText('Nenhum serviço cadastrado').waitFor();
  delay=250;await page.getByRole('button',{name:'Atualizar catálogo'}).click();await page.getByText('Carregando serviços...').waitFor();delay=0;
  await page.getByText('Nenhum serviço cadastrado').waitFor();
  await page.getByRole('button',{name:'Novo serviço',exact:true}).click();
  await page.getByLabel('Código *',{exact:true}).fill('PSI45');
  await page.getByLabel('Descrição *',{exact:true}).fill('Atendimento individual');
  await page.getByLabel('Ocupação *',{exact:true}).selectOption('1');
  await page.getByLabel('Duração (minutos) *',{exact:true}).fill('45');
  for(const width of [1440,768,390]){
   await page.setViewportSize({width,height:900});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.ok(await page.getByRole('dialog').evaluate(e=>e.scrollWidth<=e.clientWidth));
   await page.screenshot({path:`/tmp/ae1-form-${width}.png`,fullPage:true});
  }
  failure=409;await page.getByRole('button',{name:'Salvar serviço'}).click();await page.getByText('Este código já está cadastrado.').waitFor();
  assert.equal(await page.getByLabel('Código *',{exact:true}).inputValue(),'PSI45');failure=0;
  await page.getByRole('button',{name:'Salvar serviço'}).click();await page.getByText('Serviço salvo com sucesso.').waitFor();
  await page.getByRole('row',{name:/PSI45/}).waitFor();await page.reload();await page.getByRole('row',{name:/PSI45/}).waitFor();
  rows[0].em_uso=true;
  await page.getByRole('button',{name:'Editar',exact:true}).click();
  await page.getByText(/Os campos estruturais/).waitFor();
  assert.equal(await page.getByLabel('Código *',{exact:true}).isDisabled(),true);
  assert.equal(await page.getByLabel('Ocupação *',{exact:true}).isDisabled(),true);
  assert.equal(await page.getByLabel('Duração (minutos) *',{exact:true}).isDisabled(),true);
  await page.getByLabel('Descrição *',{exact:true}).fill('Descrição atualizada');
  await page.getByRole('button',{name:'Salvar serviço'}).click();await page.getByText('Serviço salvo com sucesso.').waitFor();
  assert.equal(rows[0].descricao,'Descrição atualizada');
  const before=calls.length;
  page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Inativar',exact:true}).click();assert.equal(calls.length,before);
  page.once('dialog',d=>{assert.match(d.message(),/global/);return d.accept();});
  await page.getByRole('button',{name:'Inativar',exact:true}).click();await page.getByText('Serviço inativado.').waitFor();
  await page.reload();await page.getByRole('button',{name:'Ativar',exact:true}).click();await page.getByText('Serviço ativado.').waitFor();
  await page.getByRole('button',{name:'Editar',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.locator("aside").count(),1);await page.locator(".economic-table").screenshot({path:`/tmp/ae1-table-${width}.png`});}
  for(const status of [403,422,500]){failure=status;await page.getByRole('button',{name:'Atualizar catálogo'}).click();await page.getByRole('alert').waitFor();}failure=0;
  failure=401;await page.getByRole('button',{name:'Atualizar catálogo'}).click();await page.waitForURL('**/login');failure=0;
  for(const profile of ['ADMIN_CLINICA','PROFISSIONAL','SUPORTE','GESTOR','ADMINISTRADOR']){
   role=profile;const count=calls.length;
   for(const url of ['/admin/economia','/admin/economia/servicos']){await page.goto(FRONT+url);await page.waitForURL('**/dashboard');}
   assert.equal(calls.length,count);assert.equal(await page.getByRole('link',{name:'Administração Econômica',exact:true}).count(),0);
  }
  assert.equal(errors.length,0,errors.join('\n'));
  assert.ok(calls.every(c=>c.path.startsWith('/admin/economia/servicos')));
  console.log('PASS AE1: ADMIN hub/menu, 5 profiles denied, empty/loading/errors, create/reload, persisted edit/structural locks, explicit lifecycle, cancel/Escape, 1440/768/390.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
