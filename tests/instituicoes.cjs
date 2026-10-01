const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.INSTITUICOES_FRONT_URL || 'http://127.0.0.1:5176';
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 try {
  const page = await browser.newPage(); page.setDefaultTimeout(10000);
  let role='ADMIN', failure=null;
  const rows=[{id:1,razao_social:'Instituição sintética A',nome_fantasia:'Demo A',cnpj:null,tipo_instituicao:'EMPRESA',instituicao_pai_id:null,ativo:true},{id:2,razao_social:'Instituição sintética B',nome_fantasia:null,cnpj:null,tipo_instituicao:'OUTRO',instituicao_pai_id:null,ativo:false}];
  const calls=[], errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const req=route.request(), u=new URL(req.url());
   if(u.origin===FRONT)return route.continue();
   const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname==='/me')return reply({id:99,nome:'Admin sintético',perfil:role,modulos:[]});
   if(!u.pathname.startsWith('/admin/instituicoes'))return reply([]);
   const body=req.postDataJSON(); calls.push({method:req.method(),path:u.pathname,query:u.search,body});
   if(failure)return reply({detail:{code:failure}},failure==='CNPJ_ALREADY_EXISTS'?409:422);
   const id=Number(u.pathname.split('/')[3]); const row=rows.find(r=>r.id===id);
   if(req.method()==='GET')return reply(id?row:rows.filter(r=>(!u.searchParams.has('ativo')||String(r.ativo)===u.searchParams.get('ativo'))&&(!u.searchParams.has('tipo_instituicao')||r.tipo_instituicao===u.searchParams.get('tipo_instituicao'))));
   if(req.method()==='PATCH'){Object.assign(row,body);return reply(row);}
   if(u.pathname.endsWith('/ativar')||u.pathname.endsWith('/inativar')){row.ativo=u.pathname.endsWith('/ativar');return reply(row);}
   rows.push({id:3,...body,ativo:true}); return reply(rows.at(-1));
  });
  await page.goto(FRONT+'/admin/instituicoes');
  await page.getByRole('row',{name:/Demo A/}).waitFor();
  await page.getByRole('row',{name:/Instituição sintética B/}).waitFor();
  await page.getByLabel('Status',{exact:true}).selectOption('false');
  await page.getByRole('row',{name:/Instituição sintética B/}).waitFor();
  assert.equal(await page.getByRole('row',{name:/Demo A/}).count(),0);
  await page.getByLabel('Status',{exact:true}).selectOption('');
  await page.getByLabel('Tipo',{exact:true}).selectOption('CLINICA');
  await page.getByText('Nenhuma instituição encontrada').waitFor();
  await page.getByLabel('Tipo',{exact:true}).selectOption('');
  await page.getByRole('button',{name:'+ Nova instituição'}).click();
  await page.getByLabel('Razão social *',{exact:true}).fill('Nova sintética');
  await page.getByLabel('Tipo de instituição *',{exact:true}).selectOption('EMPRESA');
  await page.getByLabel('Instituição superior',{exact:true}).selectOption('2');
  failure='CNPJ_ALREADY_EXISTS';
  await page.getByRole('button',{name:'Salvar instituição'}).click();
  await page.getByRole('alert').filter({hasText:'CNPJ já está cadastrado'}).waitFor();
  assert.equal(await page.getByLabel('Razão social *',{exact:true}).inputValue(),'Nova sintética');
  failure=null;
  await page.getByRole('button',{name:'Salvar instituição'}).click();
  await page.getByText('Instituição criada com sucesso.').waitFor();
  assert.deepEqual(calls.filter(c=>c.method==='POST').at(-1).body,{razao_social:'Nova sintética',nome_fantasia:null,cnpj:null,tipo_instituicao:'EMPRESA',instituicao_pai_id:2});
  await page.getByRole('row',{name:/Nova sintética/}).getByRole('button',{name:'Editar'}).click();
  const superiores = page.getByLabel('Instituição superior',{exact:true});
  await superiores.waitFor();
  assert.deepEqual(await superiores.locator('option').evaluateAll(options=>options.map(option=>option.value)), ['', '1', '2']);
  assert.equal(await superiores.inputValue(),'2');
  assert.equal(await superiores.locator('option[value=""]').textContent(),'Nenhuma');
  await page.getByLabel('Nome fantasia',{exact:true}).fill('Nome novo');
  await page.getByRole('button',{name:'Salvar instituição'}).click();
  await page.getByText('Instituição atualizada com sucesso.').waitFor();
  assert.deepEqual(calls.find(c=>c.method==='PATCH').body,{nome_fantasia:'Nome novo'});
  const before=calls.filter(c=>c.method==='POST').length;
  page.once('dialog',d=>d.dismiss());
  await page.getByRole('row',{name:/Demo A/}).getByRole('button',{name:'Inativar',exact:true}).click();
  assert.equal(calls.filter(c=>c.method==='POST').length,before);
  page.once('dialog',d=>d.accept());
  await page.getByRole('row',{name:/Demo A/}).getByRole('button',{name:'Inativar',exact:true}).click();
  await page.getByText('Instituição inativada com sucesso.').waitFor();
  page.once('dialog',d=>d.accept());
  await page.getByRole('row',{name:/Demo A/}).getByRole('button',{name:'Ativar',exact:true}).click();
  await page.getByText('Instituição ativada com sucesso.').waitFor();
  for(const width of [1280,768,390]){await page.setViewportSize({width,height:900});await page.screenshot({path:`/tmp/instituicoes-${width}.png`,fullPage:true});}
  for(const perfil of ['ADMIN_CLINICA','PROFISSIONAL','SUPORTE']){
   role=perfil; const count=calls.length;
   await page.goto(FRONT+'/admin/instituicoes'); await page.waitForURL('**/dashboard');
   assert.equal(calls.length,count);
   assert.equal(await page.getByRole('button',{name:'Instituições',exact:true}).count(),0);
  }
  assert.equal(errors.length,0,errors.join('\n'));
  assert.ok(calls.every(c=>['GET','POST','PATCH'].includes(c.method)));
  console.log('PASS: listagem, filtros, vazio, criação, erro preservando formulário, PATCH parcial, confirmação, inativação/ativação, 3 viewports, 3 perfis bloqueados; zero pageerrors.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
