const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT=process.env.MENTAL_FRONT_URL || 'http://127.0.0.1:5176';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();page.setDefaultTimeout(10000);
  let mode='ok',parts=[],actor='ADMIN';const writes=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const r=route.request(),u=new URL(r.url());if(u.origin===FRONT)return route.continue();
   const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname==='/me')return reply({id:99,perfil:actor,nome:'Teste',modulos:[]});
   if(u.pathname==='/operacao-assistencial/instituicoes')return reply([{id:4,nome:'Instituição teste'},{id:5,nome:'Outra instituição'}]);
   assert.equal(u.pathname.startsWith('/admin/'),false,'D05.3 must not use ADMIN discovery');
   if(u.pathname==='/operacao-assistencial/contextos'){
    if(mode==='discoveryDenied')return reply({},403);
    if(['none','unauthorized'].includes(mode) || u.searchParams.get('instituicao_id')==='5')return reply([]);
    const row={id:9,data_inicio:'2026-01-01',data_fim:null,instituicao_id:4,pessoa_id:10,paciente_id:70,paciente_instituicao_id:80};
    if(mode==='crossInstitution')row.instituicao_id=5;
    if(mode==='missingIdentity')delete row.pessoa_id;
    if(mode==='legacy')row.pessoa_id=null;
    if(mode==='wrongPatient')return reply([row,{...row,id:12,pessoa_id:11,paciente_id:71}]);
    if(mode==='wrongContext')return reply([row,{...row,paciente_instituicao_id:81}]);
    return reply([row]);
   }
   if(u.pathname==='/operacao-assistencial/contextos/9/participacoes'){
    writes.push({path:u.pathname,query:u.search,body:r.postDataJSON()});
    if(mode==='uncertain')return route.abort('failed');
    if(mode==='overlap')return reply({detail:{code:'PARTICIPATION_PERIOD_CONFLICT'}},409);
    if(mode==='ineligiblePost')return reply({detail:{code:'PROFESSIONAL_LINK_INELIGIBLE'}},409);
    if(mode==='deniedPost')return reply({detail:{code:'CONTEXT_ADMINISTRATION_DENIED'}},403);
    const row={id:61,instituicao_id:4,contexto_assistencial_id:9,...r.postDataJSON(),encerrado_em:null,invalidado_em:null};
    if(mode!=='unconfirmed')parts.push(row);return reply(row);
   }
   if(u.pathname==='/operacao-assistencial/contextos/9')return reply({instituicao_id:4,contexto_id:9,acoes:{administrar_participacao:mode!=='denied',conceder_capacidades:[],recovery_capacidades:[]},contas:[],autoridades:[],grants:[],participacoes:parts,profissionais:mode==='ineligible'?[]:[{id:21,profissional:'Profissional teste',data_inicio:'2020-01-01',data_fim:null}]});
   assert.equal(r.method(),'GET','Unexpected write '+u.pathname);return reply([]);
  });
  const open=async(next)=>{mode=next;parts=[];await page.goto(FRONT+'/operacao-assistencial');await page.getByRole('button',{name:'Vincular Pessoa a Profissional',exact:true}).click();await page.getByLabel('Instituição do vínculo').selectOption('4');};
  const patient=async()=>page.getByLabel('Pessoa paciente').selectOption('10');
  const context=async()=>page.getByLabel('Contexto do paciente').selectOption('9');
  const fill=async()=>{await page.getByLabel('Profissional com vínculo vigente',{exact:true}).selectOption('21');await page.getByLabel('Início da participação',{exact:true}).fill('2026-11-04');await page.getByLabel('Motivo da operação *',{exact:true}).fill('Homologação sintética');};
  await open('ok');await patient();await context();await fill();
  await page.getByRole('button',{name:'Estabelecer participação',exact:true}).evaluate(b=>{b.click();b.click();});
  await page.getByText(/Participação #61 confirmada/).waitFor();assert.equal(writes.length,1);assert.equal(parts.length,1);
  assert.equal(writes[0].query,'?instituicao_id=4');assert.equal(writes[0].body.profissional_instituicao_id,21);
  // The same discovery works for an authorized non-ADMIN, without any ADMIN reads.
  actor='SUPORTE';await open('ok');await patient();await context();await fill();
  await page.getByRole('button',{name:'Estabelecer participação',exact:true}).click();await page.getByText(/Participação #61 confirmada/).waitFor();
  for(const scenario of ['none','unauthorized']){await open(scenario);await page.getByText(/Nenhum contexto autorizado disponível/).waitFor();assert.equal(await page.getByLabel('Pessoa paciente').count(),0);}
  for(const scenario of ['wrongPatient','wrongContext','crossInstitution','missingIdentity','legacy']){
   await open(scenario);await page.getByText(/Identificação operacional incompleta ou inconsistente/).waitFor();assert.equal(await page.getByLabel('Pessoa paciente').count(),0);assert.equal(await page.getByLabel('Contexto do paciente').count(),0);
  }
  await open('discoveryDenied');await page.getByText(/Operação não autorizada para esta conta e contexto/).waitFor();
  await open('ok');await patient();await context();await page.getByLabel('Instituição do vínculo').selectOption('5');
  await page.getByText(/Nenhum contexto autorizado disponível/).waitFor();assert.equal(await page.getByLabel('Pessoa paciente').count(),0);
  for(const scenario of ['denied','ineligible']){await open(scenario);await patient();await context();await page.getByText(scenario==='denied'?/Esta conta não possui permissão para administrar/:/Nenhum profissional elegível disponível/).waitFor();assert.equal(await page.getByRole('button',{name:'Estabelecer participação',exact:true}).count(),0);}
  for(const [scenario,message] of [['overlap',/Já existe participação com período sobreposto/],['ineligiblePost',/O vínculo profissional não está vigente/],['deniedPost',/Sua conta precisa de permissão/]]){
   await open(scenario);await patient();await context();await fill();const before=writes.length;
   await page.getByRole('button',{name:'Estabelecer participação',exact:true}).click();await page.getByText(message).waitFor();assert.equal(writes.length,before+1);assert.equal(parts.length,0);assert.equal(await page.getByText(/Participação #61 confirmada/).count(),0);
  }
  for(const scenario of ['uncertain','unconfirmed']){
   await open(scenario);await patient();await context();await fill();const before=writes.length;
   await page.getByRole('button',{name:'Estabelecer participação',exact:true}).click();await page.getByText(/Resultado não confirmado. Novas operações bloqueadas/).waitFor();
   assert.equal(await page.getByRole('button',{name:'Fechar vínculo',exact:true}).isDisabled(),true);
   assert.equal(await page.getByLabel('Instituição do vínculo').isDisabled(),true);
   assert.equal(writes.length,before+1);assert.equal(await page.getByText(/Participação #61 confirmada/).count(),0);
  }
  assert.deepEqual(errors,[]);console.log('PASS D05.3: verified participation, double click, no context, different patient, ADMIN/non-ADMIN operational discovery, no ADMIN endpoints, institution/identity mismatch, legacy identity blocked, discovery denied, authority denied, ineligible professional, overlap, uncertain POST/readback, no clinical grants. Synthetic APIs only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
