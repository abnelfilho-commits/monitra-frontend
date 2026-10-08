const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT=process.env.MENTAL_FRONT_URL || 'http://127.0.0.1:5177';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage();const errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));
  const lines=[{id:1,nome:'Neurodesenvolvimento'},{id:2,nome:'Cardiometabólico'},{id:3,nome:'Saúde Mental'}];
  const activities=[{id:71,nome:'Psicoterapia sintética',modulo_id:1,modulo_ids:[1]}];
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const q=route.request(),u=new URL(q.url());if(u.origin===FRONT)return route.continue();
   const reply=x=>route.fulfill({contentType:'application/json',body:JSON.stringify(x)});
   if(u.pathname==='/me')return reply({id:99,perfil:'ADMIN',nome:'Synthetic',modulos:[]});
   if(u.pathname==='/atividades-terapeuticas/linhas')return reply(lines);
   if(q.method()==='PUT'){
    const payload=q.postDataJSON();writes.push(payload);activities[0].modulo_ids=payload.modulo_ids;return reply(activities[0]);
   }
   if(q.method()==='POST'){
    const payload=q.postDataJSON();writes.push(payload);activities.push({id:72,...payload});return reply(activities.at(-1));
   }
   if(u.pathname==='/atividades-terapeuticas/')return reply(activities.filter(a=>a.modulo_ids.includes(Number(u.searchParams.get('modulo_id')))));
   if(u.pathname==='/atividades-terapeuticas/ocupacoes-profissionais')return reply([{id:2,nome:'Psicólogo sintético'}]);
   return reply([]);
  });
  await page.goto(FRONT+'/atividades-terapeuticas');
  await page.locator('select').nth(1).selectOption('71');
  await page.getByRole('checkbox',{name:'Saúde Mental',exact:true}).check();
  await page.getByRole('button',{name:'Salvar linhas aplicáveis'}).click();await page.getByText('Linhas aplicáveis atualizadas.',{exact:true}).waitFor();
  assert.deepEqual(writes[0].modulo_ids,[1,3]);
  for(const line of ['neuro','saude_mental']){
   await page.getByLabel('Linha do catálogo').selectOption(line);await page.locator('select').nth(1).selectOption('71');
   assert.equal(await page.locator('select').nth(1).locator('option[value="71"]').count(),1);
  }
  await page.reload();await page.locator('select').nth(1).selectOption('71');
  assert.ok(await page.getByRole('checkbox',{name:'Neurodesenvolvimento',exact:true}).isChecked());
  await page.getByRole('checkbox',{name:'Neurodesenvolvimento',exact:true}).uncheck();
  await page.getByRole('button',{name:'Salvar linhas aplicáveis'}).click();await page.getByText('Linhas aplicáveis atualizadas.',{exact:true}).waitFor();
  await page.getByLabel('Linha do catálogo').selectOption('neuro');await page.waitForTimeout(100);
  assert.equal(await page.locator('select').nth(1).locator('option[value="71"]').count(),0);
  await page.getByRole('button',{name:'+ Nova Atividade',exact:true}).click();
  await page.getByRole('checkbox',{name:'Saúde Mental',exact:true}).check();
  await page.getByPlaceholder('Ex.: Integração Sensorial').fill('Multilinha sintética');
  await page.getByRole('button',{name:'Salvar atividade',exact:true}).click();await page.waitForURL(FRONT+'/atividades-terapeuticas');
  assert.deepEqual(writes.at(-1).modulo_ids,[1,3]);assert.equal(writes.at(-1).modulo_id,undefined);
  assert.deepEqual(errors,[]);console.log('ATIVIDADE_LINHAS_PASS: create multi, edit, removal, same ID across filters, reload, canonical payload. Synthetic HTTP only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
