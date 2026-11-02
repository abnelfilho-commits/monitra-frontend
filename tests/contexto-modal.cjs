const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.PESSOAS_FRONT_URL || 'http://127.0.0.1:5176';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();page.setDefaultTimeout(10000);
  const person={id:10,nome_completo:'Pessoa sintética do modal',ativo:true,cpf:null};
  const link={id:20,paciente_id:30,instituicao_id:2,instituicao_nome:'Instituição sintética',instituicao_ativa:true,ativo:true,data_inicio:'2026-01-01',data_fim:null,tipo_vinculo:'ASSISTENCIAL'};
  let contexts=[{id:40,instituicao_id:2,paciente_id:30,paciente_instituicao_id:20,ativo:true,data_inicio:'2026-01-01',data_fim:null}], denied=false, uncertain=false, hold=null, active=false, empty=false;
  const writes=[],errors=[],calls=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());if(u.origin===FRONT)return route.continue();
   const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   calls.push({path:u.pathname,method:req.method(),query:u.search});
   if(req.method()!=='GET')writes.push({path:u.pathname,body:req.postDataJSON()});
   if(u.pathname==='/me')return reply({id:99,perfil:'ADMIN',nome:'Admin sintético',modulos:[]});
   if(u.pathname==='/admin/pessoas/')return reply([person]);
   if(u.pathname==='/admin/pessoas/10')return reply(person);
   if(u.pathname==='/admin/pessoas/10/acessos')return reply({pessoa_id:10,usuario:null,autorizacoes:[]});
   if(u.pathname==='/admin/pessoas/10/vinculos')return reply({pessoa_id:10,paciente_id:30,paciente_ativo:true,profissional_id:null,profissional_ativo:null,pacientes:[link],profissionais:[]});
   if(u.pathname==='/admin/instituicoes/')return reply([{id:2,razao_social:'Instituição sintética',ativo:true},{id:3,razao_social:'Outra instituição',ativo:true}]);
   if(u.pathname==='/operacao-assistencial/contextos')return reply(u.searchParams.get('instituicao_id')==='3'?[]:contexts.map(c=>({id:c.id,data_inicio:c.data_inicio,data_fim:c.data_fim})));
   if(u.pathname==='/admin/contextos-assistenciais/' && req.method()==='POST'){
    if(uncertain)return route.abort('failed');
    const body=req.postDataJSON();contexts=[{id:42,instituicao_id:2,paciente_id:30,ativo:true,...body}];return reply(contexts[0],201);
   }
   if(u.pathname.startsWith('/admin/contextos-assistenciais/')){
    if(denied)return reply({detail:{code:'RESOURCE_NOT_FOUND'}},404);
    if(hold)await hold;
    return reply(contexts.find(c=>c.id===Number(u.pathname.split('/').pop())));
   }
   if(u.pathname.startsWith('/operacao-assistencial/contextos/')){
    if(req.method()==='POST'){
     if(uncertain)return route.abort('failed');
     assert.ok(u.pathname.endsWith('/saude-mental/ativar'));active=true;return reply({ok:true});
    }
    return reply({instituicao_id:2,contexto_id:Number(u.pathname.split('/').pop()),linha:{id:1,ativo:active},acoes:{ativar_linha:!active,desativar_linha:active,bootstrap:true,recovery_capacidades:[],conceder_capacidades:[],administrar_participacao:false},contas:empty?[]:[{id:55,nome:'Responsável sintético'}],profissionais:[],autoridades:[],grants:[],participacoes:[]});
   }
   return reply([]);
  });
  const modal=()=>page.getByRole('dialog',{name:/Configurar contexto/});
  const open=async()=>{await page.goto(FRONT+'/admin/pessoas');await page.getByRole('button',{name:'Consultar',exact:true}).click();await page.getByRole('button',{name:'Configurar contexto',exact:true}).click();await modal().getByRole('combobox',{name:'Instituição do contexto'}).waitFor();};
  const next=()=>modal().getByRole('button',{name:'Avançar',exact:true}).click();
  const back=()=>modal().getByRole('button',{name:'Voltar',exact:true}).click();
  const toContext=async()=>{await next();await modal().getByText('Estado do papel:',{exact:false}).waitFor();await next();await modal().getByRole('combobox',{name:'Contexto existente'}).waitFor();};
  await open();assert.equal(await modal().getByRole('combobox',{name:'Instituição do contexto'}).inputValue(),'2');
  await toContext();assert.equal(await modal().getByRole('combobox',{name:'Contexto existente'}).inputValue(),'40');
  assert.equal(await modal().getByRole('button',{name:'Criar contexto',exact:true}).count(),0);assert.equal(writes.length,0);
  // Existing context, explicit activation, then reopen: state is fetched, not replayed.
  await modal().getByRole('button',{name:'Ativar Saúde Mental',exact:true}).click();await modal().getByText(/Operação confirmada/).waitFor();
  assert.equal(writes.length,1);await modal().getByRole('button',{name:'Fechar',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Configurar contexto',exact:true}).evaluate(e=>e===document.activeElement),true);
  await page.getByRole('button',{name:'Configurar contexto',exact:true}).click();await modal().getByRole('button',{name:'Desativar Saúde Mental',exact:true}).waitFor();assert.equal(writes.length,1);
  await next();await modal().getByRole('heading',{name:'Configurar contexto — Responsáveis',exact:true}).waitFor();
  await modal().getByRole('button',{name:'Administração de participações',exact:true}).click();await modal().getByText(/Esta conta não está autorizada a delegar/).waitFor();
  await next();await modal().getByText(/Esta conta não possui permissão para administrar/).waitFor();
  await modal().getByRole('button',{name:'Resolver cadastro e vínculo de um profissional',exact:true}).click();
  await modal().getByLabel('Nome do responsável',{exact:true}).fill('Pessoa');
  await modal().getByRole('button',{name:'Buscar responsável',exact:true}).click();
  await modal().getByRole('combobox',{name:'Pessoa responsável',exact:true}).selectOption('10');
  await modal().getByRole('combobox',{name:'Pré-requisito profissional',exact:true}).waitFor();
  await modal().getByRole('combobox',{name:'Pré-requisito profissional',exact:true}).selectOption('link');
  await modal().getByRole('combobox',{name:'Pré-requisito profissional',exact:true}).selectOption('access');
  assert.equal(writes.length,1);
  await modal().getByRole('button',{name:'Voltar às permissões',exact:true}).click();
  await modal().getByRole('button',{name:'Permissões de atendimento',exact:true}).click();await modal().getByText(/Esta conta não está autorizada a delegar/).waitFor();
  await next();await modal().getByRole('heading',{name:'Resumo do estado operacional',exact:true}).waitFor();assert.equal(writes.length,1);
  await page.keyboard.press('Escape');assert.equal(await modal().count(),0);
  // Multiple matching contexts require a choice; another patient's context is excluded.
  contexts.push({...contexts[0],id:41,data_inicio:'2027-01-01'},{...contexts[0],id:90,paciente_id:88,paciente_instituicao_id:89});
  await open();await toContext();assert.equal(await modal().getByRole('combobox',{name:'Contexto existente'}).inputValue(),'');
  assert.equal(await modal().getByRole('combobox',{name:'Contexto existente'}).locator('option').count(),3);
  assert.equal(await modal().getByRole('button',{name:'Avançar',exact:true}).isDisabled(),true);
  await modal().getByRole('combobox',{name:'Contexto existente'}).selectOption('41');await next();empty=true;
  await modal().getByRole('button',{name:'Atualizar estado',exact:true}).click();await modal().getByText(/Nenhum candidato disponível/).waitFor();
  const fs=require('node:fs');const shots='/private/tmp/integra-p3-modal';fs.mkdirSync(shots,{recursive:true});
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:850});await page.screenshot({path:`${shots}/modal-${width}.png`});
   const bounds=await modal().boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=851);
   assert.equal(await modal().getByRole('button',{name:'Fechar',exact:true}).isVisible(),true);
   await modal().getByRole('button',{name:'Avançar',exact:true}).focus();await page.keyboard.press('Tab');assert.equal(await modal().evaluate(d=>d.contains(document.activeElement)),true);
  }
  await page.keyboard.press('Escape');
  // Failed context resolution is never treated as permission to create one.
  denied=true;await open();await next();await next();await modal().getByRole('alert').waitFor();assert.equal(await modal().getByRole('button',{name:'Preparar novo contexto',exact:true}).count(),0);denied=false;
  // Changing institution while detail lookup is pending cannot leak the prior match.
  let release;hold=new Promise(r=>release=r);await open();await modal().getByRole('combobox',{name:'Instituição do contexto'}).selectOption('3');release();hold=null;await next();await next();await modal().getByText(/Nenhum contexto ativo desta Pessoa/).waitFor();assert.equal(await modal().getByRole('combobox',{name:'Contexto existente'}).count(),0);
  // Creation is explicit only after confirmed absence, and remains one POST.
  contexts=[];await open();await next();await next();await modal().getByRole('button',{name:'Preparar novo contexto',exact:true}).click();
  await modal().getByLabel('Início do contexto',{exact:true}).fill('2026-11-02');
  await modal().getByRole('button',{name:'Criar contexto',exact:true}).evaluate(b=>{b.click();b.click();});
  await modal().getByRole('combobox',{name:'Contexto existente'}).waitFor();assert.equal(await modal().getByRole('combobox',{name:'Contexto existente'}).inputValue(),'42');assert.equal(writes.filter(w=>w.path==='/admin/contextos-assistenciais/').length,1);
  active=false;uncertain=true;await modal().getByRole('button',{name:'Atualizar estado',exact:true}).click();await modal().getByRole('button',{name:'Ativar Saúde Mental',exact:true}).click();await modal().getByRole('alert').filter({hasText:'Resultado não confirmado. Escritas bloqueadas'}).waitFor();
  const before=writes.length;await modal().getByRole('button',{name:'Fechar',exact:true}).click();await page.getByRole('button',{name:'Configurar contexto',exact:true}).click();await modal().getByRole('button',{name:'Ativar Saúde Mental',exact:true}).waitFor();assert.equal(await modal().getByRole('button',{name:'Ativar Saúde Mental',exact:true}).isDisabled(),true);assert.equal(writes.length,before);
  assert.equal(errors.length,0,errors.join('\n'));
  assert.ok(calls.filter(c=>c.path.startsWith('/admin/contextos-assistenciais/')&&c.method==='GET').every(c=>c.query.includes('instituicao_id=2')));
  console.log('PASS: modal from Person; unique/multiple/cross-person contexts; no duplicate creation on resume; explicit creation; actor blockers; six steps; saved state reopening; Escape/focus; late scope/read failure; uncertain write locked after reopen; desktop/mobile. Synthetic APIs only.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
