const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.PESSOAS_FRONT_URL || 'http://127.0.0.1:5176';
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 try {
  const page = await browser.newPage(); page.setDefaultTimeout(10000);
  const errors=[],writes=[]; let fail=false, noRoots=false, empty=false;
  const person={id:10,nome_completo:'Pessoa sintética',cpf:'52998224725',ativo:true};
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());if(u.origin===FRONT)return route.continue();
   if(req.method()!=='GET')writes.push(u.pathname);
   const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname==='/me')return reply({id:99,perfil:'ADMIN',nome:'Admin',modulos:[]});
   if(u.pathname==='/admin/pessoas/')return reply([person]);
   if(u.pathname==='/admin/pessoas/10')return reply(person);
   if(u.pathname==='/admin/pessoas/10/acessos')return fail?reply({detail:{code:'PERSON_READ_FAILED'}},500):reply({pessoa_id:10,usuario:empty?null:{id:20,email:'native@example.com',ativo:false},autorizacoes:empty||noRoots?[]:[
    {id:30,instituicao_id:2,instituicao_nome:'Instituição A',instituicao_ativa:true,perfil_institucional:'SUPORTE',ativo:true},
    {id:31,instituicao_id:3,instituicao_nome:'Instituição B',instituicao_ativa:false,perfil_institucional:'GESTOR',ativo:false}]});
   if(u.pathname==='/admin/pessoas/10/vinculos')return fail?reply({},500):reply({pessoa_id:10,paciente_id:empty?null:40,profissional_id:empty?null:50,pacientes:empty?[]:[{id:60,paciente_id:40,instituicao_id:2,instituicao_nome:'Instituição A',instituicao_ativa:true,tipo_vinculo:'COLABORADOR',data_inicio:'2026-01-01',data_fim:null,ativo:true}],profissionais:empty?[]:[{id:70,profissional_id:50,instituicao_id:3,instituicao_nome:'Instituição B',instituicao_ativa:false,ocupacao_id:8,data_inicio:'2025-01-01',data_fim:'2025-12-31',ativo:false}]});
   throw Error('Unexpected HTTP '+req.method()+' '+u.pathname);
  });
  async function open(){await page.goto(FRONT+'/admin/pessoas');await page.getByRole('button',{name:'Ver / Editar'}).click();}
  for(let i=0;i<2;i++){
   await open();await page.getByText('native@example.com',{exact:true}).waitFor();
   const access=page.locator('section').filter({has:page.getByRole('heading',{name:'Acesso à plataforma',exact:true})});
   await access.getByText('Inativa',{exact:true}).waitFor();
   await access.getByText('Perfil: SUPORTE · Autorização: Ativa',{exact:true}).waitFor();
   await access.getByText('Perfil: GESTOR · Autorização: Inativa',{exact:true}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Habilitar acesso',exact:true}).count(),0);
   assert.equal(await page.getByLabel('Senha inicial',{exact:true}).count(),0);
   await page.getByRole('cell',{name:'Colaborador',exact:true}).waitFor();
   await page.getByRole('cell',{name:'Ocupação #8',exact:true}).waitFor();
   await page.getByRole('cell',{name:'31/12/2025',exact:true}).waitFor();
   await page.getByRole('cell',{name:'Invalidado',exact:true}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Preparar papel assistencial',exact:true}).count(),0);
   assert.equal(await page.getByRole('button',{name:'Criar vínculo',exact:true}).count(),0);
  }
  noRoots=true;await page.getByRole('button',{name:'Atualizar acesso',exact:true}).click();
  await page.getByText('Nenhuma autorização institucional registrada.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Habilitar acesso',exact:true}).count(),0);
  fail=true;await open();
  await page.getByRole('alert').filter({hasText:'Não foi possível consultar o acesso persistido'}).waitFor();
  await page.getByRole('alert').filter({hasText:'Não foi possível consultar vínculos persistidos'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Habilitar acesso',exact:true}).count(),0);
  assert.equal(await page.getByText('Nenhum vínculo institucional registrado.',{exact:true}).count(),0);
  fail=false;empty=true;
  await page.getByRole('button',{name:'Atualizar acesso',exact:true}).click();
  await page.getByRole('button',{name:'Atualizar vínculos da Pessoa',exact:true}).click();
  await page.getByRole('button',{name:'Habilitar acesso',exact:true}).waitFor();
  await page.getByText('Nenhum vínculo institucional registrado.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Preparar papel assistencial',exact:true}).waitFor();
  assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
  console.log('IAM-N1.1 PASS: reload/reconsulta, conta inativa, múltiplas autorizações, vínculos dos dois papéis, ausência comprovada, falha fechada, zero escritas.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
