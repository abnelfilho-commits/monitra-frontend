// Vite: VITE_API_URL=http://127.0.0.1:18769 npm run dev -- --host 127.0.0.1 --port 5176
// Synthetic responses only; screenshots go to /private/tmp, never HML.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = 'http://127.0.0.1:5176';
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 try {
  const page = await browser.newPage(); page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic'));
  const total={quantidade_considerada:3,quantidade_precificada:3,quantidade_pendente:0,subtotal_precificado:'450.00'};
  await page.route('**/*',r=>{
   const u=new URL(r.request().url()),p=u.pathname;
   if(u.origin===FRONT)return r.continue();
   const reply=d=>r.fulfill({contentType:'application/json',body:JSON.stringify(d)});
   if(p==='/me')return reply({id:99,nome:'Admin Demo',perfil:'ADMIN',modulos:[]});
   if(p==='/admin/economia/mapeamentos/')return reply([{agenda_cuidado_id:27,paciente_id:21,paciente_nome:'Pessoa de Homologação com Nome Composto',atividade_nome:'Psicoterapia individual',ocupacao_id:3,ocupacao_nome:'Psicólogo',duracao_minutos:50,modulo_id:3,modulo_nome:'Saúde Mental',contexto_assistencial_id:2,data_inicio:'2026-11-09',data_fim:'2026-12-31',status:'PLANEJADO',mapeamento_id:1,servico_id:1,servico_codigo:'PSICO-50-HML',servico_descricao:'Atendimento de psicologia',servico_ativo:true}]);
   if(p==='/admin/economia/contratos/4')return reply({id:4,codigo:'DEMO-HML-2026',edicao:1,estado:'PUBLISHED',pagador_nome:'Instituição Demo',tabela_codigo:'DEMO-2026',tabela_nome:'Tabela Demo',inicio:'2026-11-09',fim:'2099-12-31'});
   if(p==='/admin/economia/contratos/4/beneficiarios')return reply([{id:1,paciente_id:21,paciente_nome:'Pessoa de Homologação com Nome Composto',data_nascimento:'1990-01-01',identificador_beneficiario:'BENEF-HML-001',inicio:'2026-11-09',fim:'2099-12-31'}]);
   if(p==='/atividades-terapeuticas/linhas')return reply([{id:3,nome:'Saúde Mental',slug:'saude_mental'}]);
   if(p==='/dimensionamento/ocupacoes')return reply([{ocupacao_id:3,ocupacao_nome:'Psicólogo',total_planejamentos:3,horas_semanais:3.25,horas_mensais:14.07,horas_anuais:169,fte:.08}]);
   if(p==='/financeiro/institucional/contexto')return reply({instituicoes:[{id:3,nome:'Demo'}],contratos:[{id:4,instituicao_id:3,codigo:'Demo',edicao:1}]});
   if(p==='/financeiro/institucional/preview')return reply({resumo:{...total,completude:'PRECIFICADO'},pacientes:[{...total,paciente_id:21,paciente_nome:'Pessoa de Homologação com Nome Composto'}],detalhes:[{paciente_id:21,item:{sessao_id:1,data_economica:'2026-11-09',subtotal:'150.00'},evidencia:{vinculos:[]}}],totais_por_mes:[],totais_por_servico:[],pendencias:[]});
   assert.equal(r.request().method(),'GET','Unexpected write');return reply([]);
  });
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   for(const [name,path] of [['mapping','/admin/economia/mapeamentos'],['beneficiary','/admin/economia/contratos/4'],['staffing','/dimensionamento'],['finance','/financeiro/institucional']]){
    await page.goto(FRONT+path);
    if(name==='finance'){
     await page.getByLabel('Instituição').selectOption('3');await page.getByLabel('Contrato').selectOption('4');await page.getByLabel('Linha assistencial').selectOption('3');
     await page.getByLabel('Data inicial').fill('2026-11-01');await page.getByLabel('Data final').fill('2026-11-30');await page.getByRole('button',{name:'Gerar projeção',exact:true}).click();
     await page.getByRole('button',{name:'Pessoa de Homologação com Nome Composto · #21',exact:true}).click();await page.locator('details summary').click();
    }
    await page.locator('.institutional-table table').first().waitFor();
    assert.equal(await page.locator('.institutional-table thead th').first().evaluate(e=>getComputedStyle(e).whiteSpace),'nowrap');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${name} ${width}: page overflow`);
    if(width===390)assert.equal(await page.locator('.institutional-table').first().evaluate(e=>e.scrollWidth>e.clientWidth),true,`${name}: internal scroll`);
    if(['mapping','beneficiary'].includes(name)){
     const button=page.getByRole('button',{name:'Atualizar',exact:true});assert.ok((await button.boundingBox()).width<150);
     await button.click();await page.locator('.institutional-table table').waitFor();
    }
    await page.locator('.institutional-table').first().scrollIntoViewIfNeeded();
    await page.screenshot({path:`/private/tmp/f23-${name}-${width}.png`});
   }
  }
  assert.deepEqual(errors,[]);console.log('PASS: 4 pages × desktop/mobile, scroll, headers, refresh width, finance details; 8 screenshots');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
