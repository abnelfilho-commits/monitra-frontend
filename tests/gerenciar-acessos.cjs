const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.PESSOAS_FRONT_URL || 'http://127.0.0.1:5176';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage(); page.setDefaultTimeout(10000);
  const person={id:10,nome_completo:'Pessoa sintética',ativo:true,cpf:'52998224725'};
  const institutions=[{id:2,razao_social:'Instituição Alfa',ativo:true},{id:3,razao_social:'Instituição Beta',ativo:true}];
  let mismatch=null, delayAccess=null, readStarted=null;
  let accesses=[], links=[], professional=null, user=null, failRead=false, uncertain=false;
  const writes=[],unexpected=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const r=route.request(),u=new URL(r.url()); if(u.origin===FRONT)return route.continue();
   const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname==='/me')return reply({id:99,perfil:'ADMIN',nome:'Admin sintético',modulos:[]});
   if(u.pathname==='/admin/pessoas/')return reply([person,{...person,id:11,nome_completo:'Outra Pessoa'}]);
   if(u.pathname==='/admin/pessoas/11')return reply({...person,id:11,nome_completo:'Outra Pessoa'});
   if(u.pathname==='/admin/pessoas/11/acessos')return reply({pessoa_id:11,usuario:null,autorizacoes:[]});
   if(u.pathname==='/admin/pessoas/11/vinculos')return reply({pessoa_id:11,pacientes:[],profissionais:[]});
   if(u.pathname==='/admin/pessoas/10')return reply(person);
   if(u.pathname==='/admin/instituicoes/')return reply(institutions);
   if(u.pathname==='/admin/pessoas/10/acessos'){if(delayAccess){readStarted?.();await delayAccess;}return failRead?reply({},503):reply({pessoa_id:10,usuario:user,autorizacoes:accesses});}
   if(u.pathname==='/admin/pessoas/10/vinculos')return reply({pessoa_id:10,paciente_id:null,paciente_ativo:null,profissional_id:professional,profissional_ativo:professional?true:null,pacientes:[],profissionais:links});
   if(u.pathname.includes('ocupacoes'))return reply([{id:3,nome:'Psicólogo',ativo:true}]);
   if(r.method()!=='GET') {
    writes.push({path:u.pathname,body:r.postDataJSON()});
    if(u.pathname==='/admin/pessoas/10/acesso'){
     if(uncertain)return route.abort('failed');
     const b=r.postDataJSON();user={id:20,email:b.email,ativo:true};
     accesses.push({id:accesses.length+1,usuario_id:20,instituicao_id:b.instituicao_id,instituicao_nome:institutions.find(i=>i.id===b.instituicao_id).razao_social,instituicao_ativa:true,perfil_institucional:b.perfil_institucional,ativo:b.ativo});
     if(mismatch==='missing')accesses=[];
     if(mismatch==='account')user=null;
     if(mismatch==='profile')accesses.at(-1).perfil_institucional='GESTOR';
     if(mismatch==='inactive')accesses.at(-1).ativo=false;
     return reply({pessoa_id:10,usuario_id:20});
    }
    if(u.pathname==='/admin/identidades/papeis'){professional=42;return reply({pessoa_id:10,profissional_id:42});}
    if(u.pathname==='/admin/vinculos-institucionais/profissionais'){links.push({id:81,...r.postDataJSON(),ativo:true,instituicao_ativa:true,instituicao_nome:'Instituição Alfa'});return reply(links[0]);}
    unexpected.push(u.pathname);
   }
   return reply([]);
  });
  const open=async()=>{await page.goto(FRONT+'/admin/pessoas');await page.getByRole('button',{name:'Consultar',exact:true}).first().click();await page.getByRole('button',{name:'Gerenciar Acessos',exact:true}).click();await page.getByLabel('Instituição para gerenciar acesso').selectOption('2');};
  for(const profile of ['SUPORTE','PROFISSIONAL','GESTOR']){
   accesses=[];await open();assert.equal(await page.getByRole('dialog').count(),0);
   await page.getByLabel('Perfil para preparação').selectOption(profile);
   await page.getByRole('button',{name:user?'Habilitar em outra instituição':'Habilitar acesso',exact:true}).click();
   if(!user)await page.getByLabel('E-mail de acesso',{exact:true}).fill('synthetic@example.com');
   else assert.equal(await page.getByLabel('E-mail de acesso',{exact:true}).getAttribute('readonly'),'');
   await page.getByLabel('Senha inicial',{exact:true}).fill('Synthetic-not-real');
   await page.getByLabel('Autorização institucional ativa').check();
   const before=writes.length;
   await page.getByRole('button',{name:'Confirmar habilitação',exact:true}).evaluate(b=>{b.click();b.click();});
   await page.getByText('Acesso institucional habilitado e consultado. Nenhuma autorização clínica foi concedida.',{exact:true}).waitFor();
   assert.equal(writes.length,before+1);assert.equal(writes.at(-1).body.perfil_institucional,profile);assert.equal(writes.at(-1).body.instituicao_id,2);
  }
  // Scope isolation and no creation when an access already exists.
  await page.getByLabel('Instituição para gerenciar acesso').selectOption('3');
  await page.getByLabel('Perfil para preparação').selectOption('SUPORTE');
  await page.getByRole('button',{name:'Habilitar em outra instituição',exact:true}).waitFor();
  assert.equal(await page.getByText(/Acesso existente nesta instituição:/).count(),0);
  await page.getByLabel('Instituição para gerenciar acesso').selectOption('2');
  await page.getByLabel('Perfil para preparação').selectOption('PROFISSIONAL');
  await page.getByText(/Acesso existente nesta instituição: GESTOR/).waitFor();
  assert.equal(await page.getByRole('button',{name:'Habilitar em outra instituição',exact:true}).isDisabled(),true);
  // Explicit professional preparation is independent of the institutional profile.
  await page.getByLabel('Motivo da preparação profissional *',{exact:true}).fill('Teste sintético');
  await page.getByRole('button',{name:'Preparar Profissional',exact:true}).click();
  await page.getByText('Papel Profissional #42 — Ativo',{exact:true}).waitFor();
  assert.equal(links.length,0);
  await page.getByRole('button',{name:'Adicionar vínculo profissional institucional',exact:true}).click();
  await page.getByRole('combobox',{name:/Ocupação do vínculo profissional/}).selectOption('3');
  assert.equal(await page.getByRole('combobox',{name:/Instituição do vínculo profissional/}).inputValue(),'2');
  await page.getByLabel('Vínculo profissional — início *',{exact:true}).fill('2026-11-03');
  await page.getByLabel('Motivo do vínculo profissional *',{exact:true}).fill('Teste local');
  await page.getByRole('button',{name:'Criar vínculo profissional',exact:true}).click();
  await page.getByText(/Vínculo #81/).waitFor();assert.equal(links.length,1);
  await open();await page.getByLabel('Perfil para preparação').selectOption('PROFISSIONAL');await page.getByText(/Vínculo #81/).waitFor();
  assert.equal(await page.getByRole('button',{name:'Criar vínculo profissional',exact:true}).count(),0);
  // Dirty scope changes must be explicitly confirmed.
  await page.getByLabel('Instituição para gerenciar acesso').selectOption('3');await page.getByLabel('Perfil para preparação').selectOption('SUPORTE');
  await page.getByRole('button',{name:'Habilitar em outra instituição',exact:true}).click();await page.getByLabel('Senha inicial',{exact:true}).fill('Synthetic-draft');
  page.once('dialog',d=>d.dismiss());await page.getByLabel('Instituição para gerenciar acesso').selectOption('2');assert.equal(await page.getByLabel('Instituição para gerenciar acesso').inputValue(),'3');
  page.once('dialog',d=>d.accept());await page.getByLabel('Instituição para gerenciar acesso').selectOption('2');assert.equal(await page.getByLabel('Senha inicial',{exact:true}).count(),0);
  // Read failure never offers creation; uncertain writes never retry on navigation.
  failRead=true;await open();await page.getByLabel('Perfil para preparação').selectOption('SUPORTE');await page.getByText(/Não foi possível consultar o acesso persistido/).waitFor();assert.equal(await page.getByRole('button',{name:'Habilitar em outra instituição',exact:true}).count(),0);
  failRead=false;accesses=[];uncertain=true;await open();await page.getByLabel('Perfil para preparação').selectOption('SUPORTE');await page.getByRole('button',{name:'Habilitar em outra instituição',exact:true}).click();await page.getByLabel('Senha inicial',{exact:true}).fill('Synthetic-only');
  const before=writes.length;await page.getByRole('button',{name:'Confirmar habilitação',exact:true}).click();await page.getByText(/Resultado de escrita não confirmado. Novas escritas/).waitFor();assert.equal(writes.length,before+1);assert.equal(await page.getByLabel('Instituição para gerenciar acesso').isDisabled(),true);
  // The uncertain parent blocks navigation/remount, not just the submitting child.
  assert.equal(await page.getByRole('button',{name:'Voltar ao cadastro',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Voltar ao cadastro',exact:true}).evaluate(b=>b.click());
  assert.equal(await page.getByRole('region',{name:'Gerenciar Acessos',exact:true}).count(),1);
  assert.equal(writes.length,before+1);
  // Legacy entry must propagate the same persistent lock.
  await page.goto(FRONT+'/admin/pessoas');await page.getByRole('button',{name:'Consultar',exact:true}).first().click();
  await page.getByText('Acesso à plataforma',{exact:true}).click();
  await page.getByRole('button',{name:'Habilitar em outra instituição',exact:true}).click();
  await page.getByLabel('Instituição do acesso',{exact:true}).selectOption('2');
  await page.getByLabel('Perfil institucional',{exact:true}).selectOption('SUPORTE');
  await page.getByLabel('Senha inicial',{exact:true}).fill('Synthetic-only');
  await page.getByRole('button',{name:'Confirmar habilitação',exact:true}).click();
  await page.getByText(/Resultado de escrita não confirmado. Novas escritas/).waitFor();
  assert.equal(await page.getByRole('button',{name:'Gerenciar Acessos',exact:true}).isDisabled(),true);
  const afterLegacy=writes.length;
  await page.getByRole('button',{name:'Gerenciar Acessos',exact:true}).evaluate(b=>b.click());
  assert.equal(await page.getByLabel('Instituição para gerenciar acesso').count(),0);
  assert.equal(writes.length,afterLegacy);
  uncertain=false;
  for(const mode of ['missing','profile','inactive','account']){
   accesses=[];mismatch=mode;await open();await page.getByLabel('Perfil para preparação').selectOption('SUPORTE');
   await page.getByRole('button',{name:'Habilitar em outra instituição',exact:true}).click();
   await page.getByLabel('Senha inicial',{exact:true}).fill('Synthetic-only');await page.getByLabel('Autorização institucional ativa').check();
   await page.getByRole('button',{name:'Confirmar habilitação',exact:true}).click();
   await page.getByText(/Resultado de escrita não confirmado. Novas escritas/).waitFor();
   assert.equal(await page.getByText(/Acesso institucional habilitado e consultado/).count(),0);
   assert.equal(await page.getByLabel('Instituição para gerenciar acesso').isDisabled(),true);
  }
  mismatch=null;accesses=[];user={id:20,email:'synthetic@example.com',ativo:true};
  const civil=delta=>{const d=new Date();d.setDate(d.getDate()+delta);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  links=[{id:91,data_inicio:civil(1),ativo:true},{id:92,data_inicio:civil(-1),data_fim:civil(0),ativo:true},{id:93,data_inicio:civil(-2),data_fim:civil(-1),ativo:true},{id:94,data_inicio:civil(-1),ativo:false}].map(l=>({...l,instituicao_id:2,ocupacao_id:3}));
  await open();await page.getByLabel('Perfil para preparação').selectOption('PROFISSIONAL');
  for(const [id,state] of [[91,'Futuro'],[92,'Vigente'],[93,'Encerrado'],[94,'Inativo']])await page.getByText(new RegExp(`Vínculo #${id} .* ${state}`)).waitFor();
  // Resolve an old person's request only after selecting another person.
  let started;const startedRead=new Promise(resolve=>{started=resolve;});readStarted=started;
  let release;delayAccess=new Promise(resolve=>{release=resolve;});
  await page.goto(FRONT+'/admin/pessoas');await page.getByRole('button',{name:'Consultar',exact:true}).first().click();
  await startedRead;
  await page.getByRole('button',{name:'Voltar à lista',exact:true}).click();await page.getByRole('button',{name:'Consultar',exact:true}).nth(1).click();
  await page.getByRole('heading',{name:'Outra Pessoa',exact:true}).waitFor();const oldResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/admin/pessoas/10/acessos');release();delayAccess=null;await oldResponse;
  await page.getByText('Acesso à plataforma',{exact:true}).click();
  await page.getByRole('button',{name:'Habilitar acesso',exact:true}).waitFor();
  assert.equal(await page.getByText('synthetic@example.com',{exact:true}).count(),0);
  assert.deepEqual(unexpected,[]);assert.deepEqual(errors,[]);
  console.log('PASS D05.2: three profiles independently; existing account/access/link reuse; explicit professional preparation; no clinical writes; institution isolation; dirty navigation; read failure; duplicate clicks; uncertain result in both entries; mismatched persisted access blocked; civil validity; delayed person isolation; no context modal. Synthetic APIs only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
