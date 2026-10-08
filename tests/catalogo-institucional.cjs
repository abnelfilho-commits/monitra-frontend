const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.MENTAL_FRONT_URL || 'http://127.0.0.1:5177';
(async () => {
 const browser = await chromium.launch({channel:'chrome', headless:true});
 try {
  const page = await browser.newPage(); let profile='ADMIN'; const writes=[], reads=[], errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*', async route=>{
   const r=route.request(), u=new URL(r.url()); if(u.origin===FRONT)return route.continue();
   const reply=x=>route.fulfill({contentType:'application/json',body:JSON.stringify(x)});
   if(r.method()!=='GET'){writes.push({path:u.pathname,body:r.postDataJSON()});return reply({id:1});}
   reads.push(u.pathname+u.search);
   if(u.pathname==='/cardiometabolico/dashboard-analytics')return reply({indicadores:{total_pacientes:0},capabilities:{},pacientes_criticos:[],pagination:{offset:0,limit:20,total:0},evolution:{},continuidade:{},recent_activity:[]});
   if(u.pathname==='/me')return reply({id:99,perfil:profile,nome:'Synthetic',modulos:[{id:1},{id:2}]});
   if(u.pathname==='/atividades-terapeuticas/linhas')return reply([{id:1,nome:'Neurodesenvolvimento'},{id:2,nome:'Cardiometabólico'},{id:3,nome:'Saúde Mental'}]);
   if(u.pathname==='/atividades-terapeuticas/')return reply([{id:1,nome:'Atividade sintética',modulo_ids:[1,3]}]);
   if(u.pathname==='/atividades-terapeuticas/ocupacoes-profissionais')return reply([{id:2,nome:'Ocupação sintética'}]);
   return reply([]);
  });
  const nav=()=>page.getByRole('navigation',{name:'Navegação institucional',exact:true});
  for(const p of ['ADMIN','ADMINISTRADOR','ADMIN_CLINICA','SUPORTE','PROFISSIONAL','RESPONSAVEL']){
   profile=p;await page.goto(FRONT+'/gestao-institucional');await nav().waitFor();
   assert.equal(await nav().getByRole('link',{name:'Atividades Terapêuticas',exact:true}).count(),['ADMIN','ADMINISTRADOR','ADMIN_CLINICA','SUPORTE'].includes(p)?1:0);
  }
  profile='ADMIN';await page.goto(FRONT+'/plataforma');await page.getByRole('button',{name:'Acessar Gestão Institucional',exact:true}).click();
  await nav().getByRole('link',{name:'Atividades Terapêuticas',exact:true}).click();await page.waitForURL(FRONT+'/atividades-terapeuticas');
  await page.getByLabel('Linha do catálogo').selectOption('saude_mental');
  await page.getByRole('button',{name:'+ Nova Atividade',exact:true}).click();await nav().waitFor();
  await page.getByPlaceholder('Ex.: Integração Sensorial').fill('Atividade sintética');await page.getByPlaceholder('Ex.: 60').fill('50');
  await page.getByRole('button',{name:'Salvar atividade',exact:true}).click();await page.waitForURL(FRONT+'/atividades-terapeuticas?modulo=saude_mental');
  assert.deepEqual(writes[0].body.modulo_ids,[3]);
  await page.locator('select').nth(1).selectOption('1');await page.getByLabel('Ocupação sintética').check();
  await page.getByRole('button',{name:'Salvar Vínculos',exact:true}).click();await page.getByText('Vínculo atualizado com sucesso.',{exact:true}).waitFor();
  assert.deepEqual(writes[1],{path:'/atividades-terapeuticas/1/ocupacoes',body:{ocupacao_id:2}});
  await page.getByRole('button',{name:'+ Nova Ocupação',exact:true}).click();await nav().waitFor();await page.getByRole('heading',{name:'Nova Ocupação Profissional'}).waitFor();
  await page.getByRole('button',{name:'← Voltar',exact:true}).click();await page.waitForURL(FRONT+'/atividades-terapeuticas');
  for(const [slug,id] of [['neuro',1],['cardiometabolico',2],['saude_mental',3]]){
   await page.getByLabel('Linha do catálogo').selectOption(slug);await page.waitForTimeout(100);
   assert.ok(reads.includes('/atividades-terapeuticas/?modulo_id='+id));
  }
  for(const path of ['/dashboard?care_line=1','/cardiometabolico']){
   await page.goto(FRONT+path);await page.locator('aside').waitFor();assert.equal(await page.locator('aside').getByText('Atividades Terapêuticas',{exact:true}).count(),0);
  }
  assert.deepEqual(errors,[]);console.log('CATALOGO_INSTITUCIONAL_PASS: perfis, rota/shell, atividade Mental, ocupação, associação, módulos 1/2/3 e ausência do menu legado. APIs simuladas.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
