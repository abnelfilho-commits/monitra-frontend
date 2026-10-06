const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.PESSOAS_FRONT_URL || 'http://127.0.0.1:5176';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(10000);
    const person = { id: 4, nome_completo: 'Profissional sintético', cpf: '11144477735', ativo: true };
    let role = null, active = null, links = [], failRead = false, missingState = false, rejectWrite = false;
    const writes = [], calls = [], errors = [], unexpected = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('access_token', 'synthetic-only'));
    await page.route('**/*', async route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      if (new URL(req.url()).origin === FRONT) return route.continue();
      const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      calls.push({ path, method: req.method() });
      if (path === '/me') return reply({ id: 99, perfil: 'ADMIN', nome: 'Admin', modulos: [] });
      if (req.method() === 'GET') {
        if (path === '/admin/pessoas/') return reply([person]);
        if (path === '/admin/pessoas/4') return reply(person);
        if (path === '/admin/pessoas/4/acessos') return reply({ pessoa_id: 4, usuario: { id: 30, email: 'native@example.com', ativo: true }, autorizacoes: [{ id: 31, instituicao_id: 2, instituicao_nome: 'Instituição sintética', instituicao_ativa: true, perfil_institucional: 'PROFISSIONAL', ativo: true }] });
        if (path === '/admin/pessoas/4/vinculos') return failRead ? reply({}, 500) : reply({ pessoa_id: 4, paciente_id: null, profissional_id: role, ...(missingState ? {} : { profissional_ativo: active }), pacientes: [], profissionais: links });
        if (path === '/admin/instituicoes/') return reply([{ id: 2, razao_social: 'Instituição sintética', ativo: true }]);
        if (path === '/atividades-terapeuticas/ocupacoes-profissionais') return reply([{ id: 8, nome: 'Ocupação sintética', ativo: true }]);
      }
      if (req.method() === 'POST') {
        const body = req.postDataJSON(); writes.push({ path, body });
        if (rejectWrite) return reply({ detail: { code: 'ADMIN_REQUIRED' } }, 403);
        if (path === '/admin/identidades/papeis') {
          assert.equal(body.papel, 'PROFISSIONAL'); assert.equal(body.pessoa.cpf, person.cpf);
          assert.ok(body.chave_idempotencia); assert.equal(body.motivo, 'Preparação explícita');
          assert.deepEqual(Object.keys(body).sort(), ['chave_idempotencia', 'motivo', 'papel', 'pessoa']);
          role = 20; active = false;
          return reply({ profissional_id: 20, ativo: true }); // Must not infer role state from a write response.
        }
        if (path === '/admin/identidades/pessoas/4/profissional/ativar') { active = true; return reply({ ativo: false }); }
        if (path === '/admin/identidades/pessoas/4/profissional/inativar') { active = false; return reply({ ativo: true }); }
        if (path === '/admin/vinculos-institucionais/profissionais') {
          assert.deepEqual(body, { profissional_id: 20, instituicao_id: 2, ocupacao_id: 8, data_inicio: '2026-01-01', data_fim: null, motivo: 'Vínculo explícito' });
          links = [{ id: 40, ...body, instituicao_nome: 'Instituição sintética', instituicao_ativa: true, ativo: true }];
          return reply({ id: 40 });
        }
      }
      unexpected.push(req.method() + ' ' + path);
      return reply({}, 500);
    });
    const open = async () => {
      await page.goto(FRONT + '/admin/pessoas');
      await page.getByRole('button', { name: 'Ver / Editar', exact: true }).click();
      await page.getByRole('region', { name: 'Papel Profissional', exact: true }).waitFor();
    };
    await open();
    const panel = page.getByRole('region', { name: 'Papel Profissional', exact: true });
    await panel.getByText('Nenhum papel Profissional associado.', { exact: true }).waitFor();
    assert.equal(writes.length, 0);
    assert.equal(await page.getByRole('button', { name: 'Preparar papel assistencial', exact: true }).count(), 1);
    assert.equal(await panel.getByRole('button', { name: 'Preparar Profissional', exact: true }).isDisabled(), true);
    await panel.getByLabel('Motivo da preparação profissional *', { exact: true }).fill('Preparação explícita');
    await panel.getByRole('button', { name: 'Preparar Profissional', exact: true }).evaluate(b => { b.click(); b.click(); });
    await panel.getByText('Papel Profissional #20 — Inativo', { exact: true }).waitFor();
    assert.equal(writes.length, 1);
    await panel.getByRole('button', { name: 'Ativar Profissional', exact: true }).click();
    await panel.getByText('Papel Profissional #20 — Ativo', { exact: true }).waitFor();
    await panel.getByRole('button', { name: 'Adicionar vínculo profissional institucional', exact: true }).click();
    const createLink = panel.getByRole('button', { name: 'Criar vínculo profissional', exact: true });
    await createLink.waitFor(); assert.equal(await createLink.isDisabled(), true);
    assert.equal(await panel.getByLabel('Instituição do vínculo profissional *').inputValue(), '');
    assert.equal(await panel.getByLabel('Ocupação do vínculo profissional *').inputValue(), '');
    assert.equal(await panel.getByLabel('Vínculo profissional — início *').inputValue(), '');
    await panel.getByLabel('Instituição do vínculo profissional *').selectOption('2');
    await panel.getByLabel('Ocupação do vínculo profissional *').selectOption('8');
    await panel.getByLabel('Vínculo profissional — início *').fill('2026-01-01');
    await panel.getByLabel('Vínculo profissional — término').fill('2025-12-31');
    await panel.getByLabel('Motivo do vínculo profissional *').fill('Vínculo explícito');
    assert.equal(await createLink.isDisabled(), true);
    await panel.getByLabel('Vínculo profissional — término').fill('');
    await createLink.click();
    await page.getByRole('cell', { name: 'Ocupação #8', exact: true }).waitFor();
    await panel.getByRole('button', { name: 'Inativar Profissional', exact: true }).click();
    await panel.getByText('Papel Profissional #20 — Inativo', { exact: true }).waitFor();
    assert.equal(links[0].ativo, true);
    const beforeReload = writes.length;
    await open();
    await panel.getByText('Papel Profissional #20 — Inativo', { exact: true }).waitFor();
    await page.getByRole('cell', { name: 'Válido', exact: true }).waitFor();
    assert.equal(writes.length, beforeReload);
    active = true; links[0].ativo = false;
    await panel.getByRole('button', { name: 'Atualizar estado do Profissional', exact: true }).click();
    await panel.getByText('Papel Profissional #20 — Ativo', { exact: true }).waitFor();
    await page.getByRole('cell', { name: 'Invalidado', exact: true }).waitFor();
    failRead = true;
    await panel.getByRole('button', { name: 'Inativar Profissional', exact: true }).click();
    await panel.getByRole('alert').filter({ hasText: 'Escrita confirmada' }).waitFor();
    assert.equal(await panel.getByRole('button', { name: 'Inativar Profissional', exact: true }).isDisabled(), true);
    failRead = false;
    await panel.getByRole('button', { name: 'Atualizar estado do Profissional', exact: true }).click();
    await panel.getByText('Papel Profissional #20 — Inativo', { exact: true }).waitFor();
    rejectWrite = true;
    await panel.getByRole('button', { name: 'Ativar Profissional', exact: true }).click();
    await panel.getByRole('alert').filter({ hasText: 'ADMIN global' }).waitFor();
    assert.equal(active, false); rejectWrite = false;
    missingState = true; await open();
    await panel.getByRole('alert').filter({ hasText: 'Estado do papel Profissional indisponível' }).waitFor();
    assert.equal(await panel.getByRole('button', { name: 'Ativar Profissional', exact: true }).count(), 0);
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.deepEqual(unexpected, []);
    for (const write of writes) {
      assert.ok(['/admin/identidades/papeis', '/admin/identidades/pessoas/4/profissional/ativar', '/admin/identidades/pessoas/4/profissional/inativar', '/admin/vinculos-institucionais/profissionais'].includes(write.path));
      assert.ok(!JSON.stringify(write.body || {}).includes('clinica_id'));
    }
    assert.ok(calls.filter(c => c.path === '/admin/pessoas/4/vinculos').length > writes.length);
    console.log('B3 PASS: criação, leitura persistida, lifecycle, vínculo explícito, reload, estados independentes, double-submit, falha de leitura/403, contrato ausente fail-closed; zero legado/participação/grants.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
