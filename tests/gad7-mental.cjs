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
 const questions=["Sentir-se nervoso/a, ansioso/a ou muito tenso/a", "Não ser capaz de impedir ou de controlar as preocupações", "Preocupar-se muito com diversas coisas", "Dificuldade para relaxar", "Ficar tão agitado/a que se torna difícil permanecer sentado/a", "Ficar facilmente aborrecido/a ou irritado/a", "Sentir medo como se algo horrível fosse acontecer"];
 const fields=questions.map((label,i)=>({id:i+1,nome_campo:'gad7_'+(i+1),label,tipo_campo:'radio',obrigatorio:true,opcoes:['Nenhuma vez','Vários dias','Mais da metade dos dias','Quase todos os dias'].map((label,v)=>({valor:String(v),label}))}));
 const path='/saude-mental/pessoas/18/contextos/9';
 await page.route('**/*',route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.origin===FRONT)return route.continue();
  const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(u.pathname==='/me')return reply({id:9,perfil:'PROFISSIONAL',nome:'Synthetic',modulos:[]});
  assert.equal(u.searchParams.get('instituicao_id'),'5');
  if(req.method()==='POST'){
   assert.equal(u.pathname,path+'/gad7');posts++;
   const payload=req.postDataJSON();assert.deepEqual(Object.keys(payload),['respostas']);assert.equal(Object.keys(payload.respostas).length,7);
   if(failure)return reply({detail:'synthetic'},failure);
   const item={id:1,registro_id:8,data_hora:'2026-10-07T13:00:00Z',registrador_usuario_id:9,registrador_profissional_id:8,
    resultado:{instrumento:'GAD7',versao:'1.0',score_max:21,score:0,classificacao:'Mínima',interpretacao:'Resultado de rastreamento; não estabelece diagnóstico.',conduta:'Revisar respostas.',alertas:[],metadata:{respostas:payload.respostas}}};
   items=[item];return reply(item,201);
  }
  assert.equal(req.method(),'GET');assert.equal(u.pathname,path);
  return reply({pessoa_id:18,nome_completo:'Pessoa sintética',instituicao_id:5,instituicao_nome:'Instituição teste',contexto_assistencial_id:9,modulo_id:3,contexto_estado:'ABERTO',linha_estado:'ATIVA',
   phq9:{pode_registrar:false,itens:[{id:70,data_hora:'2026-10-01T13:00:00Z',registrador_profissional_id:8,resultado:{instrumento:'PHQ9',versao:'1.0',score:18,classificacao:'Moderadamente grave',interpretacao:'Interpretação PHQ-9 preservada',metadata:{respostas:{phq9_1:'2'}}}}]},
   gad7:{pode_registrar:allowed,formulario:allowed?{id:2,campos:fields}:null,instrucoes:'Durante as últimas 2 semanas, com que frequência você foi incomodado/a?',itens:items},
   bem_estar:{pode_registrar:false,checkins:[]}});
 });
 await page.goto(FRONT+path+'?instituicao_id=5');
 await page.getByRole('button',{name:'GAD-7',exact:true}).first().click();
 await page.waitForURL('**/gad7?instituicao_id=5');
 await page.getByText('Framework Universal de Avaliações',{exact:true}).waitFor();
 await page.getByText('Pessoa: Pessoa sintética',{exact:true}).waitFor();
 assert.equal(await page.locator('input[type=radio]').count(),28);
 assert.equal(await page.getByRole('progressbar').getAttribute('value'),'0');
 await page.getByRole('button',{name:'Concluir avaliação',exact:true}).click();
 await page.getByText('Responda às sete questões antes de concluir.',{exact:true}).waitFor();assert.equal(posts,0);
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:900});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);
  await page.screenshot({path:'/tmp/gad7-form-'+width+'.png',fullPage:true});
 }
 for(let i=1;i<=7;i++)await page.locator(`input[name=gad7_${i}][value="0"]`).check();
 assert.equal(await page.getByRole('progressbar').getAttribute('value'),'7');
 await page.getByRole('button',{name:'Concluir avaliação',exact:true}).click();
 await page.getByText('Revise as sete respostas.',{exact:true}).waitFor();
 failure=0;await page.getByRole('button',{name:'Concluir avaliação',exact:true}).click();
 await page.getByRole('heading',{name:'Avaliação registrada'}).waitFor();
 assert.equal(await page.locator('input[type=radio]').count(),0);
 await page.getByText('Pontuação: 0 / 21',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Retornar ao prontuário',exact:true}).click();
 await page.waitForURL('**/contextos/9?instituicao_id=5');
 await page.getByText('GAD-7 registrado com sucesso.',{exact:true}).waitFor();
 await page.reload();
 const timeline=page.locator('.mental-record__timeline');
 await timeline.getByText('Pontuação: 0 / 21',{exact:true}).waitFor();
 await timeline.getByText('Pontuação: 18 / 27',{exact:true}).waitFor();
 await timeline.getByRole('button',{name:'GAD-7',exact:true}).click();assert.equal(await timeline.locator('article').count(),1);
 await timeline.getByText('Detalhes do registro').click();await timeline.getByText('Questão 1: Nenhuma vez',{exact:true}).waitFor();
 assert.equal(posts,2);
 allowed=false;await page.reload();
 assert.equal(await page.getByRole('button',{name:'GAD-7',exact:true}).first().isDisabled(),true);
 await page.goto(FRONT+path+'/gad7?instituicao_id=5');
 await page.getByText('Aplicação não disponível neste contexto.',{exact:true}).waitFor();assert.equal(await page.locator('form').count(),0);
 allowed=true;failure=500;await page.reload();
 await page.getByText('Aplicação da Avaliação',{exact:true}).waitFor();
 for(let i=1;i<=7;i++)await page.locator(`input[name=gad7_${i}][value="0"]`).check();
 await page.getByRole('button',{name:'Concluir avaliação',exact:true}).click();
 await page.getByText('Não foi possível confirmar a avaliação. Consulte a jornada antes de tentar novamente.',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Concluir avaliação',exact:true}).isDisabled(),true);
 assert.deepEqual(errors,[]);console.log('GAD-7 contextual: PASS (flow, persistence, validation, permissions, uncertain write, responsive 1440/768/390)');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
