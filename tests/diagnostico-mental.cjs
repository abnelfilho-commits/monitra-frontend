const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const FRONT='http://127.0.0.1:5177';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(10000);
 await page.addInitScript(()=>localStorage.setItem('access_token','synthetic'));
 let items=[],allowed=true,failure=422,posts=0;
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.origin===FRONT)return route.continue();
  const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(u.pathname==='/me')return reply({id:9,perfil:'PROFISSIONAL',nome:'Synthetic',modulos:[]});
  assert.equal(u.searchParams.get('instituicao_id'),'5');
  const path='/saude-mental/pessoas/18/contextos/9';
  if(req.method()==='POST'){
   assert.equal(u.pathname,path+'/diagnosticos');posts++;
   const payload=req.postDataJSON();
   for(const key of ['paciente_id','clinica_id','modulo_id','registrador_usuario_id'])assert.ok(!(key in payload));
   if(failure)return reply({detail:'synthetic'},failure);
   const item={...payload,id:1,status:'ATIVO',pessoa_id:18,contexto_assistencial_id:9,modulo_id:3,created_at:'2026-10-07T13:00:00Z',registrador_usuario_id:9,registrador_profissional_id:8};
   items=[item];return reply(item,201);
  }
  assert.equal(req.method(),'GET');assert.equal(u.pathname,path);
  return reply({pessoa_id:18,nome_completo:'Pessoa sintética',instituicao_id:5,instituicao_nome:'Instituição teste',contexto_assistencial_id:9,modulo_id:3,contexto_estado:'ABERTO',linha_estado:'ATIVA',
   diagnosticos:{pode_registrar:allowed,itens:items},
   bem_estar:{pode_registrar:false,checkins:[{id:2,data_hora:'2026-10-01T12:00:00Z',baseline:true,respondente_pessoa_id:18,canal:'PORTAL_PROFISSIONAL',modalidade:'ASSISTIDO',respostas:{humor:'BOM'}}]}});
 });
 await page.goto(FRONT+'/saude-mental/pessoas/18/contextos/9?instituicao_id=5');
 await page.getByRole('button',{name:'Registrar Diagnóstico',exact:true}).click();
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:900});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);
  await page.screenshot({path:'/tmp/diagnostico-form-'+width+'.png',fullPage:true});
 }
 await page.getByRole('button',{name:'Salvar diagnóstico',exact:true}).click();assert.equal(posts,0);
 await page.getByLabel('Tipo',{exact:true}).selectOption('DIAGNOSTICO');
 await page.getByLabel('Data do diagnóstico',{exact:true}).fill('2026-10-07');
 await page.getByLabel('Descrição clínica',{exact:true}).fill('Diagnóstico sintético');
 await page.getByLabel('Nome do médico',{exact:true}).fill('Médico sintético');
 await page.getByRole('button',{name:'Salvar diagnóstico',exact:true}).click();
 await page.getByRole('alert').getByText('Revise os campos do diagnóstico.').waitFor();
 failure=0;
 await page.getByRole('button',{name:'Salvar diagnóstico',exact:true}).click();
 await page.getByText('Diagnóstico registrado com sucesso.',{exact:true}).waitFor();
 assert.equal(posts,2);
 const timeline=page.locator('.mental-record__timeline');
 await timeline.getByText('Diagnóstico sintético',{exact:true}).waitFor();
 assert.equal(await timeline.locator('article').count(),2);
 assert.equal(await timeline.locator('article').first().getAttribute('class'),'mental-timeline-event mental-timeline-event--diagnosis');
 await timeline.locator('article').first().getByText('Detalhes do registro').click();
 await timeline.getByText('Profissional registrador: 8',{exact:true}).waitFor();
 await timeline.getByRole('button',{name:'Check-ins',exact:true}).click();assert.equal(await timeline.locator('article').count(),1);
 await timeline.getByRole('button',{name:'Diagnósticos',exact:true}).click();assert.equal(await timeline.locator('article').count(),1);
 await timeline.getByRole('button',{name:'Todos',exact:true}).click();assert.equal(await timeline.locator('article').count(),2);
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:900});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);
 }
 allowed=false;await page.reload();await page.getByRole('button',{name:'Registrar Diagnóstico',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Registrar Diagnóstico',exact:true}).isDisabled(),true);
 assert.deepEqual(errors,[]);console.log('DIAGNOSIS_FRONT_PASS: contextual save/error/refresh; authored real timeline; filters; no legacy; responsive; authorization flag.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
