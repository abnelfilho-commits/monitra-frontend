const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const FRONT=process.env.MENTAL_FRONT_URL||'http://127.0.0.1:5177';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(10000);
 await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
 const keys=['humor','ansiedade','estresse','sono','energia','funcionamento','trabalho'];
 let status="SEM_DADOS";
 let count=0,alerts=[],dimensions={},requests=0;
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const r=route.request(),u=new URL(r.url());if(u.origin===FRONT)return route.continue();
  const reply=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  if(u.pathname==='/me')return reply({id:99,perfil:'PROFISSIONAL',nome:'Synthetic',modulos:[]});
  assert.equal(r.method(),'GET');assert.equal(u.pathname,'/saude-mental/pessoas/18/contextos/9');requests++;
  return reply({pessoa_id:18,nome_completo:'Pessoa teste',instituicao_id:5,instituicao_nome:'Instituição teste',contexto_assistencial_id:9,contexto_estado:'ABERTO',linha_estado:'ATIVA',modulo_id:3,
   bem_estar:{pode_registrar:false,checkins:[]},clinical_reading:{clinical_state:{status},metadata:{total_registros:count},summary:'Narrativa exclusiva do resumo',evidence:{dimensions,help_requests:[{record_id:1}],relevant_events:[{description:'Não produzir alerta'}]},alerts}});
 });
 await page.goto(FRONT+'/saude-mental/pessoas/18/contextos/9?instituicao_id=5');
 const panel=page.getByRole('region',{name:'Painel Clínico Inteligente'});
 await panel.waitFor();const cards=panel.locator(':scope > div').first().locator(':scope > div');
 assert.equal(await cards.count(),8);assert.equal(await panel.getByText('Sem dados',{exact:true}).count(),8);
 assert.equal(await panel.getByRole('heading',{name:'Atenção assistencial'}).count(),0);
 assert.ok(!(await panel.innerText()).includes('Narrativa exclusiva'));
 const summary=page.getByRole('region',{name:'Resumo clínico automático'});
 assert.match(await summary.getAttribute('class'),/mental-reading--neutral/);
 for(let i=0;i<8;i++)assert.match(await cards.nth(i).getAttribute('class'),/--neutral/);
 status="MOMENTO_OBSERVADO";
 count=1;
 const values=['BOM','POUCA','MODERADA','REGULAR','RUIM','MUITO_BOM','MUITO_RUIM'];
 dimensions=Object.fromEntries(keys.map((key,i)=>[key,{state:'INSUFICIENTE',observations:[{record_id:1,value:values[i],reported_value:values[i]}]}]));
 await page.getByRole('button',{name:'Atualizar',exact:true}).click();await panel.getByText('1 registro',{exact:true}).waitFor();
 for(const [i,label] of ['Bom','Pouca','Moderada','Regular','Ruim','Muito bom','Muito ruim'].entries())await cards.nth(i).getByText(label,{exact:true}).waitFor();
 assert.equal(await panel.getByText('Estado no Check-in mais recente',{exact:true}).count(),7);
 assert.match(await summary.getAttribute('class'),/--observed/);
 for(const [i,tone] of ['soft','soft','midpoint','midpoint','emphasis','soft','emphasis'].entries())assert.match(await cards.nth(i).getAttribute('class'),new RegExp('--'+tone));
 assert.equal(await panel.locator('.mental-comparison--neutral').count(),7);
 status="LEITURA_DESCRITIVA";
 count=3;
 const states=['MELHORA_OBSERVACIONAL','PIORA_OBSERVACIONAL','ESTABILIDADE_OBSERVACIONAL','OSCILACAO','INSUFICIENTE','INSUFICIENTE','INSUFICIENTE'];
 dimensions=Object.fromEntries(keys.map((key,i)=>[key,{state:states[i],observations:[{record_id:1,value:'MUITO_BOM'},{record_id:3,value:i>=4?null:values[i],reported_value:i===6?'NAO_SE_APLICA':i===5?'UNKNOWN':values[i]}]}]));
 alerts=['Há solicitação explícita de apoio <texto literal>.'];
 const before=requests;await page.getByRole('button',{name:'Atualizar',exact:true}).click();await panel.getByText('3 registros',{exact:true}).waitFor();assert.equal(requests,before+1);
 for(const [i,label] of ['Melhora observacional','Piora observacional','Estável','Oscilação'].entries())await cards.nth(i).getByText(label,{exact:true}).waitFor();
 await cards.nth(0).getByText('Bom',{exact:true}).waitFor();
 for(const i of [4,5])await cards.nth(i).getByText('Sem dados',{exact:true}).waitFor();
 await cards.nth(6).getByText('Não se aplica',{exact:true}).waitFor();
 assert.equal(await panel.getByText('Dados insuficientes para comparação',{exact:true}).count(),3);
 await panel.getByRole('heading',{name:'Atenção assistencial'}).waitFor();await panel.getByText(alerts[0],{exact:true}).waitFor();
 assert.match(await summary.getAttribute('class'),/--longitudinal/);
 assert.match(await summary.getAttribute('class'),/--attention/);
 for(const [i,tone] of ['improvement','worsening','stable','oscillation'].entries())assert.equal(await cards.nth(i).locator('.mental-comparison--'+tone).count(),1);
 for(const i of [4,5,6])assert.match(await cards.nth(i).getAttribute('class'),/--neutral/);
 assert.equal(await page.getByText('Narrativa exclusiva do resumo',{exact:true}).count(),1);
 for(const label of ['Registrar Diagnóstico','PHQ-9','GAD-7','CBI','Intervenção','Gerar relatório'])assert.equal(await page.getByLabel('Ações clínicas').getByRole('button',{name:label,exact:true}).isDisabled(),true);
 assert.ok(await page.evaluate(()=>{
 const p=document.querySelector('[aria-label="Painel Clínico Inteligente"]');
 return !!(document.querySelector('[aria-label="Resumo clínico automático"]').compareDocumentPosition(p)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(p.compareDocumentPosition(document.querySelector('#mental-evolution-title'))&Node.DOCUMENT_POSITION_FOLLOWING);
 }));
 await page.screenshot({path:'/tmp/mental-panel-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 alerts=[];await page.getByRole('button',{name:'Atualizar',exact:true}).click();await panel.getByRole('heading',{name:'Atenção assistencial'}).waitFor({state:'detached'});
 assert.ok(!(await summary.getAttribute('class')).includes('--attention'));
 for(const fallback of ["INSUFICIENTE","UNKNOWN"]) {
  status=fallback;
  await page.getByRole('button',{name:'Atualizar',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.mental-reading--neutral'));
  assert.match(await summary.getAttribute('class'),/--neutral/);
 }
 // Intensity and quality retain their own polarity, with no generic value scoring.
 status="MOMENTO_OBSERVADO";count=1;
 for(let position=0;position<5;position++){
  const quality=['MUITO_RUIM','RUIM','REGULAR','BOM','MUITO_BOM'];
  const intensity=['NENHUMA','POUCA','MODERADA','MUITA','EXTREMA'];
  dimensions=Object.fromEntries(keys.map(key=>[key,{observations:[{value:(['ansiedade','estresse'].includes(key)?intensity:quality)[position]}]}]));
  await page.getByRole('button',{name:'Atualizar',exact:true}).click();
  await cards.nth(0).getByText(['Muito ruim','Ruim','Regular','Bom','Muito bom'][position],{exact:true}).waitFor();
  for(let i=0;i<7;i++){
   const tone=(i===1||i===2?['soft','soft','midpoint','emphasis','emphasis']:['emphasis','emphasis','midpoint','soft','soft'])[position];
   assert.match(await cards.nth(i).getAttribute('class'),new RegExp('--'+tone));
  }
 }
 assert.deepEqual(errors,[]);console.log('PANEL_PASS: 8 cards; zero/one/multiple; evidence-only; latest/null/NA; comparison labels; backend alerts only; no extra HTTP; neutral responsive presentation; existing blocks/actions preserved.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
