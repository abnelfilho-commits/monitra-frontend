const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT=process.env.MENTAL_FRONT_URL || 'http://127.0.0.1:5176';
// Exercise persisted-identity/vigency guards independently of browser rendering.
const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'../src/services/operacaoAssistencial.js'),'utf8');
const guard=require('node:vm').runInNewContext(source.slice(source.indexOf('export function participacaoVigente')).replace('export function','function')+';participacaoVigente');
const base={instituicao_id:4,contexto_id:9,participacoes:[{id:61,instituicao_id:4,contexto_assistencial_id:9,profissional_instituicao_id:21,data_inicio:'2020-01-01',data_fim:null}],profissionais:[{id:21,usuario_instituicao_acesso_id:31,data_inicio:'2020-01-01',data_fim:null}]};
assert.ok(guard(base,4,9,61));
for(const changes of [{encerrado_em:'2026-01-01'},{invalidado_em:'2026-01-01'},{revogado_em:'2026-01-01'},{data_inicio:'2999-01-01'},{data_fim:'2020-02-01'},{instituicao_id:5},{contexto_assistencial_id:10},{profissional_instituicao_id:22}]){
 const state=structuredClone(base);Object.assign(state.participacoes[0],changes);assert.equal(guard(state,4,9,61),null);
}
for(const field of ['participacoes','profissionais']){const state=structuredClone(base);state[field].push({...state[field][0]});assert.equal(guard(state,4,9,61),null);}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();page.setDefaultTimeout(10000);
  let grants=[];
  let mode='ok',parts=[],actor='ADMIN';const writes=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const r=route.request(),u=new URL(r.url());if(u.origin===FRONT)return route.continue();
   const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname==='/me')return reply({id:99,perfil:actor,nome:'Teste',modulos:[]});
   if(u.pathname==='/operacao-assistencial/instituicoes')return reply([{id:4,nome:'Instituição teste'},{id:5,nome:'Outra instituição'}]);
   if(u.pathname==='/admin/pessoas/10'){assert.equal(actor,'ADMIN');return reply({id:10,nome_completo:'Paciente autorizado'});}
   if(u.pathname==='/saude-mental/pessoas')return reply({itens:[{pessoa_id:10,paciente_id:70,paciente_instituicao_id:80,contexto_assistencial_id:9,instituicao_id:4,nome_completo:'Paciente autorizado'}],tem_mais:false});
   assert.equal(u.pathname.startsWith('/admin/'),false,'Unexpected ADMIN request');
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
   if(u.pathname==='/operacao-assistencial/contextos/9/grants'){
    writes.push({path:u.pathname,body:r.postDataJSON()});
    if(mode==='grantUncertain')return route.abort('failed');
    const row={id:90+grants.length,instituicao_id:4,contexto_assistencial_id:9,escopo_tipo:'CONTEXTO',revogado_em:null,...r.postDataJSON()};
    if(mode!=='grantMissing')grants.push(row);
    return reply(row);
   }
   if(u.pathname==='/operacao-assistencial/contextos/9')return reply({instituicao_id:4,contexto_id:9,acoes:{administrar_participacao:mode!=='denied',conceder_capacidades:mode.startsWith('grant')?['ASSISTENCIAL_LER','ASSISTENCIAL_REGISTRAR']:[],recovery_capacidades:[]},contas:[],autoridades:[],grants,participacoes:parts,profissionais:mode==='ineligible'?[]:[{id:21,usuario_instituicao_acesso_id:31,pode_receber_grant:mode!=='grantSelf',profissional:'Profissional teste',data_inicio:'2020-01-01',data_fim:null}]});
   assert.equal(r.method(),'GET','Unexpected write '+u.pathname);return reply([]);
  });
  const open=async(next)=>{mode=next;parts=[];grants=[];await page.goto(FRONT+'/operacao-assistencial');await page.getByRole('button',{name:'Vincular Pessoa a Profissional',exact:true}).click();await page.getByLabel('Instituição').selectOption('4');};
  const patient=async()=>page.getByLabel('Paciente').selectOption('10');
  const context=async()=>{assert.equal(await page.getByLabel('Contexto existente').count(),0);await page.getByText('Atendimento:',{exact:false}).waitFor();};
  const fill=async()=>{await page.getByLabel('Profissional',{exact:true}).selectOption('21');await page.getByLabel('Data de início',{exact:true}).fill('2026-11-04');await page.getByLabel('Motivo',{exact:true}).fill('Homologação sintética');};
  await open('ok');await patient();await context();await fill();
  await page.getByRole('button',{name:'Confirmar vínculo',exact:true}).evaluate(b=>{b.click();b.click();});
  await page.getByText(/Vínculo registrado e confirmado/).waitFor();assert.equal(writes.length,1);assert.equal(parts.length,1);
  assert.equal(writes[0].query,'?instituicao_id=4');assert.equal(writes[0].body.profissional_instituicao_id,21);
  // Persistence is visible after a full reload, without another write.
  await page.reload();await page.getByRole('button',{name:'Vincular Pessoa a Profissional',exact:true}).click();
  await page.getByLabel('Instituição',{exact:true}).selectOption('4');await patient();await context();
  await page.getByRole('region',{name:'Vínculos registrados'}).getByText(/Profissional teste/).waitFor();assert.equal(writes.length,1);
  assert.equal(await page.getByRole('navigation',{name:'Etapas da configuração'}).count(),0);
  assert.equal(await page.getByText(/Quem executa:/).count(),0);
  await page.getByRole('option',{name:'Paciente autorizado',exact:true}).waitFor({state:'attached'});
  // The same discovery works for an authorized non-ADMIN, without any ADMIN reads.
  actor='SUPORTE';await open('ok');await patient();await context();await fill();
  await page.getByRole('button',{name:'Confirmar vínculo',exact:true}).click();await page.getByText(/Vínculo registrado e confirmado/).waitFor();
  for(const scenario of ['none','unauthorized']){await open(scenario);await page.getByText(/Nenhum atendimento existente está disponível/).waitFor();assert.equal(await page.getByLabel('Paciente').count(),0);}
  for(const scenario of ['wrongPatient','wrongContext','crossInstitution','missingIdentity','legacy']){
   await open(scenario);await page.getByText(/Não foi possível confirmar os dados/).waitFor();assert.equal(await page.getByLabel('Paciente').count(),0);assert.equal(await page.getByLabel('Contexto existente').count(),0);
  }
  await open('discoveryDenied');await page.getByText(/Sua conta não está autorizada para esta operação/).waitFor();
  await open('ok');await patient();await context();await page.getByLabel('Instituição').selectOption('5');
  await page.getByText(/Nenhum atendimento existente está disponível/).waitFor();assert.equal(await page.getByLabel('Paciente').count(),0);
  for(const scenario of ['denied','ineligible']){await open(scenario);await patient();await context();await page.getByText(scenario==='denied'?/Sua conta não está autorizada a vincular profissionais/:/Nenhum profissional elegível nesta instituição/).waitFor();assert.equal(await page.getByRole('button',{name:'Confirmar vínculo',exact:true}).count(),0);}
  for(const [scenario,message] of [['overlap',/Já existe um vínculo com esse profissional no período/],['ineligiblePost',/O profissional não está disponível para o período/],['deniedPost',/Sua conta não está autorizada a vincular profissionais/]]){
   await open(scenario);await patient();await context();await fill();const before=writes.length;
   await page.getByRole('button',{name:'Confirmar vínculo',exact:true}).click();await page.getByText(message).waitFor();assert.equal(writes.length,before+1);assert.equal(parts.length,0);assert.equal(await page.getByText(/Vínculo registrado e confirmado/).count(),0);
  }
  for(const scenario of ['uncertain','unconfirmed']){
   await open(scenario);await patient();await context();await fill();const before=writes.length;
   await page.getByRole('button',{name:'Confirmar vínculo',exact:true}).click();await page.getByText(/Resultado não confirmado. Novas operações bloqueadas/).waitFor();
   assert.equal(await page.getByRole('button',{name:'Fechar vínculo',exact:true}).isDisabled(),true);
   assert.equal(await page.getByLabel('Instituição').isDisabled(),true);
   assert.equal(writes.length,before+1);assert.equal(await page.getByText(/Vínculo registrado e confirmado/).count(),0);
  }
  for(const scenario of ['grantOk','grantMissing','grantUncertain','grantSelf','ok']){
   await open(scenario);await patient();await fill();
   await page.getByRole('button',{name:'Confirmar vínculo',exact:true}).click();
   await page.getByText(/Participação concluída/).waitFor();
   await page.getByRole('heading',{name:'Permissões de atendimento',exact:true}).waitFor();
   if(scenario==='ok'){await page.getByText(/Consultar atendimento: pendente/).waitFor();continue;}
   if(scenario==='grantSelf'){await page.getByText(/Consultar atendimento: pendente/).waitFor();assert.equal(await page.getByRole('button',{name:'Conceder permissão',exact:true}).count(),0);continue;}
   for(const capability of scenario==='grantOk'?['ASSISTENCIAL_LER','ASSISTENCIAL_REGISTRAR']:['ASSISTENCIAL_LER']){
    await page.getByLabel('Permissão de atendimento',{exact:true}).selectOption(capability);
    await page.getByLabel('Destinatário',{exact:true}).selectOption('31');
    await page.getByLabel('Motivo da operação *',{exact:true}).fill('Concessão explícita sintética');
    const before=writes.length;
    await page.getByRole('button',{name:'Conceder permissão',exact:true}).evaluate(b=>{b.click();b.click();});
    if(scenario==='grantOk'){
     await page.getByText('Permissão concedida e confirmada na reconsulta.',{exact:true}).waitFor();
     assert.equal(grants.at(-1).capacidade,capability);
    }else{
     await page.getByText(/Resultado não confirmado. Novas operações bloqueadas/).waitFor();
     assert.equal(await page.getByLabel('Instituição').isDisabled(),true);
    }
    assert.equal(writes.length,before+1);
   }
   if(scenario==='grantOk'){
    assert.equal(grants.length,2);const before=writes.length;
    await page.reload();await page.getByRole('button',{name:'Vincular Pessoa a Profissional',exact:true}).click();
    await page.getByLabel('Instituição').selectOption('4');await patient();
    await page.getByRole('button',{name:'Continuar permissões',exact:true}).click();
    await page.getByText(/Participação existente confirmada/).waitFor();
    await page.getByLabel('Permissão de atendimento',{exact:true}).selectOption('ASSISTENCIAL_LER');
    await page.getByLabel('Destinatário',{exact:true}).selectOption('31');
    await page.getByLabel('Motivo da operação *',{exact:true}).fill('Conferência');
    await page.getByRole('button',{name:'Conceder permissão',exact:true}).click();
    await page.getByText(/Permissão já concedida e confirmada/).waitFor();assert.equal(writes.length,before);
    await page.getByRole('button',{name:'Fechar vínculo',exact:true}).click();
    await page.getByRole('button',{name:'Vincular Pessoa a Profissional',exact:true}).click();
    await page.getByLabel('Instituição').selectOption('4');await patient();
    await page.getByRole('button',{name:'Continuar permissões',exact:true}).click();
    await page.getByText(/Participação existente confirmada/).waitFor();assert.equal(writes.length,before);
   }
  }
  assert.deepEqual(errors,[]);console.log('PASS D05.3: verified participation, double click, no context, different patient, ADMIN/non-ADMIN operational discovery, optional authorized names, standalone flow, persisted reload, institution/identity mismatch, legacy identity blocked, discovery denied, authority denied, ineligible professional, overlap, uncertain POST/readback, explicit clinical grants with readback, no authority, self-grant blocked, uncertain/missing grant readback. Synthetic APIs only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
