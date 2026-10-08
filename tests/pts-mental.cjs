const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const FRONT='http://127.0.0.1:5177';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(12000);
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  const base='/saude-mental/pessoas/18/contextos/9';
  let items=[],allowed=true,denied=false,failure=false,writes=0;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());
  await page.route('**/*',route=>{
   const req=route.request(),u=new URL(req.url());if(u.origin===FRONT)return route.continue();
   const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(u.pathname==='/me')return reply({id:99,nome:'Synthetic',perfil:'PROFISSIONAL',modulos:[]});
   assert.equal(u.searchParams.get('instituicao_id'),'5');assert.ok(u.pathname.startsWith(base));
   if(denied)return reply({detail:{code:'PTS_UNAVAILABLE'}},404);
   if(u.pathname===base)return reply({pessoa_id:18,nome_completo:'Pessoa teste',instituicao_id:5,instituicao_nome:'Instituição teste',contexto_assistencial_id:9,modulo_id:3,contexto_estado:'ABERTO',linha_estado:'ATIVA',data_inicio:'2026-01-01',bem_estar:{pode_registrar:false,checkins:[]}});
   assert.ok(u.pathname.startsWith(base+'/pts'));
   if(req.method()==='GET')return reply({pode_registrar:allowed,itens:items});
   writes++;assert.ok(allowed);if(failure)return reply({detail:{code:'PTS_CONFLICT'}},409);
   const body=req.postDataJSON();
   if(body)for(const k of ['paciente_id','clinica_id','modulo_id','criado_por_usuario_id','contexto_assistencial_id'])assert.ok(!(k in body));
   if(u.pathname===base+'/pts'){
    assert.equal(req.method(),'POST');assert.equal(body.data_inicio,'2026-01-01');
    items=[{id:1,status:'ATIVO',data_inicio:body.data_inicio,data_fim:null,...body,objetivos:[]}];
   } else if(u.pathname.endsWith('/objetivos'))items[0].objetivos.push({id:7,status:'ABERTO',...body});
   else if(u.pathname.endsWith('/objetivos/7'))Object.assign(items[0].objetivos[0],body);
   else if(u.pathname.endsWith('/encerrar'))Object.assign(items[0],{status:'ENCERRADO',data_fim:'2026-10-08'});
   else if(u.pathname.endsWith('/reabrir'))Object.assign(items[0],{status:'ATIVO',data_fim:null});
   else Object.assign(items[0],body);
   return reply(items[0],req.method()==='POST'?201:200);
  });
  await page.goto(FRONT+base+'?instituicao_id=5');
  await page.getByRole('button',{name:'PTS',exact:true}).click();
  await page.getByRole('heading',{name:'Plano Terapêutico Singular'}).waitFor();
  await page.getByRole('button',{name:'+ Criar PTS',exact:true}).click();
  await page.getByLabel('Data de início').fill('2026-01-01');await page.getByLabel('Objetivo geral',{exact:true}).fill('Cuidado compartilhado');await page.getByLabel('Observações',{exact:true}).fill('Condutas registradas');
  await page.getByRole('button',{name:'Salvar',exact:true}).click();await page.getByRole('region',{name:'PTS #1'}).waitFor();
  await page.getByRole('button',{name:'+ Novo Objetivo'}).click();await page.getByLabel('Descrição',{exact:true}).fill('Acompanhar bem-estar');await page.getByLabel('Prioridade').selectOption('ALTA');await page.getByRole('button',{name:'Salvar',exact:true}).click();
  await page.getByText('Acompanhar bem-estar',{exact:true}).waitFor();await page.getByRole('button',{name:'Acompanhar Objetivo'}).click();await page.getByLabel('Status do objetivo').fill('CONCLUIDO');await page.getByRole('button',{name:'Salvar',exact:true}).click();await page.getByText('ALTA · CONCLUIDO').waitFor();
  await page.getByRole('button',{name:'Editar PTS',exact:true}).click();await page.getByLabel('Objetivo geral',{exact:true}).fill('Cuidado revisado');await page.getByRole('button',{name:'Salvar',exact:true}).click();await page.getByText('Cuidado revisado',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Encerrar PTS',exact:true}).click();await page.getByRole('heading',{name:'PTS #1 · ENCERRADO'}).waitFor();await page.getByRole('button',{name:'Reabrir PTS',exact:true}).click();await page.getByRole('heading',{name:'PTS #1 · ATIVO'}).waitFor();
  await page.reload();await page.getByText('ALTA · CONCLUIDO').waitFor();
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  failure=true;await page.getByRole('button',{name:'Encerrar PTS',exact:true}).click();await page.getByRole('alert').waitFor();assert.ok(await page.getByRole('button',{name:'Encerrar PTS',exact:true}).isDisabled());failure=false;await page.getByRole('button',{name:'Consultar PTS'}).click();await page.getByRole('heading',{name:'PTS #1 · ATIVO'}).waitFor();
  allowed=false;await page.reload();await page.getByText('Consulta disponível.',{exact:false}).waitFor();assert.ok(await page.getByRole('button',{name:'Editar PTS',exact:true}).isDisabled());
  await page.getByRole('button',{name:'Voltar ao prontuário'}).click();await page.waitForURL(FRONT+base+'?instituicao_id=5');
  denied=true;await page.goto(FRONT+base+'/pts?instituicao_id=5');await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('region',{name:'PTS #1'}).count(),0);
  assert.equal(writes,7);assert.deepEqual(errors,[]);console.log('PTS_MENTAL_PASS: create/edit/objectives/lifecycle/reload/read-only/conflict/isolation/return/responsive 1440/768/390; no legacy or clinical intelligence calls.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
