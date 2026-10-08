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
 const fields=[{"id": 1, "nome_campo": "cbi_pb1", "label": "Com que frequência você se sente cansado (a)?", "tipo_campo": "radio", "obrigatorio": true, "opcoes": [{"valor": "4", "label": "Sempre"}, {"valor": "3", "label": "Frequentemente"}, {"valor": "2", "label": "Às vezes"}, {"valor": "1", "label": "Raramente"}, {"valor": "0", "label": "Nunca"}]}, {"id": 2, "nome_campo": "cbi_pb2", "label": "Com que frequência você fica exausto (a) fisicamente?", "tipo_campo": "radio", "obrigatorio": true, "opcoes": [{"valor": "4", "label": "Sempre"}, {"valor": "3", "label": "Frequentemente"}, {"valor": "2", "label": "Às vezes"}, {"valor": "1", "label": "Raramente"}, {"valor": "0", "label": "Nunca"}]}, {"id": 3, "nome_campo": "cbi_pb3", "label": "Com que frequência você fica exausto (a) emocionalmente?", "tipo_campo": "radio", "obrigatorio": true, "opcoes": [{"valor": "4", "label": "Sempre"}, {"valor": "3", "label": "Frequentemente"}, {"valor": "2", "label": "Às vezes"}, {"valor": "1", "label": "Raramente"}, {"valor": "0", "label": "Nunca"}]}, {"id": 4, "nome_campo": "cbi_pb4", "label": "Com que frequência você pensa: “Eu não aguento mais”?", "tipo_campo": "radio", "obrigatorio": true, "opcoes": [{"valor": "4", "label": "Sempre"}, {"valor": "3", "label": "Frequentemente"}, {"valor": "2", "label": "Às vezes"}, {"valor": "1", "label": "Raramente"}, {"valor": "0", "label": "Nunca"}]}, {"id": 5, "nome_campo": "cbi_pb5", "label": "Com que frequência você se sente esgotado (a)?", "tipo_campo": "radio", "obrigatorio": true, "opcoes": [{"valor": "4", "label": "Sempre"}, {"valor": "3", "label": "Frequentemente"}, {"valor": "2", "label": "Às vezes"}, {"valor": "1", "label": "Raramente"}, {"valor": "0", "label": "Nunca"}]}, {"id": 6, "nome_campo": "cbi_pb6", "label": "Com que frequência você se sente fraco (a) e suscetível à doença?", "tipo_campo": "radio", "obrigatorio": true, "opcoes": [{"valor": "4", "label": "Sempre"}, {"valor": "3", "label": "Frequentemente"}, {"valor": "2", "label": "Às vezes"}, {"valor": "1", "label": "Raramente"}, {"valor": "0", "label": "Nunca"}]}, {"id": 7, "nome_campo": "cbi_wb1", "label": "Você se sente esgotado (a) no fim de um dia de trabalho?", "tipo_campo": "radio", "obrigatorio": true, "opcoes": [{"valor": "4", "label": "Sempre"}, {"valor": "3", "label": "Frequentemente"}, {"valor": "2", "label": "Às vezes"}, {"valor": "1", "label": "Raramente"}, {"valor": "0", "label": "Nunca"}]}, {"id": 8, "nome_campo": "cbi_wb2", "label": "Você fica exausto (a) pela manhã ao pensar em mais um dia de trabalho?", "tipo_campo": "radio", "obrigatorio": true, "opcoes": [{"valor": "4", "label": "Sempre"}, {"valor": "3", "label": "Frequentemente"}, {"valor": "2", "label": "Às vezes"}, {"valor": "1", "label": "Raramente"}, {"valor": "0", "label": "Nunca"}]}, {"id": 9, "nome_campo": "cbi_wb3", "label": "Você se sente mais cansado a cada hora de trabalho?", "tipo_campo": "radio", "obrigatorio": true, "opcoes": [{"valor": "4", "label": "Sempre"}, {"valor": "3", "label": "Frequentemente"}, {"valor": "2", "label": "Às vezes"}, {"valor": "1", "label": "Raramente"}, {"valor": "0", "label": "Nunca"}]}, {"id": 10, "nome_campo": "cbi_wb4", "label": "Você tem energia suficiente para família e amigos durante os momentos de lazer?", "tipo_campo": "radio", "obrigatorio": true, "opcoes": [{"valor": "4", "label": "Sempre"}, {"valor": "3", "label": "Frequentemente"}, {"valor": "2", "label": "Às vezes"}, {"valor": "1", "label": "Raramente"}, {"valor": "0", "label": "Nunca"}]}, {"id": 11, "nome_campo": "cbi_wb5", "label": "O seu trabalho é exaustivo emocionalmente?", "tipo_campo": "radio", "obrigatorio": true, "opcoes": [{"valor": "4", "label": "Em um grau muito alto"}, {"valor": "3", "label": "Em um grau alto"}, {"valor": "2", "label": "Em algum grau"}, {"valor": "1", "label": "Em baixo grau"}, {"valor": "0", "label": "Em um grau muito baixo"}]}, {"id": 12, "nome_campo": "cbi_wb6", "label": "O seu trabalho lhe frustra?", "tipo_campo": "radio", "obrigatorio": true, "opcoes": [{"valor": "4", "label": "Em um grau muito alto"}, {"valor": "3", "label": "Em um grau alto"}, {"valor": "2", "label": "Em algum grau"}, {"valor": "1", "label": "Em baixo grau"}, {"valor": "0", "label": "Em um grau muito baixo"}]}, {"id": 13, "nome_campo": "cbi_wb7", "label": "Você se sente esgotado por causa do seu trabalho?", "tipo_campo": "radio", "obrigatorio": true, "opcoes": [{"valor": "4", "label": "Em um grau muito alto"}, {"valor": "3", "label": "Em um grau alto"}, {"valor": "2", "label": "Em algum grau"}, {"valor": "1", "label": "Em baixo grau"}, {"valor": "0", "label": "Em um grau muito baixo"}]}, {"id": 14, "nome_campo": "cbi_cb1", "label": "Você acha difícil trabalhar com pacientes?", "tipo_campo": "radio", "obrigatorio": true, "opcoes": [{"valor": "4", "label": "Em um grau muito alto"}, {"valor": "3", "label": "Em um grau alto"}, {"valor": "2", "label": "Em algum grau"}, {"valor": "1", "label": "Em baixo grau"}, {"valor": "0", "label": "Em um grau muito baixo"}]}, {"id": 15, "nome_campo": "cbi_cb2", "label": "Trabalhar com pacientes suga a sua energia?", "tipo_campo": "radio", "obrigatorio": true, "opcoes": [{"valor": "4", "label": "Em um grau muito alto"}, {"valor": "3", "label": "Em um grau alto"}, {"valor": "2", "label": "Em algum grau"}, {"valor": "1", "label": "Em baixo grau"}, {"valor": "0", "label": "Em um grau muito baixo"}]}, {"id": 16, "nome_campo": "cbi_cb3", "label": "Você acha frustrante trabalhar com pacientes?", "tipo_campo": "radio", "obrigatorio": true, "opcoes": [{"valor": "4", "label": "Em um grau muito alto"}, {"valor": "3", "label": "Em um grau alto"}, {"valor": "2", "label": "Em algum grau"}, {"valor": "1", "label": "Em baixo grau"}, {"valor": "0", "label": "Em um grau muito baixo"}]}, {"id": 17, "nome_campo": "cbi_cb4", "label": "Você sente que está dando mais do que recebe quando você trabalha com pacientes?", "tipo_campo": "radio", "obrigatorio": true, "opcoes": [{"valor": "4", "label": "Em um grau muito alto"}, {"valor": "3", "label": "Em um grau alto"}, {"valor": "2", "label": "Em algum grau"}, {"valor": "1", "label": "Em baixo grau"}, {"valor": "0", "label": "Em um grau muito baixo"}]}, {"id": 18, "nome_campo": "cbi_cb5", "label": "Você está cansado (a) de trabalhar com pacientes?", "tipo_campo": "radio", "obrigatorio": true, "opcoes": [{"valor": "4", "label": "Sempre"}, {"valor": "3", "label": "Frequentemente"}, {"valor": "2", "label": "Às vezes"}, {"valor": "1", "label": "Raramente"}, {"valor": "0", "label": "Nunca"}]}, {"id": 19, "nome_campo": "cbi_cb6", "label": "Você às vezes se pergunta quanto tempo será capaz de continuar trabalhando com pacientes?", "tipo_campo": "radio", "obrigatorio": true, "opcoes": [{"valor": "4", "label": "Sempre"}, {"valor": "3", "label": "Frequentemente"}, {"valor": "2", "label": "Às vezes"}, {"valor": "1", "label": "Raramente"}, {"valor": "0", "label": "Nunca"}]}];
 const domains=[{"codigo": "PB", "nome": "Burnout Pessoal", "itens": ["cbi_pb1", "cbi_pb2", "cbi_pb3", "cbi_pb4", "cbi_pb5", "cbi_pb6"]}, {"codigo": "WB", "nome": "Burnout relacionado ao trabalho", "itens": ["cbi_wb1", "cbi_wb2", "cbi_wb3", "cbi_wb4", "cbi_wb5", "cbi_wb6", "cbi_wb7"]}, {"codigo": "CB", "nome": "Burnout relacionado aos pacientes", "itens": ["cbi_cb1", "cbi_cb2", "cbi_cb3", "cbi_cb4", "cbi_cb5", "cbi_cb6"]}];
 const path='/saude-mental/pessoas/18/contextos/9';
 await page.route('**/*',route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.origin===FRONT)return route.continue();
  const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(u.pathname==='/me')return reply({id:9,perfil:'PROFISSIONAL',nome:'Synthetic',modulos:[]});
  assert.equal(u.searchParams.get('instituicao_id'),'5');
  if(req.method()==='POST'){
   assert.equal(u.pathname,path+'/cbi');posts++;
   const payload=req.postDataJSON();assert.deepEqual(Object.keys(payload),['respostas']);assert.equal(Object.keys(payload.respostas).length,19);
   if(failure)return reply({detail:'synthetic'},failure);
   const item={id:1,registro_id:8,data_hora:'2026-10-07T13:00:00Z',registrador_usuario_id:9,registrador_profissional_id:8,
    resultado:{instrumento:'CBI',versao:'BR_HCP_2023_1',dominios:domains.map((d,i)=>({...d,score:[25,32.14,25][i],score_max:100})),interpretacao:'Resultados independentes; não constituem diagnóstico.',metadata:{respostas:payload.respostas,rotulos_respostas:Object.fromEntries(fields.map(f=>[f.nome_campo,'Raramente'])),dominio_por_item:Object.fromEntries(domains.flatMap(d=>d.itens.map(k=>[k,d.codigo])))}}};
   items=[item];return reply(item,201);
  }
  assert.equal(req.method(),'GET');assert.equal(u.pathname,path);
  return reply({pessoa_id:18,nome_completo:'Pessoa sintética',instituicao_id:5,instituicao_nome:'Instituição teste',contexto_assistencial_id:9,modulo_id:3,contexto_estado:'ABERTO',linha_estado:'ATIVA',
   phq9:{pode_registrar:false,itens:[{id:70,data_hora:'2026-10-01T13:00:00Z',registrador_profissional_id:8,resultado:{instrumento:'PHQ9',versao:'1.0',score:18,classificacao:'Moderadamente grave',interpretacao:'Interpretação PHQ-9 preservada',metadata:{respostas:{phq9_1:'2'}}}}]},
   gad7:{pode_registrar:false,itens:[{id:71,data_hora:'2026-10-02T13:00:00Z',registrador_profissional_id:8,resultado:{instrumento:'GAD7',versao:'1.0',score:7,score_max:21,classificacao:'Leve',interpretacao:'GAD preservado',metadata:{respostas:{gad7_1:'1'}}}}]},
   cbi:{dominios:domains,pode_registrar:allowed,formulario:allowed?{id:2,campos:fields}:null,instrucoes:"CBI — versão brasileira para profissionais de saúde (Moser et al., 2023). Responda às 19 questões considerando suas experiências. O domínio relacionado aos pacientes se refere ao trabalho com pacientes. Esta aplicação completa pressupõe trabalho e atendimento a pacientes; não preencha respostas fictícias quando um domínio não se aplicar.",itens:items},
   bem_estar:{pode_registrar:false,checkins:[]}});
 });
 await page.goto(FRONT+path+'?instituicao_id=5');
 await page.getByRole('button',{name:'CBI',exact:true}).first().click();
 await page.waitForURL('**/cbi?instituicao_id=5');
 await page.getByText('Framework Universal de Avaliações',{exact:true}).waitFor();
 await page.getByText('Pessoa: Pessoa sintética',{exact:true}).waitFor();
 assert.equal(await page.locator('input[type=radio]').count(),95);
 for(const domain of domains)assert.equal(await page.getByRole('region',{name:domain.nome,exact:true}).locator('input[type=radio]').count(),domain.itens.length*5);
 assert.equal(await page.getByRole('progressbar').getAttribute('value'),'0');
 await page.getByRole('button',{name:'Concluir avaliação',exact:true}).click();
 await page.getByText('Responda às 19 questões antes de concluir.',{exact:true}).waitFor();assert.equal(posts,0);
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:900});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);
  await page.screenshot({path:'/tmp/cbi-form-'+width+'.png',fullPage:true});
 }
 for(const field of fields)await page.locator(`input[name=${field.nome_campo}][value="1"]`).check();
 assert.equal(await page.getByRole('progressbar').getAttribute('value'),'19');
 await page.getByRole('button',{name:'Concluir avaliação',exact:true}).click();
 await page.getByText('Revise as 19 respostas.',{exact:true}).waitFor();
 failure=0;await page.getByRole('button',{name:'Concluir avaliação',exact:true}).click();
 await page.getByRole('heading',{name:'Avaliação registrada'}).waitFor();
 assert.equal(await page.locator('input[type=radio]').count(),0);
 await page.getByText('Burnout Pessoal: 25 / 100',{exact:true}).waitFor();
 await page.getByText('Burnout relacionado ao trabalho: 32.14 / 100',{exact:true}).waitFor();
 await page.getByText('Burnout relacionado aos pacientes: 25 / 100',{exact:true}).waitFor();
 assert.equal(await page.getByText('Pontuação:',{exact:false}).count(),0);
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:900});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth);
  await page.screenshot({path:'/tmp/cbi-result-'+width+'.png',fullPage:true});
 }
 await page.getByRole('button',{name:'Retornar ao prontuário',exact:true}).click();
 await page.waitForURL('**/contextos/9?instituicao_id=5');
 await page.getByText('CBI registrado com sucesso.',{exact:true}).waitFor();
 await page.reload();
 const timeline=page.locator('.mental-record__timeline');
 await timeline.getByText('Burnout Pessoal: 25 / 100',{exact:true}).waitFor();
 await timeline.getByText('Pontuação: 18 / 27',{exact:true}).waitFor();
 await timeline.getByText('Pontuação: 7 / 21',{exact:true}).waitFor();
 await timeline.getByRole('button',{name:'CBI',exact:true}).click();assert.equal(await timeline.locator('article').count(),1);
 await timeline.getByText('Detalhes do registro').click();await timeline.getByText(/PB1:.*Raramente.*PB/).waitFor();
 assert.equal(posts,2);
 allowed=false;await page.reload();
 assert.equal(await page.getByRole('button',{name:'CBI',exact:true}).first().isDisabled(),true);
 await page.goto(FRONT+path+'/cbi?instituicao_id=5');
 await page.getByText('Aplicação não disponível neste contexto.',{exact:true}).waitFor();assert.equal(await page.locator('form').count(),0);
 allowed=true;failure=500;await page.reload();
 await page.getByText('Aplicação da Avaliação',{exact:true}).waitFor();
 for(const field of fields)await page.locator(`input[name=${field.nome_campo}][value="1"]`).check();
 await page.getByRole('button',{name:'Concluir avaliação',exact:true}).click();
 await page.getByText('Não foi possível confirmar a avaliação. Consulte a jornada antes de tentar novamente.',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Concluir avaliação',exact:true}).isDisabled(),true);
 assert.deepEqual(errors,[]);console.log('CBI contextual: PASS (flow, persistence, validation, permissions, uncertain write, responsive 1440/768/390)');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
