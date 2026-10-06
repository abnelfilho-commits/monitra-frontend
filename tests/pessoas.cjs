const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.PESSOAS_FRONT_URL || 'http://127.0.0.1:5176';
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 try {
  const page = await browser.newPage(); page.setDefaultTimeout(10000);
  let role='ADMIN', lookupExists=false, failure=null, unknown=false;
  const rows=Array.from({length:21},(_,i)=>({id:i+1,nome_completo:`Pessoa sintética ${i+1}`,cpf:'52998224725',nome_social:null,data_nascimento:null,sexo:null,email:null,telefone:null,ativo:true}));
  const calls=[], errors=[]; let links=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const req=route.request(), u=new URL(req.url());
   if(u.origin===FRONT)return route.continue();
   const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname==='/me')return reply({id:99,nome:'Admin sintético',perfil:role,modulos:[]});
   if(!u.pathname.startsWith('/admin/'))return reply([]);
   const body=req.postDataJSON(); calls.push({method:req.method(),path:u.pathname,query:u.search,body});
   if(failure?.path===u.pathname)return reply({detail:{code:failure.code}},failure.status);
   if(u.pathname==='/admin/pessoas/')return reply(rows.slice(Number(u.searchParams.get('offset')),Number(u.searchParams.get('offset'))+Number(u.searchParams.get('limit'))));
   if(/^\/admin\/pessoas\/\d+$/.test(u.pathname)){const row=rows.find(r=>r.id===Number(u.pathname.split('/').at(-1)));if(req.method()==='PATCH')Object.assign(row,body);return reply(row);}
   if(u.pathname==='/admin/identidades/localizar')return reply(lookupExists?{encontrada:true,pessoa:rows[0]}:{encontrada:false});
   if(u.pathname==='/admin/identidades/pessoas'){rows.push({id:30,ativo:true,...body.pessoa});return reply({pessoa_id:30,resultado:'PESSOA_CRIADA'});}
   if(u.pathname==='/admin/identidades/papeis')return reply({pessoa_id:1,paciente_id:71,resultado:'PAPEL_REUTILIZADO'});
   if(u.pathname==='/admin/instituicoes/')return reply([{id:4,razao_social:'Empresa sintética',ativo:true},{id:5,razao_social:'Outra empresa',ativo:true}]);
   if(u.pathname==='/admin/vinculos-institucionais/pacientes'){
    if(req.method()==='GET')return reply(links.filter(l=>l.instituicao_id===Number(u.searchParams.get('instituicao_id'))));
    const l={id:81,...body,ativo:true};links.push(l);return reply(l);
   }
   if(u.pathname==='/admin/contextos-assistenciais/'){
    if(unknown)return route.abort('failed');
    return reply({id:91,instituicao_id:4,ativo:true,...body},201);
   }
   if(u.pathname==='/admin/contextos-assistenciais/91')return reply({id:91,instituicao_id:4,paciente_instituicao_id:81,ativo:true,data_inicio:'2026-02-01',data_fim:null});
   if(u.pathname==='/admin/contextos-assistenciais/91/linhas')return reply({id:101,contexto_assistencial_id:91,modulo_id:3,ativo:false},201);
   throw Error('HTTP não autorizado no teste: '+u.pathname);
  });
  await page.goto(FRONT+'/admin/pessoas');
  await page.getByRole('row',{name:/Pessoa sintética 20 /}).waitFor();
  await page.getByRole('button',{name:'Próxima',exact:true}).click();
  await page.getByRole('row',{name:/Pessoa sintética 21 /}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Próxima',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Anterior',exact:true}).click();
  await page.getByRole('button',{name:'+ Nova Pessoa'}).click();
  await page.getByLabel('CPF *',{exact:true}).fill('52998224725');
  failure={path:'/admin/identidades/localizar',status:422,code:'INVALID_PAYLOAD'};
  await page.getByRole('button',{name:'Localizar',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Confira os campos'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Criar Pessoa',exact:true}).count(),0);
  for(const [status, text] of [[400,'Operação inválida'],[403,'Operação exclusiva'],[404,'Cadastro não encontrado']]){
   failure={path:'/admin/identidades/localizar',status,code:'SYNTHETIC'};
   await page.getByRole('button',{name:'Localizar',exact:true}).click();
   await page.getByRole('alert').filter({hasText:text}).waitFor();
  }
  failure=null;lookupExists=true;
  await page.getByRole('button',{name:'Localizar',exact:true}).click();
  await page.getByRole('button',{name:'Reutilizar Pessoa',exact:true}).click();
  await page.getByLabel('Nome completo *',{exact:true}).fill('Nome atualizado');
  await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();
  await page.getByText('Cadastro atualizado.',{exact:true}).waitFor();
  assert.deepEqual(calls.find(c=>c.method==='PATCH').body,{nome_completo:'Nome atualizado'});
  assert.equal(calls.filter(c=>c.path==='/admin/identidades/pessoas').length,0);
  await page.getByLabel('Motivo da preparação *',{exact:true}).fill('Preparação explícita sintética');
  failure={path:'/admin/identidades/papeis',status:409,code:'CADASTRAL_CONFLICT'};
  await page.getByRole('button',{name:'Preparar papel assistencial',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'divergência cadastral'}).waitFor();
  failure=null;
  await page.getByRole('button',{name:'Preparar papel assistencial',exact:true}).click();
  await page.getByLabel('Instituição *',{exact:true}).selectOption('4');
  await page.getByText('Nenhum vínculo encontrado nesta instituição.',{exact:true}).waitFor();
  const commands=calls.filter(c=>c.path==='/admin/identidades/papeis');
  assert.equal(commands[0].body.chave_idempotencia,commands[1].body.chave_idempotencia);
  assert.equal(commands[1].body.papel,'PACIENTE');
  await page.getByLabel('Tipo de vínculo *',{exact:true}).selectOption('COLABORADOR');
  await page.getByLabel('Vínculo — início *',{exact:true}).fill('2026-01-01');
  assert.equal(await page.getByLabel('Motivo do vínculo *',{exact:true}).inputValue(),'');
  await page.getByLabel('Motivo do vínculo *',{exact:true}).fill('Admissão sintética');
  await page.getByRole('button',{name:'Criar vínculo',exact:true}).click();
  await page.getByLabel('Contexto — início *',{exact:true}).fill('2026-02-01');
  failure={path:'/admin/contextos-assistenciais/',status:409,code:'CONTEXT_PERIOD_CONFLICT'};
  await page.getByRole('button',{name:'Criar contexto',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'período sobreposto'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Adicionar Saúde Mental',exact:true}).count(),0);
  failure=null;
  const beforeContext=calls.filter(c=>c.path==='/admin/contextos-assistenciais/').length;
  await page.getByRole('button',{name:'Criar contexto',exact:true}).evaluate(button=>{button.form.requestSubmit();button.form.requestSubmit();});
  await page.getByRole('button',{name:'Consultar contexto',exact:true}).waitFor();
  assert.equal(calls.filter(c=>c.path==='/admin/contextos-assistenciais/').length,beforeContext+1);
  await page.getByRole('button',{name:'Consultar contexto',exact:true}).click();
  await page.getByRole('button',{name:'Adicionar Saúde Mental',exact:true}).waitFor();
  failure={path:'/admin/contextos-assistenciais/91/linhas',status:409,code:'CONTEXT_LINE_DUPLICATE'};
  await page.getByRole('button',{name:'Adicionar Saúde Mental',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'já existe neste contexto'}).waitFor();
  failure=null;
  await page.getByRole('button',{name:'Adicionar Saúde Mental',exact:true}).click();
  await page.getByText(/Saúde Mental adicionada — inativa/).waitFor();
  assert.ok(calls.some(c=>c.path==='/admin/contextos-assistenciais/91'&&c.query==='?instituicao_id=4'));
  assert.deepEqual(calls.filter(c=>c.path.endsWith('/linhas')).at(-1).body,{modulo_id:3});
  assert.equal(calls.filter(c=>c.path.endsWith('/linhas')).at(-1).query,'?instituicao_id=4');
  assert.deepEqual(calls.find(c=>c.method==='POST'&&c.path==='/admin/contextos-assistenciais/').body,{paciente_instituicao_id:81,data_inicio:'2026-02-01',data_fim:null});
  for(const width of [1280,768,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`/tmp/pessoas-${width}.png`,fullPage:true});}
  await page.getByLabel('Instituição *',{exact:true}).selectOption('5');
  await page.getByText('Nenhum vínculo encontrado nesta instituição.',{exact:true}).waitFor();
  assert.equal(await page.getByText(/Saúde Mental adicionada/).count(),0);
  assert.equal(await page.getByLabel('Motivo do vínculo *',{exact:true}).inputValue(),'');
  await page.getByLabel('Instituição *',{exact:true}).selectOption('4');
  await page.getByRole('button',{name:'Usar vínculo',exact:true}).click();
  await page.getByLabel('Contexto — início *',{exact:true}).fill('2026-02-01');
  unknown=true;
  await page.getByRole('button',{name:'Criar contexto',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Resultado da escrita não confirmado'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Criar contexto',exact:true}).isDisabled(),true);
  assert.equal(await page.getByRole('button',{name:'Salvar alterações',exact:true}).isDisabled(),true);
  unknown=false;
  await page.getByRole('button',{name:'Voltar à lista',exact:true}).click();
  lookupExists=false;
  await page.getByRole('button',{name:'+ Nova Pessoa'}).click();
  await page.getByLabel('CPF *',{exact:true}).fill('11144477735');
  await page.getByRole('button',{name:'Localizar',exact:true}).click();
  await page.getByLabel('Nome completo *',{exact:true}).fill('Nova sintética');
  await page.getByLabel('Motivo do cadastro *',{exact:true}).fill('Cadastro explícito');
  await page.getByRole('button',{name:'Criar Pessoa',exact:true}).click();
  await page.getByText('Pessoa criada. Nenhum vínculo foi criado por esta operação.',{exact:true}).waitFor();
  assert.equal(calls.filter(c=>c.path==='/admin/identidades/pessoas').length,1);
  assert.equal(await page.getByLabel('Motivo da preparação *',{exact:true}).inputValue(),'');
  await page.getByLabel('Motivo da preparação *',{exact:true}).fill('Papel independente');
  await page.getByRole('button',{name:'Preparar papel assistencial',exact:true}).click();
  await page.getByLabel('Instituição *',{exact:true}).waitFor();
  assert.equal(calls.filter(c=>c.path==='/admin/identidades/papeis').at(-1).body.motivo,'Papel independente');
  for(const perfil of ['ADMIN_CLINICA','PROFISSIONAL','SUPORTE']){role=perfil;const count=calls.length;await page.goto(FRONT+'/admin/pessoas');await page.waitForURL('**/dashboard');assert.equal(calls.length,count);}
  for(const c of calls){if(c.body){assert.equal('ator_usuario_id' in c.body,false);assert.equal('clinica_id' in c.body,false);assert.equal('senha' in c.body,false);}}
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS: paginação, CPF, reuso sem duplicação, criação, PATCH parcial sem CPF, idempotência, papel explícito, vínculo, contexto, conflitos, linha inativa, troca institucional, abort sem retry, 3 viewports, 3 perfis bloqueados; zero pageerrors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
