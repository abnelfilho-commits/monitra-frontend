const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
// Local Vite must allow /private/tmp/c2-f12-evidence via server.fs.allow.
// Fixture is generated outside the repository; APIs are intercepted below.
fs.mkdirSync('/private/tmp/c2-f12-evidence',{recursive:true});
fs.writeFileSync('/private/tmp/c2-f12-evidence/harness.jsx','import React from "react";\nimport {createRoot} from "react-dom/client";\nimport {BrowserRouter} from "react-router-dom";\n        import {AuthContext} from \'/src/context/AuthContext.jsx\';\n        import Dimensionamento from \'/src/pages/Dimensionamento.jsx\';\n        function Harness(){const [identity,setIdentity]=React.useState({user:{id:1,perfil:\'ADMIN\'},loading:false});window.setIdentity=setIdentity;return React.createElement(AuthContext.Provider,{value:identity},React.createElement(BrowserRouter,null,React.createElement(Dimensionamento)));}\n        createRoot(document.getElementById(\'root\')).render(React.createElement(Harness));\n      ');
const FRONT = process.env.MENTAL_FRONT_URL || 'http://127.0.0.1:5177';
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage();
    const requests = [], errors = [];
    page.on('pageerror', e => {errors.push(e.message);console.error('PAGE_ERROR',e.message);});
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === FRONT && url.pathname === '/__abas_test') return route.fulfill({contentType:'text/html', body:`<div id="root"></div><script type="module" src="/@fs/private/tmp/c2-f12-evidence/harness.jsx"></script>`});
      if (url.origin === FRONT) return route.continue();
      requests.push({path:url.pathname,method:route.request().method()});
      let data=[];
      if(url.pathname==='/atividades-terapeuticas/linhas') data=[{id:1,slug:'cardiometabolico',nome:'Cardio'},{id:2,slug:'saude_mental',nome:'Saúde Mental'}];
      if(url.pathname==='/dimensionamento/ocupacoes') data=[{ocupacao_id:8,ocupacao_nome:'Psicólogo',total_planejamentos:2,horas_semanais:3,horas_mensais:13,horas_anuais:156,fte:.08}];
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
    });
    await page.goto(FRONT+'/__abas_test?modulo=cardiometabolico');
    const planning=()=>page.getByRole('tab',{name:'Planejamento de Equipe',exact:true});
    const monthly=()=>page.getByRole('tab',{name:'Consolidação Mensal',exact:true});
    const select=()=>page.getByRole('combobox',{name:'Linha de Cuidado'});
    await select().waitFor();
    assert.equal(await planning().getAttribute('aria-selected'),'true');
    assert.equal(await monthly().count(),1);
    assert.equal(await select().inputValue(),'cardiometabolico');
    await select().selectOption('saude_mental');
    await page.getByText('Linha analisada: Saúde Mental',{exact:true}).waitFor();
    const count=requests.filter(r=>r.path.startsWith("/dimensionamento/")).length;
    await monthly().click(); await page.getByText('Selecione os filtros e clique em Atualizar para consultar.',{exact:true}).waitFor();
    assert.equal(await page.getByRole('tabpanel').count(),1);
    await planning().click();assert.equal(await select().inputValue(),'saude_mental');assert.equal(requests.filter(r=>r.path.startsWith("/dimensionamento/")).length,count);
    await planning().focus();await page.keyboard.press('ArrowRight');assert.equal(await monthly().evaluate(e=>e===document.activeElement),true);
    await page.keyboard.press('Home');assert.equal(await planning().getAttribute('aria-selected'),'true');
    await page.keyboard.press('End');assert.equal(await monthly().getAttribute('aria-selected'),'true');
    await page.keyboard.press('ArrowLeft');assert.equal(await planning().getAttribute('aria-selected'),'true');
    assert.equal(await planning().evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
    for(const width of [1440,768,390]) {
      await page.setViewportSize({width,height:1000});
      for(const tab of [planning(),monthly()]) {
        await tab.click();
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        fs.mkdirSync('/tmp/c2-f12-evidence',{recursive:true});
        await page.screenshot({path:'/tmp/c2-f12-evidence/'+width+'-'+await tab.getAttribute('aria-controls')+'.png',fullPage:true});
      }
    }
    await page.evaluate(()=>window.setIdentity({user:{id:2,perfil:'GESTOR'},loading:false}));
    await monthly().waitFor({state:'detached'});
    assert.equal(await page.getByText('Selecione os filtros e clique em Atualizar para consultar.',{exact:true}).count(),0);
    assert.equal(await planning().getAttribute('aria-selected'),'true');
    await page.evaluate(()=>window.setIdentity({user:{id:3,perfil:'ADMIN'},loading:false}));
    await monthly().waitFor();assert.equal(await planning().getAttribute('aria-selected'),'true');
    await monthly().click();
    await page.evaluate(()=>window.setIdentity({user:{id:3,perfil:'ADMIN'},loading:true}));
    await monthly().waitFor({state:'detached'});assert.equal(await page.getByText('Selecione os filtros e clique em Atualizar para consultar.',{exact:true}).count(),0);
    await page.evaluate(()=>window.setIdentity({user:{id:3,perfil:'ADMIN'},loading:false}));
    await monthly().waitFor();assert.equal(await planning().getAttribute('aria-selected'),'true');
    await monthly().click();
    await page.evaluate(()=>window.setIdentity({user:{id:4,perfil:'ADMIN'},loading:false}));
    await page.waitForFunction(()=>document.querySelector('[role=tab][aria-selected=true]')?.textContent==='Planejamento de Equipe');
    assert.equal(await planning().getAttribute('aria-selected'),'true');
    assert.ok(requests.every(r=>r.method==='GET'&&!r.path.includes('consolidacao-gerencial')));
    assert.deepEqual(errors,[]);
    console.log('PASS: script de abas — inicial, ADMIN/não ADMIN, troca de identidade/loading, desmontagem, preservação de filtro e consultas, query Cardio, teclado/foco, 3 larguras e ausência de HTTP C2.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
