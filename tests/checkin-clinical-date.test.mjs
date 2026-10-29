import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { buildSync } from 'esbuild';
import { wellbeingEvents, diagnosisEvents, interventionEvents, sessionEvents, phq9Events, gad7Events, cbiEvents } from '../src/pages/saudeMental/bemEstarPresentation.js';

const directory = mkdtempSync(join(tmpdir(), 'clinical-date-render-'));
let render;
try {
  const outfile = join(directory, 'render.cjs');
  buildSync({ stdin: { contents: `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import Timeline from './src/pages/saudeMental/TimelineBemEstar.jsx';
    export const render = events => renderToStaticMarkup(React.createElement(Timeline, { events, available: true }));
  `, resolveDir: process.cwd(), loader: 'jsx' }, outfile, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic' });
  render = createRequire(import.meta.url)(outfile).render;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
const base = { id: 137, data_hora: '2026-10-29T00:30:00Z', data_registro: '2020-02-29', baseline: false,
  respondente_pessoa_id: 1, canal: 'WHATSAPP', modalidade: 'AUTORRELATO', respostas: {} };

for (const timezone of ['UTC', 'America/Cuiaba', 'Pacific/Kiritimati']) {
  test(`civil date stays independent of creation timestamp in ${timezone}`, () => {
    const previous = process.env.TZ;
    process.env.TZ = timezone;
    try {
      const [event] = wellbeingEvents([base], 'Pessoa sintética', 1);
      assert.equal(event.data, '2020-02-29');
      assert.equal(event.created_at, base.data_hora);
      const html = render([event]);
      assert.match(html, /Data clínica: 29\/02\/2020/);
      assert.match(html, /Registrado em:/);
      assert.match(html, /WHATSAPP/);
      assert.match(html, /AUTORRELATO/);
    } finally {
      if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
    }
  });
}
test('missing clinical dates do not fall back to creation timestamps', () => {
  for (const data_registro of [undefined, null, '']) {
    const [event] = wellbeingEvents([{ ...base, data_registro }], 'Pessoa sintética', 1);
    assert.equal(event.created_at, base.data_hora);
    assert.match(render([event]), /Data clínica não informada/);
  }
});
test('assisted check-ins and other timeline events preserve their presentation', () => {
  const [assisted] = wellbeingEvents([{ ...base, canal: 'PORTAL_PROFISSIONAL', modalidade: 'ASSISTIDO' }], 'Pessoa sintética', 1);
  const [diagnosis] = diagnosisEvents([{ id: 1, tipo: 'DIAGNOSTICO', data_diagnostico: '2021-01-02', created_at: base.data_hora }]);
  assert.equal(assisted.origem, 'Portal Profissional');
  assert.equal(assisted.modalidade, 'Assistida');
  assert.equal(diagnosis.data, '2021-01-02');
  assert.equal(diagnosis.created_at, base.data_hora);
  const html = render([assisted, diagnosis]);
  assert.match(html, /Data clínica: 29\/02\/2020/);
  assert.match(html, /Data clínica: 02\/01\/2021/);
});

test('session, intervention and instrument dates retain their existing semantics', () => {
  const [session] = sessionEvents([{ id: 1, status: 'REALIZADA', registro_longitudinal_id: 2, data_agendada: '2021-01-02', registrado_em: base.data_hora }]);
  assert.equal(session.data, '2021-01-02');
  assert.equal(session.created_at, base.data_hora);
  const [intervention] = interventionEvents([{ id: 1, data_intervencao: '2020-02-29T12:00:00Z', created_at: base.data_hora }]);
  assert.equal(intervention.data_hora, '2020-02-29T12:00:00Z');
  assert.equal(intervention.created_at, base.data_hora);
  for (const adapter of [phq9Events, gad7Events, cbiEvents]) {
    const [event] = adapter([{ id: 1, data_hora: base.data_hora, resultado: { versao: '1', metadata: { respostas: {} } } }]);
    assert.equal(event.created_at, base.data_hora);
    assert.equal(event.data, undefined);
    assert.equal(event.data_hora, undefined);
  }
  assert.match(render([session, intervention]), /Data clínica: 02\/01\/2021/);
});
