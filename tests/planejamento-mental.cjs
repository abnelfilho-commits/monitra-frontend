const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const FRONT='http://127.0.0.1:5177';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(12000);
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  const base='/saude-mental/pessoas/18/contextos/9';let rows=[],allowed=true,writes=0;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const req=route.request(),u=new URL(req.url());if(u.origin===FRONT)return route.continue();
   const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(u.pathname==='/me')return reply({id:99,nome:'Synthetic',perfil:'PROFISSIONAL',modulos:[]});
   assert.equal(u.searchParams.get('instituicao_id'),'5');assert.ok(u.pathname.startsWith(base));
   if(u.pathname===base)return reply({pessoa_id:18,nome_completo:'Pessoa teste',instituicao_id:5,instituicao_nome:'Instituição teste',contexto_assistencial_id:9,modulo_id:3,contexto_estado:'ABERTO',linha_estado:'ATIVA',data_inicio:'2026-01-01'});
   if(u.pathname===base+'/pts')return reply({pode_registrar:allowed,itens:[{id:1,status:'ATIVO',data_inicio:'2026-01-01',objetivo_geral:'Plano profissional',objetivos:[{id:2,descricao:'Objetivo contextual',status:'ABERTO',prioridade:'ALTA'}]}]});
   if(u.pathname.endsWith('/catalogo-planejamento'))return reply({atividades:[{id:3,nome:'Psicoterapia individual'}],ocupacoes:[{id:4,nome:'Psicólogo'}],associacoes:[{atividade_id:3,ocupacao_id:4}],executores:[{profissional_id:5,nome:'Executor institucional',ocupacao_id:4,data_inicio:'2020-01-01',data_fim:null}]});
   if(u.pathname.endsWith('/calcular-quantidade')){const p=req.postDataJSON();return p.quantidade_sessoes>52?reply({detail:{message:'Quantidade manual incompatível com o período.'}},422):reply({quantidade_sessoes:p.quantidade_sessoes||52,quantidade_calculada:52,origem_quantidade:p.quantidade_sessoes?'MANUAL':'CALCULADA'});}
   assert.ok(u.pathname.includes('/pts/1/objetivos/2/planejamentos'));
   if(req.method()==='GET')return reply(rows);
   assert.ok(allowed);writes++;const p=req.postDataJSON();assert.ok(!('clinica_id' in p));assert.ok(!('paciente_id' in p));
   if(p.quantidade_sessoes>52)return reply({detail:{message:'Quantidade manual incompatível com o período.'}},422);
   rows=[{...p,id:7,pts_id:1,objetivo_id:2,status:'PLANEJADO',quantidade_sessoes:p.quantidade_sessoes||52,atividade_nome:'Psicoterapia individual',ocupacao_nome:'Psicólogo',profissional_nome:'Executor institucional'}];return reply(rows[0],req.method()==='POST'?201:200);
  });
  const url=FRONT+base+'/pts?instituicao_id=5';await page.goto(url);
  await page.getByRole('button',{name:'Planejar Atividade',exact:true}).click();
  await page.getByRole('heading',{name:'Agenda de Cuidados',exact:true}).waitFor();assert.ok(await page.getByLabel('Ocupação habilitada',{exact:true}).isDisabled());assert.ok(await page.getByLabel('Profissional responsável',{exact:true}).isDisabled());
  await page.getByLabel('Atividade Terapêutica',{exact:true}).selectOption('3');await page.getByLabel('Ocupação habilitada',{exact:true}).selectOption('4');await page.getByLabel('Profissional responsável',{exact:true}).selectOption('5');
  await page.getByLabel('Frequência semanal',{exact:true}).fill('2');await page.getByLabel('Duração em minutos',{exact:true}).fill('50');await page.getByLabel('Data de início',{exact:true}).fill('2026-11-01');await page.getByLabel('Data de fim',{exact:true}).fill('2027-04-30');
  await page.getByRole('button',{name:'Calcular quantidade',exact:true}).click();await page.getByText('Quantidade planejada: 52 sessões — calculada a partir da frequência e período.',{exact:true}).waitFor();
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`overflow ${width}`);await page.screenshot({path:`/tmp/pts-parity-planning-${width}.png`,fullPage:true});}
  await page.getByRole('button',{name:'Salvar planejamento',exact:true}).click();await page.getByText('Quantidade planejada: 52 sessões · PLANEJADO',{exact:true}).waitFor();
  await page.reload();await page.getByRole('button',{name:'Planejar Atividade',exact:true}).click();await page.getByText('Quantidade planejada: 52 sessões · PLANEJADO',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Editar planejamento',exact:true}).click();await page.getByLabel('Número de sessões (opcional)',{exact:true}).fill('53');await page.getByRole('button',{name:'Calcular quantidade',exact:true}).click();await page.getByRole('alert').filter({hasText:'incompatível'}).waitFor();
  await page.getByLabel('Número de sessões (opcional)',{exact:true}).fill('12');await page.getByRole('button',{name:'Calcular quantidade',exact:true}).click();await page.getByRole('status').filter({hasText:'12 sessões'}).waitFor();await page.getByRole('button',{name:'Salvar planejamento',exact:true}).click();await page.getByText('Quantidade planejada: 12 sessões · PLANEJADO',{exact:true}).waitFor();
  allowed=false;await page.reload();await page.getByRole('button',{name:'Planejar Atividade',exact:true}).click();assert.ok(await page.getByRole('button',{name:'+ Novo planejamento',exact:true}).isDisabled());assert.equal(writes,2);assert.deepEqual(errors,[]);
  console.log('PLANEJAMENTO_MENTAL_PASS: quantity, manual validation, persisted reload, edit, read-only, no legacy/session calls, 1440/768/390.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
