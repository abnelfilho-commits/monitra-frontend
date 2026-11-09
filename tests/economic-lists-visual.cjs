// Local Vite on 5176 with VITE_API_URL=http://127.0.0.1:18769; synthetic API only.
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT='http://127.0.0.1:5176';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',r=>{
   const u=new URL(r.request().url());if(u.origin===FRONT)return r.continue();
   assert.equal(r.request().method(),'GET');
   const reply=data=>r.fulfill({contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname==='/me')return reply({id:99,nome:'Admin Demo',perfil:'ADMIN',modulos:[]});
   if(u.pathname==='/admin/economia/tabelas/')return reply([{id:1,proprietario_nome:'Instituição de Homologação',codigo:'TABELA-HML-2026',nome:'Tabela de Serviços de Saúde Mental',moeda:'BRL'}]);
   if(u.pathname==='/admin/economia/contratos/')return reply([{id:4,pagador_nome:'Instituição de Homologação',codigo:'CONTRATO-HML-2026',edicao:1,tabela_codigo:'TABELA-HML-2026',tabela_nome:'Tabela de Serviços de Saúde Mental',inicio:'2026-11-09',fim:'2026-12-31',estado:'PUBLISHED'}]);
   return reply([]);
  });
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   for(const kind of ['tabelas','contratos']){
    await page.goto(`${FRONT}/admin/economia/${kind}`);
    const region=page.locator('.institutional-table');await region.locator('tbody tr').waitFor();
    const refresh=page.getByRole('button',{name:'Atualizar',exact:true});
    assert.ok((await refresh.boundingBox()).width<150);
    await refresh.click();await region.locator('tbody tr').waitFor();
    for(const cell of await region.locator('thead th').all())assert.equal(await cell.evaluate(e=>getComputedStyle(e).whiteSpace),'nowrap');
    assert.equal(await region.getByRole('link',{name:'Abrir',exact:true}).getAttribute('href'),`/admin/economia/${kind}/${kind==='tabelas'?1:4}`);
    assert.equal(await region.getByRole('link',{name:'Abrir',exact:true}).evaluate(e=>getComputedStyle(e).whiteSpace),'nowrap');
    if(kind==='contratos')assert.equal(await region.getByText('PUBLICADO',{exact:true}).evaluate(e=>getComputedStyle(e).whiteSpace),'nowrap');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    if(width===390)assert.ok(await region.evaluate(e=>e.scrollWidth>e.clientWidth));
    await region.scrollIntoViewIfNeeded();await page.screenshot({path:`/private/tmp/f231-${kind}-${width}.png`});
    await region.evaluate(e=>e.scrollLeft=e.scrollWidth);
    const b=await region.boundingBox(),a=await region.getByRole('link',{name:'Abrir',exact:true}).boundingBox();
    assert.ok(a.x>=b.x && a.x+a.width<=b.x+b.width+1,'Abrir accessible by internal scroll');
    await page.screenshot({path:`/private/tmp/f231-${kind}-${width}-actions.png`});
   }
  }
  assert.deepEqual(errors,[]);console.log('PASS F23.1: two lists at 1440/390; refresh, headers, dates/status, links and internal scroll; GET-only');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
