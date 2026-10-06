const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.MENTAL_FRONT_URL || 'http://127.0.0.1:5176';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(12000);
  let profile='ADMIN',operational=false,operationalFailure=false;
  const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const q=route.request(),u=new URL(q.url());if(u.origin===FRONT)return route.continue();
   const reply=(x,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(x)});
   requests.push({path:u.pathname,method:q.method(),query:u.search});
   if(u.pathname==='/me')return reply({id:99,nome:'Synthetic',perfil:profile,modulos:[{id:1,slug:'neurodesenvolvimento'},{id:2,slug:'cardiometabolico'}]});
   if(u.pathname==='/operacao-assistencial/instituicoes')return operationalFailure?reply({detail:{code:'OPERATION_DENIED'}},403):reply(operational?[{id:1,nome:'Instituição sintética'}]:[]);
   if(u.pathname==='/operacao-assistencial/contextos')return reply([]);
   if(u.pathname==='/admin/pessoas/')return reply([]);
   if(u.pathname.startsWith('/saude-mental/'))return reply(u.pathname.endsWith('/pessoas')?{itens:[],tem_mais:false}:[]);
   if(u.pathname==='/financeiro/institucional/contexto')return reply({instituicoes:[],contratos:[],modulos:[]});
   return reply([]);
  });
  const nav=()=>page.getByRole('navigation',{name:'Navegação institucional',exact:true});
  const expected=['Instituições','Pessoas','Usuários / Acessos','Profissionais','Operação Assistencial','Dimensionamento','Financeiro Institucional'];
  const noClinical=async()=>{
   await nav().waitFor();
   for(const x of ['Cockpit Neuro','Pacientes','Responsáveis','Atividades Terapêuticas','Saúde Mental','Clínicas'])assert.equal(await nav().getByRole('link',{name:x,exact:true}).count(),0);
   assert.equal(await page.locator('aside').count(),1);
  };
  await page.goto(FRONT+'/plataforma');
  await page.getByRole('button',{name:'Acessar Gestão Institucional',exact:true}).waitFor();
  await page.getByRole('button',{name:'Acessar módulo Neuro',exact:true}).waitFor();
  await page.getByRole('button',{name:'Acessar módulo Cardiometabólico',exact:true}).waitFor();
  assert.equal(await page.locator('.modulo-card').count(),3);
  await page.getByRole('heading',{name:'Linhas de cuidado',exact:true}).waitFor();
  await page.getByRole('heading',{name:'Gestão',exact:true}).waitFor();
  fs.mkdirSync('/tmp/integra-espacos',{recursive:true});await page.screenshot({animations:'disabled',path:'/tmp/integra-espacos/plataforma.png',fullPage:true});
  await page.getByRole('button',{name:'Acessar Gestão Institucional',exact:true}).click();
  await noClinical();assert.deepEqual(await nav().getByRole('link').allTextContents(),expected);
  for(const [label,path] of [['Instituições','/admin/instituicoes'],['Pessoas','/admin/pessoas'],['Usuários / Acessos','/usuarios'],['Profissionais','/profissionais'],['Dimensionamento','/dimensionamento'],['Financeiro Institucional','/financeiro/institucional'],['Operação Assistencial','/operacao-assistencial']]){
   await nav().getByRole('link',{name:label,exact:true}).click();await page.waitForURL(FRONT+path);await noClinical();
   await nav().getByRole('link',{name:label,exact:true}).and(page.locator('[aria-current="page"]')).waitFor();
   if(['/usuarios','/profissionais'].includes(path))await page.getByText('Cadastro legado',{exact:true}).waitFor();
  }
  await nav().getByRole('link',{name:'Pessoas',exact:true}).click();await page.getByRole('button',{name:'+ Nova Pessoa',exact:true}).waitFor();
  await nav().getByRole('link',{name:'Pessoas',exact:true}).and(page.locator('[aria-current="page"]')).waitFor();
  await page.screenshot({animations:'disabled',path:'/tmp/integra-espacos/institucional.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  await page.screenshot({animations:'disabled',path:'/tmp/integra-espacos/institucional-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await nav().getByRole('link',{name:'Profissionais',exact:true}).click();await page.getByRole('link',{name:'Abrir Clínicas (legado)',exact:true}).click();
  await page.waitForURL(FRONT+'/clinicas');await page.getByRole('button',{name:'Clínicas (legado)',exact:true}).waitFor();assert.equal(await nav().count(),0);
  await page.getByRole('button',{name:'Voltar à Plataforma',exact:true}).click();
  await page.getByRole('button',{name:'Acessar módulo Saúde Mental',exact:true}).click();
  await page.getByRole('navigation',{name:'Navegação Saúde Mental',exact:true}).waitFor();
  await page.getByText('Conta de administração global. Este perfil não concede acesso clínico.',{exact:true}).waitFor();
  assert.equal(await nav().count(),0);
  assert.deepEqual(await page.getByRole('navigation',{name:'Navegação Saúde Mental',exact:true}).getByRole('link').allTextContents(),['Visão Geral','Pessoas','Voltar à Plataforma']);
  await page.screenshot({animations:'disabled',path:'/tmp/integra-espacos/saude-mental.png',fullPage:true});
  await page.getByRole('link',{name:'Voltar à Plataforma',exact:true}).click();await page.getByRole('button',{name:'Acessar módulo Neuro',exact:true}).click();
  await page.waitForURL(/\/dashboard\?care_line=1$/);
  const side=page.locator('aside');
  await side.getByRole('button',{name:'Cockpit Neuro',exact:true}).waitFor();
  for(const x of expected)assert.equal(await side.getByRole('button',{name:x,exact:true}).count(),0);
  await page.screenshot({animations:'disabled',path:'/tmp/integra-espacos/neuro.png',fullPage:true});
  // Legacy Cardio query survives institutional routing; no new dimension calculation.
  await Promise.all([page.waitForResponse(r=>r.url().includes('/dimensionamento/ocupacoes?modulo_id=2')),page.goto(FRONT+'/dimensionamento?modulo=cardiometabolico')]);await noClinical();
  assert.equal(await nav().getByRole('link',{name:'Profissionais',exact:true}).getAttribute('href'),'/profissionais?modulo=cardiometabolico');
  profile='PROFISSIONAL';await page.goto(FRONT+'/plataforma');await page.getByRole('button',{name:'Acessar módulo Saúde Mental',exact:true}).waitFor();
  await page.waitForTimeout(200);assert.equal(await page.getByRole('button',{name:'Acessar Gestão Institucional',exact:true}).count(),0);
  await page.getByRole('button',{name:'Acessar módulo Saúde Mental',exact:true}).click();await page.getByRole('navigation',{name:'Navegação Saúde Mental',exact:true}).waitFor();assert.equal(await nav().count(),0);
  operational=true;await page.goto(FRONT+'/plataforma');await page.getByRole('button',{name:'Acessar Gestão Institucional',exact:true}).click();await noClinical();
  await nav().getByRole('link',{name:'Operação Assistencial',exact:true}).waitFor();assert.deepEqual(await nav().getByRole('link').allTextContents(),['Operação Assistencial']);
  operationalFailure=true;await page.goto(FRONT+'/plataforma');await page.getByRole('button',{name:'Acessar módulo Saúde Mental',exact:true}).waitFor();await page.waitForTimeout(200);
  assert.equal(await page.getByRole('button',{name:'Acessar Gestão Institucional',exact:true}).count(),0);
  assert.ok(requests.every(r=>r.method==='GET'));assert.equal(errors.length,0,errors.join('\n'));
  console.log('SPACES_PASS: ADMIN, PROFISSIONAL, exchange, 3 care lines + separate management, 7 institutional routes, active state, legacy clinic, Cardio query preserved, W1B discovery/no inference/403 fail closed, distinct sidebars, GET-only. Screenshots /tmp/integra-espacos.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
