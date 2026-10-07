const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const FRONT='http://127.0.0.1:5177';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(10000);
 await page.addInitScript(()=>localStorage.setItem('access_token','synthetic'));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let items=[],allowed=true,failure=422,posts=0;
 const questions=['Pouco interesse ou pouco prazer em fazer as coisas','Se sentir para baixo, deprimido/a ou sem perspectiva','Dificuldade para pegar no sono ou permanecer dormindo, ou dormir mais do que de costume','Se sentir cansado/a ou com pouca energia','Falta de apetite ou comendo demais','Se sentir mal consigo mesmo/a — ou achar que você é um fracasso ou que decepcionou sua família ou você mesmo/a','Dificuldade para se concentrar nas coisas, como ler o jornal ou ver televisão','Lentidão para se movimentar ou falar, a ponto das outras pessoas perceberem? Ou o oposto – estar tão agitado/a ou irrequieto/a que você fica andando de um lado para o outro muito mais do que de costume','Pensar em se ferir de alguma maneira ou que seria melhor estar morto/a'];
 const fields=questions.map((label,i)=>({id:i+1,nome_campo:'phq9_'+(i+1),label,tipo_campo:'radio',obrigatorio:true,opcoes:['Nenhuma vez','Vários dias','Mais da metade dos dias','Quase todos os dias'].map((label,v)=>({valor:String(v),label}))}));
 const path='/saude-mental/pessoas/18/contextos/9';
 await page.route('**/*',route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.origin===FRONT)return route.continue();
  const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(u.pathname==='/me')return reply({id:9,perfil:'PROFISSIONAL',nome:'Synthetic',modulos:[]});
  assert.equal(u.searchParams.get('instituicao_id'),'5');
  if(req.method()==='POST'){
   assert.equal(u.pathname,path+'/phq9');posts++;
   const payload=req.postDataJSON();assert.deepEqual(Object.keys(payload),['respostas']);assert.equal(Object.keys(payload.respostas).length,9);
   if(failure)return reply({detail:'synthetic'},failure);
   const item={id:1,registro_id:8,data_hora:'2026-10-07T13:00:00Z',registrador_usuario_id:9,registrador_profissional_id:8,
    resultado:{instrumento:'PHQ9',versao:'1.0',score:0,classificacao:'Mínima',interpretacao:'Resultado de rastreamento; não estabelece diagnóstico.',conduta:'Revisar respostas.',alertas:[],metadata:{respostas:payload.respostas}}};
   items=[item];return reply(item,201);
  }
  assert.equal(req.method(),'GET');assert.equal(u.pathname,path);
  return reply({pessoa_id:18,nome_completo:'Pessoa sintética',instituicao_id:5,instituicao_nome:'Instituição teste',contexto_assistencial_id:9,modulo_id:3,contexto_estado:'ABERTO',linha_estado:'ATIVA',
   phq9:{pode_registrar:allowed,formulario:allowed?{id:2,campos:fields}:null,instrucoes:'Durante as últimas 2 semanas, com que frequência você foi incomodado/a?',itens:items},
   bem_estar:{pode_registrar:false,checkins:[]}});
 });
 await page.goto(FRONT+path+'?instituicao_id=5');
 await page.getByRole('button',{name:'PHQ-9',exact:true}).first().click();
 await page.waitForURL('**/phq9?instituicao_id=5');
 await page.getByText('Framework Universal de Avaliações',{exact:true}).waitFor();
 await page.getByText('Pessoa: Pessoa sintética',{exact:true}).waitFor();
 assert.equal(await page.locator('input[type=radio]').count(),36);
 assert.equal(await page.getByRole('progressbar').getAttribute('value'),'0');
 await page.getByRole('button',{name:'Concluir avaliação',exact:true}).click();
 await page.getByText('Responda às nove questões antes de concluir.',{exact:true}).waitFor();assert.equal(posts,0);
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:900});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);
  await page.screenshot({path:'/tmp/phq9-form-'+width+'.png',fullPage:true});
 }
 for(let i=1;i<=9;i++)await page.locator(`input[name=phq9_${i}][value="0"]`).check();
 assert.equal(await page.getByRole('progressbar').getAttribute('value'),'9');
 await page.getByRole('button',{name:'Concluir avaliação',exact:true}).click();
 await page.getByText('Revise as nove respostas.',{exact:true}).waitFor();
 failure=0;await page.getByRole('button',{name:'Concluir avaliação',exact:true}).click();
 await page.getByRole('heading',{name:'Avaliação registrada'}).waitFor();
 assert.equal(await page.locator('input[type=radio]').count(),0);
 await page.getByText('Pontuação: 0 / 27',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Retornar ao prontuário',exact:true}).click();
 await page.waitForURL('**/contextos/9?instituicao_id=5');
 await page.getByText('PHQ-9 registrado com sucesso.',{exact:true}).waitFor();
 await page.reload();
 const timeline=page.locator('.mental-record__timeline');
 await timeline.getByText('Pontuação: 0 / 27',{exact:true}).waitFor();
 await timeline.getByRole('button',{name:'PHQ-9',exact:true}).click();assert.equal(await timeline.locator('article').count(),1);
 await timeline.getByText('Detalhes do registro').click();await timeline.getByText('Questão 1: Nenhuma vez',{exact:true}).waitFor();
 assert.equal(posts,2);
 allowed=false;await page.reload();
 assert.equal(await page.getByRole('button',{name:'PHQ-9',exact:true}).first().isDisabled(),true);
 await page.goto(FRONT+path+'/phq9?instituicao_id=5');
 await page.getByText('Aplicação não disponível neste contexto.',{exact:true}).waitFor();assert.equal(await page.locator('form').count(),0);
 allowed=true;failure=500;await page.reload();
 await page.getByText('Aplicação da Avaliação',{exact:true}).waitFor();
 for(let i=1;i<=9;i++)await page.locator(`input[name=phq9_${i}][value="0"]`).check();
 await page.getByRole('button',{name:'Concluir avaliação',exact:true}).click();
 await page.getByText('Não foi possível confirmar a avaliação. Consulte a jornada antes de tentar novamente.',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Concluir avaliação',exact:true}).isDisabled(),true);
 assert.deepEqual(errors,[]);console.log('PHQ-9 contextual: PASS (flow, persistence, validation, permissions, uncertain write, responsive 1440/768/390)');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
