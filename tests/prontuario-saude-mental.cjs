const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.MENTAL_FRONT_URL || 'http://127.0.0.1:5177';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(10000);
    await page.addInitScript(() => localStorage.setItem('access_token', 'synthetic-only'));
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const item = { pessoa_id: 18, nome_completo: 'Pessoa sintética', nome_social: 'Nome social sintético', paciente_id: 24, instituicao_id: 5, instituicao_nome: 'Instituição sintética', paciente_instituicao_id: 7, contexto_assistencial_id: 9, data_inicio: '2026-01-01', data_fim: null, contexto_estado: 'ABERTO', modulo_id: 3, linha_estado: 'ATIVA' };
    let allow = false, status = 200;
    const requests = [];
    await page.route('**/*', async route => {
      const req = route.request(), u = new URL(req.url());
      if (u.origin === FRONT) return route.continue();
      requests.push({ path: u.pathname, method: req.method() });
      const reply = (body, code = 200) => route.fulfill({ status: code, contentType: 'application/json', body: JSON.stringify(body) });
      if (u.pathname === '/me') return reply({ id: 99, nome: 'Synthetic', perfil: 'PROFISSIONAL', modulos: [] });
      assert.equal(req.method(), 'GET');
      assert.ok(u.pathname.startsWith('/saude-mental/'), u.pathname);
      if (u.pathname === '/saude-mental/instituicoes') return reply([{ id: 5, nome: item.instituicao_nome }]);
      assert.equal(u.searchParams.get('instituicao_id'), '5');
      if (u.pathname === '/saude-mental/pessoas') return reply({ itens: [item], tem_mais: false });
      assert.equal(u.pathname, '/saude-mental/pessoas/18/contextos/9');
      return reply({ ...item, bem_estar: { pode_registrar: allow, checkins: [], formulario: { id: 15, campos: [{ id: 1, nome_campo: 'humor', label: 'Humor', tipo_campo: 'radio', obrigatorio: true, opcoes: [{ valor: 'BOM', label: 'Bom' }] }] } } }, status);
    });
    await page.goto(FRONT + '/saude-mental');
    await page.locator('#mental-institution').selectOption('5');
    await page.getByRole('link', { name: 'Abrir jornada' }).click();
    await page.getByRole('heading', { name: 'Prontuário Saúde Mental 360°' }).waitFor();
    await page.getByRole('heading', { name: item.nome_social }).waitFor();
    const header = page.locator('.mental-record__identity');
    assert.ok((await header.innerText()).includes(item.instituicao_nome));
    assert.ok((await header.innerText()).includes('Pessoa #18 · Contexto #9'));
    assert.ok((await header.innerText()).includes('Aberto'));
    assert.ok((await header.innerText()).includes('Saúde Mental'));
    await page.getByRole('heading', { name: 'Visão Geral', exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Ações clínicas' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Realizar Check-in Inicial' }).isDisabled(), true);
    assert.equal(await page.locator('.mental-record__summary').getByText('Indisponível', { exact: true }).count(), 1);
    allow = true;
    await page.reload();
    await page.locator('.mental-record__summary').getByText('Disponível', { exact: true }).waitFor();
    await page.screenshot({ path: '/tmp/w3a-prontuario-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Realizar Check-in Inicial' }).click();
    await page.getByRole('heading', { name: 'Check-in Inicial — Nome social sintético' }).waitFor();
    await page.getByText('Modalidade assistida · Portal Profissional').waitFor();
    for (const name of ['Registrar Diagnóstico', 'PHQ-9', 'GAD-7', 'CBI', 'PTS', 'Intervenção', 'Gerar relatório']) {
      assert.equal(await page.getByRole('button', { name, exact: true }).count(), 0);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: '/tmp/w3a-prontuario-mobile.png', fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    status = 403;
    await page.reload();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.locator('.mental-record').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Realizar Check-in Inicial' }).count(), 0);
    const source = fs.readFileSync('src/pages/saudeMental/ProntuarioSaudeMental.jsx', 'utf8');
    assert.doesNotMatch(source, /clinica_id|ClinicalSummaryCard|services\/pacientes|services\/profissionais/);
    assert.ok(requests.length > 0);
    assert.deepEqual(errors, []);
    console.log('W3A_PASS: navegação, identificação canônica, resumo factual, leitura/escrita backend, Check-in assistido, responsividade, erro sem vazamento e ausência de atalhos legados.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
