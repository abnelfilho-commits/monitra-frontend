const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.MENTAL_FRONT_URL || 'http://127.0.0.1:5177';
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 try {
  const page = await browser.newPage(); page.setDefaultTimeout(10000);
  const item={pessoa_id:18,nome_completo:'Pessoa sintética',nome_social:null,paciente_id:24,instituicao_id:5,instituicao_nome:'Instituição sintética',paciente_instituicao_id:7,contexto_assistencial_id:9,data_inicio:'2026-01-01',data_fim:null,contexto_estado:'ABERTO',modulo_id:3,linha_estado:'ATIVA'};
  let failure=null,empty=false,delay=false,line='ATIVA';const calls=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.origin===FRONT)return route.continue();
   const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname==='/me')return reply({id:99,nome:'Profissional sintético',perfil:'PROFISSIONAL',modulos:[{id:1,slug:'neurodesenvolvimento'},{id:2,slug:'cardiometabolico'}]});
   assert.ok(u.pathname.startsWith('/saude-mental/'),'Unexpected API '+u.pathname);
   calls.push({method:req.method(),path:u.pathname,query:u.search});
   if(delay)await new Promise(r=>setTimeout(r,300));
   if(failure)return reply({detail:{code:'SYNTHETIC_ERROR'}},failure);
   if(u.pathname.endsWith('/instituicoes'))return reply([{id:5,nome:'Instituição sintética'}]);
   if(u.pathname.endsWith('/pessoas'))return reply({itens:empty?[]:[{...item,linha_estado:line}],tem_mais:false});
   return reply({...item,linha_estado:line});
  });
  await page.goto(FRONT+'/plataforma');
  await page.getByRole('button',{name:'Acessar módulo Neuro',exact:true}).waitFor();
  assert.equal(await page.locator('.modulo-card').count(),3);
  await page.getByRole('button',{name:'Acessar módulo Cardiometabólico',exact:true}).waitFor();
  await page.getByRole('button',{name:'Acessar módulo Saúde Mental',exact:true}).click();
  await page.waitForURL('**/saude-mental');
  assert.equal(await page.locator('aside').getByRole('button',{name:'Saúde Mental',exact:true}).count(),0);
  await page.getByText('Selecione explicitamente uma instituição').waitFor();
  assert.equal(calls.filter(c=>c.path.endsWith('/pessoas')).length,0);
  delay=true;await page.getByLabel('Instituição',{exact:true}).selectOption('5');
  await page.getByRole('status').waitFor();
  await page.getByRole('heading',{name:'Pessoa sintética',exact:true}).waitFor();delay=false;
  await page.getByRole('link',{name:'Abrir jornada'}).click();
  await page.getByRole('heading',{name:'Visão Geral'}).waitFor();
  await page.getByText('Linha Saúde Mental ativa neste contexto.').waitFor();
  const button=page.getByRole('button',{name:'Realizar Check-in Inicial'});
  assert.equal(await button.isDisabled(),true);
  await page.screenshot({path:'/tmp/w2a-jornada-desktop.png',fullPage:true});
  for(const state of ['INATIVA','AUSENTE']){
   line=state;await page.reload();await page.getByText(state==='INATIVA'?'A linha Saúde Mental está inativa neste contexto.':'A linha Saúde Mental ainda não foi vinculada a este contexto.',{exact:false}).waitFor();
  }
  for(const status of [401,403,404,422,500,503]){
   failure=status;await page.reload();await page.getByRole('alert').waitFor();
   assert.equal(await page.getByRole('heading',{name:'Pessoa sintética',exact:true}).count(),0);
  }
  failure=null;empty=true;await page.goto(FRONT+'/saude-mental?instituicao_id=5');
  await page.getByRole('heading',{name:'Nenhum contexto acessível'}).waitFor();
  empty=false;line='ATIVA';await page.reload();await page.getByRole('link',{name:'Abrir jornada'}).click();
  await page.getByRole('heading',{name:'Visão Geral'}).waitFor();
  await page.setViewportSize({width:768,height:900});await page.screenshot({path:'/tmp/w2a-jornada-tablet.png',fullPage:true});
  assert.ok(calls.every(c=>c.method==='GET'));
  assert.ok(calls.filter(c=>!c.path.endsWith('/instituicoes')).every(c=>c.query.includes('instituicao_id=5')));
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS: três cards/entrada independente/sem menu lateral, contexto explícito, loading, Pessoas→jornada, linha ativa/inativa/ausente, vazio, 401/403/404/422/500/503, check-in desabilitado, GET-only, zero pageerrors. Synthetic data only in test interception.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
