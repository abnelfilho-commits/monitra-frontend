const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.MENTAL_FRONT_URL || 'http://127.0.0.1:5177';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(12000);
  const requests=[],errors=[];let state='data',delay=0;
  const row=(hours,count=1)=>({ocupacao_id:8,ocupacao_nome:'Psicólogo',total_planejamentos:count,minutos_semanais:hours*60,horas_semanais:hours,horas_mensais:Math.round(hours*433)/100,horas_anuais:hours*52,fte:Math.round(hours/40*100)/100});
  const lines=[{id:11,nome:'Neurodesenvolvimento',slug:'neurodesenvolvimento'},{id:22,nome:'Cardiometabólico',slug:'cardiometabolico'},{id:33,nome:'Saúde Mental',slug:'saude_mental'}];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const q=route.request(),u=new URL(q.url());if(u.origin===FRONT)return route.continue();
   const reply=(x,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(x)});
   requests.push({path:u.pathname,method:q.method(),query:u.search});
   if(u.pathname==='/me')return reply({id:99,nome:'Synthetic',perfil:'ADMIN',modulos:[]});
   if(u.pathname==='/atividades-terapeuticas/linhas')return reply(lines);
   if(u.pathname==='/dimensionamento/ocupacoes'){
    if(delay)await new Promise(r=>setTimeout(r,delay));
    if(state==='error')return reply({detail:'Synthetic'},500);
    if(state==='empty')return reply([]);
    const line=u.searchParams.get('linha');assert.ok(['todas',...lines.map(l=>l.slug)].includes(line));
    return reply([row({todas:7.75,neurodesenvolvimento:5,cardiometabolico:2,saude_mental:.75}[line],line==='todas'?3:1)]);
   }
   if(u.pathname==='/capacidade-instalada/demanda-capacidade')return reply([]);
   return reply([]);
  });
  const select=()=>page.getByRole('combobox',{name:'Linha de Cuidado'});
  const main=()=>page.getByRole('main');
  const verify=async(slug,hours,count)=>{
   await select().waitFor();assert.equal(await select().inputValue(),slug);
   await page.getByText('Horas Semanais',{exact:true}).locator('..').getByText(hours.toFixed(2)+' h',{exact:true}).waitFor();
   const table=page.getByRole('table').first();
   const cells=await table.locator('tbody tr').first().locator('td').allTextContents();
   assert.equal(cells[0],'Psicólogo');assert.equal(Number(cells[1]),count);assert.equal(Number(cells[2]),hours);
   await page.getByText('Maior demanda assistencial: Psicólogo',{exact:true}).waitFor();
   await page.getByText((hours*52).toFixed(2)+' h/ano',{exact:true}).waitFor();
  };
  await page.goto(FRONT+'/dimensionamento');await verify('todas',7.75,3);
  assert.deepEqual(await select().locator('option').allTextContents(),['Todas',...lines.map(l=>l.nome)]);
  assert.equal(requests.filter(r=>r.path.includes('capacidade-instalada')).length,0);
  for(const [slug,hours] of [['neurodesenvolvimento',5],['cardiometabolico',2],['saude_mental',.75],['todas',7.75]]){
   await select().selectOption(slug);await verify(slug,hours,slug==='todas'?3:1);
  }
  assert.deepEqual(requests.filter(r=>r.path.includes('capacidade-instalada')).map(r=>r.query),['?modulo_id=11','?modulo_id=22']);
  await select().selectOption('saude_mental');await verify('saude_mental',.75,1);
  await page.getByText('Horas Mensais',{exact:true}).locator('..').getByText('3.25 h',{exact:true}).waitFor();
  await page.getByText('Equipe Necessária',{exact:true}).locator('..').getByText('0.02 FTE',{exact:true}).waitFor();
  fs.mkdirSync('/tmp/dimensionamento-multilinha',{recursive:true});
  for(const width of [1440,768,390]){
   await page.setViewportSize({width,height:1000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow '+width);
   await page.screenshot({path:'/tmp/dimensionamento-multilinha/'+width+'.png',fullPage:true});
  }
  state='empty';delay=700;await select().selectOption('neurodesenvolvimento');
  await page.getByText('Carregando dimensionamento...',{exact:true}).waitFor();
  await page.getByText('Nenhum planejamento encontrado para dimensionamento.',{exact:true}).waitFor();
  state='error';delay=0;await select().selectOption('saude_mental');
  await page.getByRole('alert').filter({hasText:'Não foi possível consultar o dimensionamento'}).waitFor();
  assert.equal(await page.getByText('Nenhum planejamento encontrado para dimensionamento.',{exact:true}).count(),0,'error must not claim empty demand');
  state='data';await select().selectOption('todas');await verify('todas',7.75,3);
  await page.goto(FRONT+'/dimensionamento?modulo=cardiometabolico');await verify('cardiometabolico',2,1);
  assert.ok(requests.every(r=>r.method==='GET'));assert.deepEqual(errors,[]);
  assert.equal(await main().getByText(/Saúde Mental não está incluída/).count(),0);
  console.log('DIMENSIONAMENTO_MULTILINHA_PASS: 4 filters, canonical slugs/catalog IDs, cards/bars/insight/table, loading/empty/error/recovery, legacy capacity separate, GET-only, responsive 1440/768/390.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
