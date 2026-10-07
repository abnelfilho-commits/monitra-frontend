const assert = require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT=process.env.MENTAL_FRONT_URL || 'http://127.0.0.1:5177';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
 const page=await browser.newPage();page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
 const names=['humor','ansiedade','estresse','sono','energia','funcionamento','trabalho','evento_relevante','pedido_ajuda'];
 const fields=names.map((n,i)=>({id:i+1,nome_campo:n,label:n,tipo_campo:'radio',obrigatorio:true,opcoes:(i<7?[{valor:'BOM',label:'Bom'}]:[{valor:'SIM',label:'Sim'},{valor:'NAO',label:'Não'}])}));
 fields.push({id:10,nome_campo:'evento_descricao',label:'Descrição',tipo_campo:'textarea',obrigatorio:false,opcoes:[]});
 const item={pessoa_id:18,nome_completo:'Pessoa sintética',nome_social:null,paciente_id:24,instituicao_id:5,instituicao_nome:'Instituição sintética',paciente_instituicao_id:7,contexto_assistencial_id:9,data_inicio:'2026-01-01',data_fim:null,contexto_estado:'ABERTO',modulo_id:3,linha_estado:'ATIVA'};
 let allow=true,failure=0,checkins=[],posts=0;
 await page.route('**/*',async route=>{
 const req=route.request(),u=new URL(req.url());if(u.origin===FRONT)return route.continue();
 const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 if(u.pathname==='/me')return reply({id:99,nome:'Synthetic',perfil:'PROFISSIONAL',modulos:[]});
 assert.ok(u.pathname.startsWith('/saude-mental/'));assert.equal(u.searchParams.get('instituicao_id'),'5');
 if(req.method()==='POST'){
 posts++;const p=req.postDataJSON();assert.deepEqual(Object.keys(p).sort(),['formulario_id','modulo_id','paciente_id','respostas']);
 assert.equal(p.paciente_id,24);assert.equal(p.modulo_id,3);assert.equal(p.formulario_id,15);
 await new Promise(r=>setTimeout(r,350));if(failure)return reply({detail:{code:'SAFE'}},failure);
 const record={id:25+checkins.length,data_hora:'2026-10-04T12:00:00Z',baseline:checkins.length===0,respondente_pessoa_id:18,registrador_profissional_id:4,canal:'PORTAL_PROFISSIONAL',modalidade:'ASSISTIDO',respostas:p.respostas};checkins=[...checkins,record];return reply(record,201);
 }
 return reply({...item,bem_estar:{pode_registrar:allow,formulario:allow?{id:15,campos:fields}:null,checkins}});
 });
 const url=FRONT+'/saude-mental/pessoas/18/contextos/9?instituicao_id=5';
 await page.goto(url);await page.getByRole('button',{name:'Check-in de Bem-Estar'}).click();
 await page.getByRole('heading',{name:'Check-in Inicial — Pessoa sintética'}).waitFor();
 assert.equal(await page.locator('input[type=radio]').count(),11);
 await page.getByRole('button',{name:'Salvar Check-in'}).click();await page.getByText('Responda todas as perguntas obrigatórias.').waitFor();assert.equal(posts,0);
 for(const name of names)await page.locator(`input[name=${name}]`).first().check();
 await page.getByLabel('Descrição do evento (opcional)').fill('Evento sintético');
 await page.locator('input[name=evento_relevante][value=NAO]').check();assert.equal(await page.locator('textarea').count(),0);
 await page.locator('input[name=evento_relevante][value=SIM]').check();assert.equal(await page.locator('textarea').inputValue(),'');
 await page.getByLabel('Descrição do evento (opcional)').fill('Evento sintético');
 failure=422;await page.getByRole('button',{name:'Salvar Check-in'}).click();await page.getByText('Salvando Check-in…').waitFor();assert.equal(await page.getByRole('button',{name:'Salvar Check-in'}).isDisabled(),true);await page.getByText('Revise as respostas').waitFor();
 failure=0;await page.getByRole('button',{name:'Salvar Check-in'}).click();await page.getByText('Check-in registrado com sucesso.').waitFor();await page.locator('.mental-record__timeline').getByText('Check-in Inicial · Baseline',{exact:true}).waitFor();await page.getByText('Detalhes do registro', {exact:true}).click();await page.getByText('Descrição do evento: Evento sintético',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Check-in de Bem-Estar',exact:true}).isDisabled(),false);
 assert.equal(posts,2);
 await page.reload();
 await page.getByRole('button',{name:'Check-in de Bem-Estar',exact:true}).click();
 await page.getByRole('heading',{name:'Check-in de Bem-Estar — Acompanhamento — Pessoa sintética',exact:true}).waitFor();
 for(const name of names)await page.locator(`input[name=${name}]`).first().check();
 await page.getByRole('button',{name:'Salvar Check-in'}).click();
 await page.getByText('Check-in registrado com sucesso.').waitFor();
 await page.locator('.mental-record__timeline article').nth(1).waitFor();
 assert.equal(posts,3);assert.deepEqual(checkins.map(x=>x.baseline),[true,false]);
 assert.equal(await page.locator('.mental-record__timeline').getByText('Check-in Inicial · Baseline',{exact:true}).count(),1);
 assert.equal(await page.getByRole('button',{name:'Check-in de Bem-Estar',exact:true}).isDisabled(),false);
assert.equal(await page.getByText(/score\s*[:=]\s*\d|diagnóstico automático|risco automático/i).count(),0);
 await page.screenshot({path:'/tmp/w2b-checkin-saved.png',fullPage:true});
 checkins=[];allow=false;await page.reload();await page.getByRole('heading',{name:'Pessoa: Pessoa sintética'}).waitFor();assert.equal(await page.getByRole('button',{name:'Check-in de Bem-Estar'}).isDisabled(),true);
 assert.deepEqual(errors,[]);console.log('W2B_FRONT_PASS: capability, person, nine dimensions, conditional event, help, validation, loading, error, submit, success, refresh, baseline, no scores, no unapproved API.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
