const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.PESSOAS_FRONT_URL || 'http://127.0.0.1:5186';
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 try {
  const page = await browser.newPage(); page.setDefaultTimeout(10000);
  const errors=[],calls=[]; let rejectPatch=false, failLinks=false, failAccess=false;
  const rows=Array.from({length:21},(_,i)=>({id:i+1,nome_completo:`Pessoa de teste ${i+1}`,nome_social:null,cpf:'11144477735',ativo:true}));
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const r=route.request(),u=new URL(r.url()); if(u.origin===FRONT)return route.continue();
   calls.push({path:u.pathname,method:r.method()});
   const reply=(v,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(v)});
   if(u.pathname==='/me')return reply({id:99,nome:'Administrador sintético',perfil:'ADMIN',modulos:[]});
   if(u.pathname==='/admin/pessoas/')return reply(rows.slice(+u.searchParams.get('offset'),+u.searchParams.get('offset')+20));
   if(u.pathname==='/admin/pessoas/21'){
    if(r.method()==='PATCH'){if(rejectPatch)return reply({detail:{code:'INVALID'}},422);Object.assign(rows[20],r.postDataJSON());}
    return reply(rows[20]);
   }
   if(u.pathname.endsWith('/21/vinculos'))return failLinks?reply({},500):reply({pessoa_id:21,paciente_id:50,paciente_ativo:true,profissional_id:null,profissional_ativo:null,pacientes:[],profissionais:[]});
   if(u.pathname.endsWith('/21/acessos'))return failAccess?reply({},500):reply({pessoa_id:21,usuario:null,autorizacoes:[]});
   if(u.pathname==='/admin/instituicoes/')return reply([{id:2,razao_social:'Instituição de teste',ativo:true}]);
   return reply([]);
  });
  await page.goto(FRONT+'/admin/pessoas');
  await page.getByRole('button',{name:'Próxima',exact:true}).click();
  await page.getByText('Página 2',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Consultar',exact:true}).click();
  const titles=['Identificação e dados cadastrais','Papéis e atuação','Instituições vinculadas','Acesso à plataforma'];
  for(const name of titles)assert.equal(await page.getByRole('button',{name,exact:true}).getAttribute('aria-expanded'),'false');
  await page.getByText(/Paciente: Ativo · Profissional: Não preparado/).waitFor();
  assert.equal(await page.getByRole('button',{name:'Ativar papel de Paciente',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Salvar alterações'}).isVisible(),false);
  if(process.env.PESSOAS_SCREENSHOTS)for(const width of [1440,768,390]){ await page.setViewportSize({width,height:900});await page.screenshot({path:`${process.env.PESSOAS_SCREENSHOTS}/pessoas-resumo-${width}.png`,fullPage:true}); }
  const reads=calls.filter(c=>c.path.endsWith('/21/vinculos')).length;
  const identity=page.getByRole('button',{name:titles[0],exact:true});
  await identity.focus();
  await identity.press('Enter');assert.equal(await identity.evaluate(e=>e.matches(':focus-visible') && getComputedStyle(e).outlineStyle!=='none'),true);assert.equal(await identity.getAttribute('aria-expanded'),'true');
  await page.getByRole('button',{name:'Editar dados',exact:true}).click();
  const name=page.getByLabel('Nome completo *',{exact:true}); await name.fill('Cadastro editado');
  await identity.click();await identity.click();assert.equal(await name.inputValue(),'Cadastro editado');
  assert.equal(calls.filter(c=>c.path.endsWith('/21/vinculos')).length,reads);
  page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Cancelar edição'}).click();assert.equal(await name.inputValue(),'Cadastro editado');
  page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Voltar à lista'}).click();assert.equal(await name.isVisible(),true);
  rejectPatch=true;await page.getByRole('button',{name:'Salvar alterações'}).click();await page.getByRole('alert').filter({hasText:'Confira os campos'}).waitFor();assert.equal(await name.inputValue(),'Cadastro editado');
  rejectPatch=false;await page.getByRole('button',{name:'Salvar alterações'}).click();await page.getByText('Cadastro atualizado.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Voltar à lista'}).click();await page.getByText('Página 2',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Consultar',exact:true}).click();
  await page.getByRole('button',{name:titles[1],exact:true}).click();
  const reason=page.getByLabel('Motivo da preparação profissional *');await reason.fill('Rascunho preservado');
  await page.getByRole('button',{name:titles[1],exact:true}).click();await page.getByRole('button',{name:titles[1],exact:true}).click();assert.equal(await reason.inputValue(),'Rascunho preservado');
  await page.getByRole('button',{name:titles[2],exact:true}).click();
  await page.getByRole('button',{name:'Adicionar vínculo institucional / preparar contexto'}).click();
  await page.getByLabel('Instituição *',{exact:true}).selectOption('2');
  await page.getByLabel('Motivo do vínculo *',{exact:true}).fill('Vínculo em preparação');
  await page.getByRole('button',{name:'Fechar preparação de vínculo'}).click();await page.getByRole('button',{name:'Adicionar vínculo institucional / preparar contexto'}).click();
  assert.equal(await page.getByLabel('Motivo do vínculo *',{exact:true}).inputValue(),'Vínculo em preparação');
  await page.getByRole('link',{name:'Administrar Instituições',exact:true}).click();await page.getByRole('dialog',{name:'Descartar alterações não salvas?'}).getByRole('button',{name:'Continuar editando'}).click();assert.equal(new URL(page.url()).pathname,'/admin/pessoas');
  for(const width of [1440,768,390]){
   await page.setViewportSize({width,height:900});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   for(const title of titles)assert.equal(await page.getByRole('button',{name:title,exact:true}).isVisible(),true);
   if(process.env.PESSOAS_SCREENSHOTS)await page.screenshot({path:`${process.env.PESSOAS_SCREENSHOTS}/pessoas-${width}.png`,fullPage:true});
  }
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Voltar à lista'}).click();
  failLinks=true;failAccess=true;
  await page.getByRole('button',{name:'Consultar',exact:true}).click();
  await page.getByText('Não foi possível confirmar os vínculos.',{exact:true}).waitFor();await page.getByText('Não foi possível confirmar o acesso.',{exact:true}).waitFor();
  assert.equal(await page.getByText('Nenhum vínculo institucional registrado.',{exact:true}).count(),0);
  await page.getByRole('button',{name:titles[0],exact:true}).click();await page.getByRole('button',{name:'Editar dados',exact:true}).click();assert.equal(await name.inputValue(),'Cadastro editado');
  assert.deepEqual(errors,[]);assert.equal(calls.filter(c=>!['GET','PATCH'].includes(c.method)).length,0);
  console.log('Pessoas UX PASS: quatro áreas, resumos, teclado, edição/PATCH, conflito, descarte/cancelamento, paginação, rascunhos preservados, sem GET extra na expansão, falhas independentes, 1440/768/390, zero pageerrors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
