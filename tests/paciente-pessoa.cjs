const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.PESSOAS_FRONT_URL || 'http://127.0.0.1:5176';
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 let checks=0;
 try {
  const page=await browser.newPage();page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  const person={id:4,nome_completo:'Pessoa sintética',cpf:'11144477735',ativo:true};
  let state, readFail=false, postStatus=200, writes=0, failAfter=false, delayRead=null, delayPost=null, reads=0;
  const response=()=>({pessoa_id:4,profissional_id:null,profissional_ativo:null,pacientes:[],profissionais:[],...state});
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url()),path=u.pathname;
   if(u.origin===FRONT)return route.continue();
   const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(path==='/me')return reply({id:99,perfil:'ADMIN',nome:'Admin',modulos:[]});
   if(path==='/admin/pessoas/')return reply([person]);
   if(path==='/admin/pessoas/4')return reply(person);
   if(path==='/admin/pessoas/4/acessos')return reply({pessoa_id:4,usuario:null,autorizacoes:[]});
   if(path==='/admin/pessoas/4/vinculos'){
    reads++; const body=response(),fail=readFail;
    if(delayRead){const hold=delayRead;delayRead=null;await hold;}
    return reply(fail?{}:body,fail?500:200);
   }
   if(path==='/admin/identidades/pessoas/4/paciente/ativar'){
    writes++; assert.equal(req.method(),'POST');assert.ok(!req.postData());
    if(delayPost){await delayPost;delayPost=null;}
    if(postStatus==='network')return route.abort();
    if(postStatus!==200)return reply({detail:{code:postStatus===409?'LEGACY_PATIENT_NOT_SUPPORTED':'DENIED'}},postStatus);
    state={paciente_id:40,paciente_ativo:true};if(failAfter)readFail=true;
    return reply({pessoa_id:4,paciente_id:40,ativo:true});
   }
   return reply([]);
  });
  const panel=page.getByRole('region',{name:'Papel de Paciente'});
  const refresh=()=>panel.getByRole('button',{name:'Atualizar estado do Paciente'}).click();
  const unknown=()=>panel.getByText('Não foi possível confirmar o estado do papel de Paciente',{exact:true}).waitFor();
  async function open(value){
   state=value;readFail=false;postStatus=200;failAfter=false;delayRead=null;delayPost=null;
   await page.goto(FRONT+'/admin/pessoas');await page.getByRole('button',{name:'Ver / Editar',exact:true}).click();
   await panel.waitFor();
  }
  await open({paciente_id:null,paciente_ativo:null});await panel.getByText('Não preparado',{exact:true}).waitFor();assert.equal(await panel.getByRole('button',{name:'Preparar papel assistencial'}).count(),1);checks++;
  await open({paciente_id:40,paciente_ativo:false});await panel.getByText('Inativo',{exact:true}).waitFor();checks++;
  await open({paciente_id:40,paciente_ativo:true});await panel.getByText('Ativo',{exact:true}).waitFor();assert.equal(await panel.getByRole('button',{name:'Ativar papel de Paciente',exact:true}).count(),0);checks++;
  for(const value of [{paciente_id:40},{paciente_id:null,paciente_ativo:false},{paciente_id:40,paciente_ativo:null},{paciente_id:'40',paciente_ativo:false},{paciente_id:0,paciente_ativo:false},{paciente_id:40,paciente_ativo:'false'}]){
   await open(value);await unknown();assert.equal(await panel.getByRole('button',{name:'Preparar papel assistencial'}).count(),0);assert.equal(await panel.getByRole('button',{name:'Ativar papel de Paciente',exact:true}).count(),0);
   await page.getByRole('button',{name:'Preparar Profissional',exact:true}).waitFor();checks++;
  }
  await open({paciente_id:40,paciente_ativo:false});await panel.getByText('Inativo',{exact:true}).waitFor();readFail=true;await refresh();await unknown();readFail=false;await refresh();await panel.getByText('Inativo',{exact:true}).waitFor();checks++;
  const beforeCancel=writes;
  page.once('dialog',async d=>{assert.equal(d.message(),'Ativar o papel de Paciente desta Pessoa? Esta ação não cria conta, vínculo, acompanhamento ou permissão clínica.');await d.dismiss();});
  await panel.getByRole('button',{name:'Ativar papel de Paciente',exact:true}).click();assert.equal(writes,beforeCancel);checks++;
  page.on('dialog',d=>d.accept());
  let release;delayPost=new Promise(r=>release=r);const before=writes,readBefore=reads;
  await panel.getByRole('button',{name:'Ativar papel de Paciente',exact:true}).evaluate(b=>{b.click();b.click();});
  await panel.getByText('Processando ativação...',{exact:true}).waitFor();release();
  await panel.getByText('Ativo',{exact:true}).waitFor();assert.equal(writes,before+1);assert.ok(reads>readBefore);checks++;
  await open({paciente_id:40,paciente_ativo:false});await panel.getByText('Inativo',{exact:true}).waitFor();failAfter=true;
  await panel.getByRole('button',{name:'Ativar papel de Paciente',exact:true}).click();await panel.getByText(/Escrita confirmada, mas/).waitFor();await unknown();readFail=false;await refresh();await panel.getByText('Ativo',{exact:true}).waitFor();checks++;
  for(const status of [403,404,409,422,500,'network']){
   await open({paciente_id:40,paciente_ativo:false});await panel.getByText('Inativo',{exact:true}).waitFor();postStatus=status;
   const count=writes;await panel.getByRole('button',{name:'Ativar papel de Paciente',exact:true}).click();await unknown();assert.equal(writes,count+1);
   await refresh();await panel.getByText('Inativo',{exact:true}).waitFor();assert.equal(writes,count+1);checks++;
  }
  // A late inactive response cannot overwrite the newer active read.
  let releaseOld;await open({paciente_id:40,paciente_ativo:false});await panel.getByText('Inativo',{exact:true}).waitFor();
  delayRead=new Promise(r=>releaseOld=r);const oldReads=reads;await refresh();
  await page.waitForFunction(()=>true);while(reads===oldReads)await new Promise(r=>setTimeout(r,10));
  state={paciente_id:40,paciente_ativo:true};await refresh();await panel.getByText('Ativo',{exact:true}).waitFor();
  const oldResponse=page.waitForResponse(r=>r.url().includes('/4/vinculos'));releaseOld();await oldResponse;
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal(await panel.getByText('Inativo',{exact:true}).count(),0);checks++;
  await open({paciente_id:40,paciente_ativo:false});await panel.getByText('Inativo',{exact:true}).waitFor();postStatus=401;
  await panel.getByRole('button',{name:'Ativar papel de Paciente',exact:true}).click();await page.waitForURL('**/login');checks++;
  assert.deepEqual(errors,[]);console.log(`Paciente canônico: ${checks} cenários PASS`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
