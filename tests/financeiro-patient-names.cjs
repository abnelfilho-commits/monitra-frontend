// Start Vite with VITE_API_URL=http://127.0.0.1:18769 and --host 127.0.0.1 --port 5176.
// Local browser regression with intercepted API responses; no HML requests.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.F22_FRONT_URL || 'http://127.0.0.1:5176';
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('access_token','synthetic-only'));
    let old = false;
    const total = {quantidade_considerada:1,quantidade_precificada:1,quantidade_pendente:0,subtotal_precificado:'150.00'};
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === FRONT) return route.continue();
      const reply = data => route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
      if (url.pathname === '/me') return reply({id:99,nome:'Admin',perfil:'ADMIN',modulos:[]});
      if (url.pathname === '/financeiro/institucional/contexto') return reply({instituicoes:[{id:3,nome:'Demo'}],contratos:[{id:4,instituicao_id:3,codigo:'Demo',edicao:1}]});
      if (url.pathname === '/financeiro/institucional/preview') return reply({
        resumo:{...total,quantidade_considerada:3,quantidade_precificada:3,subtotal_precificado:'450.00',completude:'PRECIFICADO'},
        pacientes:[21,22,23].map(id => ({...total,paciente_id:id,...(!old ? {paciente_nome:id===23?'Legado':'Antônio João'} : {})})),
        detalhes:[21,22,23].map(id => ({paciente_id:id,item:{sessao_id:id,data_economica:'2026-11-09',subtotal:'150.00'},evidencia:{vinculos:[]}})),
        totais_por_mes:[],totais_por_servico:[],pendencias:[]
      });
      return reply([]);
    });
    await page.goto(FRONT+'/financeiro/institucional');
    await page.getByLabel('Instituição').selectOption('3');
    await page.getByLabel('Contrato').selectOption('4');
    await page.getByLabel('Linha assistencial').selectOption('3');
    await page.getByLabel('Data inicial').fill('2026-11-01');
    await page.getByLabel('Data final').fill('2026-11-30');
    await page.getByRole('button',{name:'Gerar projeção',exact:true}).click();
    for (const id of [21,22]) {
      await page.getByRole('button',{name:`Antônio João · #${id}`,exact:true}).click();
      await page.getByRole('heading',{name:`Detalhes — Antônio João · #${id}`,exact:true}).waitFor();
      assert.equal(await page.locator('details').count(),1);
      assert.match(await page.locator('details summary').innerText(),new RegExp(`Antônio João · #${id}`));
      await page.locator('details summary').click();
      assert.equal(await page.locator('details').getAttribute('open'),'');
    }
    await page.getByRole('button',{name:'Legado · #23',exact:true}).click();
    await page.getByRole('heading',{name:'Detalhes — Legado · #23',exact:true}).waitFor();
    old = true;
    await page.getByRole('button',{name:'Gerar projeção',exact:true}).click();
    await page.getByRole('button',{name:'Paciente #21',exact:true}).click();
    await page.getByRole('heading',{name:'Detalhes — Paciente #21',exact:true}).waitFor();
    assert.match(await page.locator('details summary').innerText(),/Paciente #21/);
    assert.equal(await page.getByRole('button',{name:/Antônio João/}).count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: canonical names, homonyms by ID, legacy, old response, detail selection and expansion');
  } finally { await browser.close(); }
})().catch(e => {console.error(e);process.exitCode=1;});
