/* Browser regression with synthetic HTTP responses; no HML or external API. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT=process.env.COCKPIT_FRONT_URL || 'http://127.0.0.1:5176';
const neuro={care_line:'NEURO',total_pacientes:2,pacientes_prioritarios:[{paciente_id:11,nome:'Synthetic Neuro',risco_atual:'alto_risco',tendencia:'piora',status_resumido:'Neuro unchanged',pontuacao_risco:8}],atividades_recentes:[{id:1,paciente_id:11,paciente_nome:'Synthetic Neuro',tipo:'REGISTRO_DIARIO',data:'2026-09-20T12:00:00Z',descricao:'Synthetic Neuro activity'}]};
const cardio={care_line:'CARDIO',composition:{indicadores:{total_pacientes:3,critico:1,alto_risco:0,moderado:0,baixo:0,indisponivel:2},pacientes_criticos:[{id:22,nome:'Synthetic Cardio',risco:'critico',tendencia:null,motivo_principal:'RISCO_CLINICO_CRITICO',sinais:['RISCO_CLINICO_CRITICO'],continuidade:{classification:'REGULAR'},resumo:'Cardio preserved'}],pagination:{offset:0,limit:20,total:1},recent_activity:[],evolution:{com_registro:1,sem_registro:2},continuidade:{REGULAR:1,ATENCAO:0,CRITICA:0},capabilities:{daily_record:'ACTIVE',interventions:'ACTIVE',timeline:'ACTIVE'}}};
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 let passed=0;
 try {
  const page=await browser.newPage();page.setDefaultTimeout(10000);
  let modules=[1,2],hold=null;const requests=[],errors=[],pending=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin===FRONT)return route.continue();
   requests.push(u.pathname+u.search);
   const json=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname==='/me')return json({id:99,nome:'Synthetic Professional',perfil:'PROFISSIONAL',modulos:modules.map(id=>({id,nome:id===1?'Neurodesenvolvimento':'Cardiometabólico'}))});
   if(u.pathname==='/cockpit/profissional'){
    const line=u.searchParams.get('care_line');assert.ok(['1','2'].includes(line));
    if(line===hold){await new Promise(resolve=>pending.push(resolve));}
    return json(line==='1'?neuro:cardio);
   }
   return json([]);
  });
  await page.goto(FRONT+'/dashboard');await page.getByRole('combobox',{name:'Linha de Cuidado ativa'}).waitFor();
  assert.equal(requests.filter(r=>r.startsWith('/cockpit/')).length,0);passed++;
  await page.getByRole('combobox').selectOption('1');
  await page.getByRole('heading',{name:'Synthetic Neuro',exact:true}).first().waitFor();
  assert.ok(requests.some(r=>r.includes('/cockpit/profissional?')&&r.includes('care_line=1')));
  assert.ok(requests.some(r=>r.includes('/sessoes-assistenciais/minhas')));passed++;
  const before=requests.length;
  await page.getByRole('combobox').selectOption('2');
  await page.getByRole('heading',{name:'Synthetic Cardio',exact:true}).first().waitFor();
  assert.equal(await page.getByRole('heading',{name:'Synthetic Neuro',exact:true}).count(),0);
  assert.ok(requests.slice(before).some(r=>r.includes('care_line=2')));
  assert.ok(!requests.slice(before).some(r=>/sessoes|pts|agenda|analytics/.test(r)));
  for(const name of ['PTS','Planejamento PTS','Agenda','Sessões Assistenciais'])assert.equal(await page.getByRole('button',{name,exact:true}).count(),0);
  await page.getByText('Tendência: indisponível',{exact:true}).first().waitFor();passed++;
  await page.getByRole('button',{name:'Abrir prontuário',exact:true}).click();
  assert.ok(page.url().endsWith('/cardiometabolico/pacientes/22'));passed++;
  await page.goto(FRONT+'/dashboard?care_line=1');await page.getByRole('heading',{name:'Synthetic Neuro',exact:true}).first().waitFor();
  await page.getByRole('button',{name:'Ver prontuário',exact:true}).click();
  assert.ok(page.url().endsWith('/pacientes/11?care_line=1'));passed++;
  // A pending Neuro response must never overwrite a later Cardio selection.
  hold='1';await page.goto(FRONT+'/dashboard?care_line=1');
  await page.waitForFunction(()=>document.querySelector('select')?.value==='1');
  while(!pending.length)await new Promise(resolve=>setTimeout(resolve,20));
  await page.getByRole('combobox').selectOption('2');await page.getByRole('heading',{name:'Synthetic Cardio',exact:true}).first().waitFor();
  hold=null;pending.splice(0).forEach(resolve=>resolve());
  await page.waitForTimeout(150);
  assert.equal(await page.getByRole('heading',{name:'Synthetic Neuro',exact:true}).count(),0);
  assert.equal(await page.getByRole('heading',{name:'Synthetic Cardio',exact:true}).count(),1);passed++;
  // Inverse delayed response and explicit selection for single-line profiles.
  hold='2';await page.getByRole('combobox').selectOption('1');await page.getByRole('heading',{name:'Synthetic Neuro',exact:true}).first().waitFor();
  await page.getByRole('combobox').selectOption('2');
  while(!pending.length)await new Promise(resolve=>setTimeout(resolve,20));
  await page.getByRole('combobox').selectOption('1');await page.getByRole('heading',{name:'Synthetic Neuro',exact:true}).first().waitFor();
  hold=null;pending.splice(0).forEach(resolve=>resolve());await page.waitForTimeout(150);
  assert.equal(await page.getByRole('heading',{name:'Synthetic Cardio',exact:true}).count(),0);passed++;
  for(const id of [1,2]){
   modules=[id];const start=requests.length;
   await page.goto(FRONT+'/dashboard');await page.getByRole('combobox').waitFor();
   assert.equal(requests.slice(start).filter(r=>r.startsWith('/cockpit/')).length,0);
   await page.getByRole('combobox').selectOption(String(id));
   await page.getByRole('heading',{name:id===1?'Synthetic Neuro':'Synthetic Cardio',exact:true}).first().waitFor();
   assert.equal(await page.locator('select option').count(),2);passed++;
  }
  assert.deepEqual(errors,[]);console.log(`PASS: ${passed} browser scenarios; explicit context, isolation, widgets, links, delayed responses, single/multi-line.`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
