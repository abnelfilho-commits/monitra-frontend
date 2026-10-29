import assert from 'node:assert/strict';
import { test, before, after, afterEach } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const temp = mkdtempSync(join(tmpdir(), 'whatsapp-mental-test-'));
const outfile = join(temp, 'harness.cjs');
await build({ stdin: { contents: `
  export { default as Component } from './src/pages/saudeMental/WhatsAppMental.jsx';
  export { default as Prontuario } from './src/pages/saudeMental/ProntuarioSaudeMental.jsx';
  export { MemoryRouter } from 'react-router-dom';
  export { createElement, act } from 'react';
  export { createRoot } from 'react-dom/client';
`, resolveDir: process.cwd(), loader: 'jsx' }, outfile, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', resolveExtensions: ['.js', '.jsx', '.json'],
  plugins: [{ name: 'synthetic-api-only', setup(build) {
    build.onLoad({ filter: /\/(services|lib)\/api\.js$/ }, () => ({ contents: `export const api = {
      get: (url, config) => globalThis.syntheticAPI('GET', url, null, config),
      put: (url, body, config) => globalThis.syntheticAPI('PUT', url, body, config),
      post: (url, body, config) => globalThis.syntheticAPI('POST', url, body, config)
    }; export default api;`, loader: 'js' }));
    build.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'js' }));
  } }], logLevel: 'silent' });
const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://synthetic.invalid/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, sessionStorage: dom.window.sessionStorage,
  HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
const channels = [];
const NativeMessageChannel = globalThis.MessageChannel;
globalThis.MessageChannel = class extends NativeMessageChannel { constructor() { super(); channels.push(this); } };
const { Component, Prontuario, MemoryRouter, createElement: h, act, createRoot } = createRequire(import.meta.url)(outfile);
const jornada = { instituicao_id: 2, pessoa_id: 1, contexto_assistencial_id: 1, paciente_id: 19,
  instituicao_nome: 'Instituição sintética', nome_completo: 'Pessoa sintética', linha_estado: 'ATIVA', contexto_estado: 'ABERTO',
  bem_estar: { pode_registrar: true, checkins: [] } };
const scheduled = '2026-10-30T23:49:54Z';
function fixture() {
  return { acompanhamento: { id: 1, contexto_assistencial_id: 1, paciente_id: 19, telefone: '5565999991234', status: 'ATIVO', consentimento_status: 'CONSENTIDO', frequencia: 'SEMANAL', proximo_envio_em: scheduled, dia_semana: null, horario_local: null, programacao_ativa: false },
    autorizacao: { acompanhamento_id: 1, estado: 'AUTORIZADA' },
    comunicacao: { acompanhamento_id: 1, estado: 'SEM_INTERRUPCAO_REGISTRADA', interrompido_pela_pessoa: false, bloqueio_preventivo: false },
    diagnostico: { acompanhamento_id: 1, conversas: [] } };
}
const conversation = (state = 'CONCLUIDA', attempt = null) => ({ conversa_id: 5, estado_assistencial: state, tentativas: attempt ? [{ id: 3, tentativa: 1, ...attempt }] : [] });
let data, requests, root, postHandler, getHandler, putHandler;
const element = () => document.getElementById('root');
const text = () => element().textContent;
const button = name => [...element().querySelectorAll('button')].find(b => b.textContent === name);
const requestButton = () => button('Solicitar check-in');
async function click(name) { await act(async () => button(name).click()); }
async function mount(value = jornada) { root = createRoot(element()); await act(async () => root.render(h(Component, { jornada: value }))); await click('Check-in via WhatsApp'); }
async function refresh() { await click('Atualizar WhatsApp'); }
async function unmount() { if (root) { await act(async () => root.unmount()); root = null; } }
async function flush() { await act(async () => {}); }
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
before(() => {
  // No network is possible: all API methods are replaced at bundle time.
  globalThis.syntheticAPI = async (method, url, body, config) => {
    requests.push({ method, url, body, config });
    if (method === 'PUT') return { data: await putHandler({ url, body, config }) };
    if (method === 'POST') return { data: await postHandler({ url, body, config }) };
    if (getHandler) await getHandler({ url, config });
    const suffix = url.split('/whatsapp')[1];
    const key = { '': 'acompanhamento', '/autorizacao-comunicacao': 'autorizacao', '/comunicacao': 'comunicacao', '/diagnostico': 'diagnostico' }[suffix];
    assert.ok(key, `Unexpected API: ${url}`);
    return { data: structuredClone(data[key]) };
  };
});
afterEach(async () => { await unmount(); sessionStorage.clear(); getHandler = null; });
after(() => { dom.window.close(); for (const channel of channels) { channel.port1.close(); channel.port2.close(); } globalThis.MessageChannel = NativeMessageChannel; rmSync(temp, { recursive: true, force: true }); });
function reset() { putHandler = ({ body }) => ({ ...data.acompanhamento, ...body, horario_local: body.horario_local + ':00', proximo_envio_em: body.programacao_ativa ? scheduled : null }); data = fixture(); requests = []; getHandler = null; postHandler = () => { throw new Error('Unexpected POST'); }; }

test('loading is blocked; all four existing reads use explicit institutional scope', async () => {
  reset(); const gate = deferred(); getHandler = () => gate.promise;
  await mount(); assert.match(text(), /Consultando acompanhamento/); assert.equal(requestButton().disabled, true);
  gate.resolve(); await flush(); assert.equal(requestButton().disabled, false);
  assert.equal(requests.length, 4);
  for (const call of requests) { assert.equal(call.config.params.instituicao_id, 2); assert.match(call.url, /\/pessoas\/1\/contextos\/1\/whatsapp/); }
  assert.match(text(), /O check-in extraordinário não altera a programação semanal/);
});
test('absence is distinct from a read error and never enables dispatch', async () => {
  reset(); data.acompanhamento = null;
  for (const key of ['autorizacao', 'comunicacao', 'diagnostico']) data[key].acompanhamento_id = null;
  await mount(); assert.match(text(), /não configurado/); assert.equal(requestButton().disabled, true);
});
test('403 and malformed or mismatched scope fail closed', async () => {
  reset(); getHandler = () => { throw { response: { status: 403 } }; };
  await mount(); assert.match(text(), /Consulta WhatsApp não autorizada/); assert.equal(requestButton().disabled, true);
  getHandler = null; data.acompanhamento.contexto_assistencial_id = 99; await refresh();
  assert.match(text(), /Não foi possível confirmar o estado/); assert.equal(requestButton().disabled, true);
  data = fixture(); data.diagnostico = {}; await refresh(); assert.equal(requestButton().disabled, true);
});
test('read-only professionals cannot submit even with otherwise eligible data', async () => {
  reset(); await mount({ ...jornada, bem_estar: { pode_registrar: false } });
  assert.equal(requestButton().disabled, true); assert.match(text(), /não autorizada para registro/);
});
test('known care, consent, authorization, communication and execution blockers', async () => {
  const cases = [
    d => { d.acompanhamento.status = 'PAUSADO'; },
    d => { d.acompanhamento.status = 'ENCERRADO'; },
    d => { d.acompanhamento.consentimento_status = 'REVOGADO'; },
    d => { d.autorizacao.estado = 'AUSENTE'; },
    d => { d.autorizacao.estado = 'DESTINO_DIVERGENTE'; },
    d => { d.comunicacao.estado = 'WHATSAPP_INTERROMPIDO'; },
    d => { d.comunicacao.interrompido_pela_pessoa = true; },
    d => { d.comunicacao.bloqueio_preventivo = true; },
    d => { d.diagnostico.conversas = [conversation('AGUARDANDO_ACEITE')]; },
    d => { d.diagnostico.conversas = [conversation('EM_ANDAMENTO')]; },
    ...['PREPARADO', 'EM_EXECUCAO', 'INCERTO'].map(estado => d => { d.diagnostico.conversas = [conversation('EXPIRADA', { estado })]; }),
  ];
  for (const change of cases) { reset(); change(data); await mount(); assert.equal(requestButton().disabled, true); await unmount(); }
  reset(); data.acompanhamento.consentimento_status = 'PENDENTE'; await mount(); assert.equal(requestButton().disabled, false);
});
test('confirmation masks the phone; cancellation does not post', async () => {
  reset(); await mount(); await click('Solicitar check-in');
  assert.equal(document.querySelector('dialog[aria-label]').open, true);
  assert.match(text(), /Pessoa sintética/); assert.match(text(), /Contexto #1/); assert.match(text(), /•••• •••• 1234/);
  assert.ok(!text().includes(data.acompanhamento.telefone));
  await click('Cancelar'); assert.equal(document.querySelector('dialog[aria-label]').open, false);
  assert.equal(requests.filter(c => c.method === 'POST').length, 0);
});
test('one POST on double click, exact contract, Meta acceptance is not delivery; schedule unchanged', async () => {
  reset(); const gate = deferred(); postHandler = () => gate.promise;
  await mount(); await click('Solicitar check-in');
  const confirm = button('Confirmar solicitação');
  await act(async () => { confirm.click(); confirm.click(); });
  assert.equal(requests.filter(c => c.method === 'POST').length, 1);
  const call = requests.find(c => c.method === 'POST');
  assert.deepEqual(call.body, { motivo: 'ACOMPANHAMENTO_EXTRAORDINARIO' });
  assert.equal(call.url, '/saude-mental/pessoas/1/contextos/1/whatsapp/disparar-manual');
  assert.match(call.config.headers['Idempotency-Key'], /^[\da-f-]{36}$/);
  data.diagnostico.conversas = [conversation('AGUARDANDO_ACEITE', { estado: 'ACEITO', entrega_confirmada: false })];
  gate.resolve({ solicitacao_id: 2, conversa_id: 5, tentativa_id: 3, estado: 'ACEITO', aceitacao_meta: true }); await flush();
  assert.match(text(), /aceito pela Meta; entrega ainda não confirmada/);
  assert.equal(requestButton().disabled, true); assert.equal(data.acompanhamento.proximo_envio_em, scheduled);
  assert.equal(requests.filter(c => c.method === 'GET').length, 8);
  data.diagnostico.conversas[0].estado_assistencial = 'CONCLUIDA'; await refresh();
  assert.equal(requestButton().disabled, false);
  const second = deferred(); postHandler = () => second.promise;
  await click('Solicitar check-in'); await click('Confirmar solicitação');
  const posts = requests.filter(c => c.method === 'POST');
  assert.notEqual(posts[0].config.headers['Idempotency-Key'], posts[1].config.headers['Idempotency-Key']);
  second.reject({ response: { status: 409 } }); await flush();
});
test('timeout stays blocked across refresh and remount, no automatic retry', async () => {
  reset(); postHandler = () => { throw new Error('timeout'); };
  await mount(); await click('Solicitar check-in'); await click('Confirmar solicitação');
  assert.match(text(), /Resultado não confirmado/); assert.equal(requestButton().disabled, true);
  await refresh(); await unmount(); await mount();
  assert.equal(requestButton().disabled, true); assert.equal(requests.filter(c => c.method === 'POST').length, 1);
});
test('pending POST results and invalid results remain uncertain', async () => {
  for (const estado of ['PREPARADO', 'EM_EXECUCAO', 'INCERTO', 'UNKNOWN']) {
    reset(); postHandler = () => ({ solicitacao_id: 2, conversa_id: 5, tentativa_id: null, estado, aceitacao_meta: false });
    await mount(); await click('Solicitar check-in'); await click('Confirmar solicitação');
    assert.equal(requestButton().disabled, true); assert.match(text(), /Resultado não confirmado/);
    await unmount(); sessionStorage.clear();
  }
});
test('delivery, rejection and contradictory evidence have distinct messages', async () => {
  for (const [attempt, expected] of [
    [{ estado: 'ACEITO', entrega_confirmada: true }, /Convite entregue/],
    [{ estado: 'REJEITADO' }, /Convite rejeitado/],
    [{ estado: 'ACEITO', falha_informada: true }, /Falha de entrega/],
    [{ estado: 'ACEITO', evidencia_contraditoria: true, entrega_confirmada: true }, /Evidências de entrega divergentes/],
  ]) {
    reset(); data.diagnostico.conversas = [conversation('CONCLUIDA', attempt)];
    await mount(); assert.match(text(), expected);
    if (attempt.evidencia_contraditoria) assert.equal(requestButton().disabled, true);
    await unmount();
  }
});
test('late old-scope responses cannot populate a new institution/person/context', async () => {
  reset(); const old = deferred(); getHandler = ({ url }) => url.includes('/pessoas/1/') ? old.promise : undefined;
  await mount();
  const next = { ...jornada, instituicao_id: 8, pessoa_id: 9, contexto_assistencial_id: 10, paciente_id: 11, nome_completo: 'Outra pessoa' };
  data.acompanhamento.contexto_assistencial_id = 10; data.acompanhamento.paciente_id = 11;
  await act(async () => root.render(h(Component, { jornada: next }))); await click('Check-in via WhatsApp');
  assert.equal(requestButton().disabled, false);
  old.resolve(); await flush();
  await click('Solicitar check-in'); assert.match(text(), /Outra pessoa/); assert.match(text(), /Contexto assistencial #10/);
  assert.ok(requests.filter(c => c.url.includes('/pessoas/9/')).every(c => c.config.params.instituicao_id === 8));
});
test('uncertainty does not leak to another scope, and is restored on returning', async () => {
  reset(); postHandler = () => { throw new Error('timeout'); };
  await mount(); await click('Solicitar check-in'); await click('Confirmar solicitação');
  const next = { ...jornada, instituicao_id: 8, pessoa_id: 9, contexto_assistencial_id: 10, paciente_id: 11 };
  data.acompanhamento.contexto_assistencial_id = 10; data.acompanhamento.paciente_id = 11;
  await act(async () => root.render(h(Component, { jornada: next }))); await click('Check-in via WhatsApp'); assert.equal(requestButton().disabled, false);
  data = fixture(); await act(async () => root.render(h(Component, { jornada }))); await click('Check-in via WhatsApp'); assert.equal(requestButton().disabled, true);
});
test('Prontuário keeps assisted action and places WhatsApp beside it without a permanent panel', async () => {
  reset(); root = createRoot(element());
  await act(async () => root.render(h(MemoryRouter, null, h(Prontuario, { jornada, onRefresh() {} }))));
  const html = element().innerHTML;
  assert.ok(html.indexOf('Check-in de Bem-Estar</button>') < html.indexOf('Check-in via WhatsApp'));
  assert.ok(html.indexOf('Check-in via WhatsApp') < html.indexOf('mental-record__summary'));
  assert.equal(document.querySelectorAll('dialog.mental-whatsapp-dialog').length, 0);
  assert.equal(requests.length, 0);
  assert.match(text(), /Timeline Clínica/);
});

test('backend refusals stay blocked even when read permission remains available', async () => {
  for (const status of [401, 403, 409, 422]) {
    reset(); postHandler = () => { throw { response: { status } }; };
    await mount(); await click('Solicitar check-in'); await click('Confirmar solicitação');
    assert.equal(requestButton().disabled, true);
    assert.match(text(), /Novas solicitações bloqueadas nesta consulta/);
    await refresh(); assert.equal(requestButton().disabled, true);
    assert.equal(requests.filter(c => c.method === 'POST').length, 1);
    await unmount();
  }
});
test('failed revalidation and uncorrelated diagnostics cannot unlock an accepted request', async () => {
  reset(); postHandler = () => {
    getHandler = () => { throw new Error('read unavailable'); };
    return { solicitacao_id: 2, conversa_id: 5, tentativa_id: 3, estado: 'ACEITO', aceitacao_meta: true };
  };
  await mount(); await click('Solicitar check-in'); await click('Confirmar solicitação');
  assert.equal(requestButton().disabled, true); assert.match(text(), /Não foi possível confirmar o estado/);
  getHandler = null; data.diagnostico.conversas = [{ ...conversation('CONCLUIDA', { estado: 'ACEITO' }), conversa_id: 999 }];
  await refresh(); assert.equal(requestButton().disabled, true);
  data.diagnostico.conversas = [conversation('CONCLUIDA', { estado: 'ACEITO' })];
  await refresh(); assert.equal(requestButton().disabled, false);
});
test('unavailable local repetition protection prevents any POST', async () => {
  reset(); await mount(); await click('Solicitar check-in');
  const original = dom.window.Storage.prototype.setItem;
  dom.window.Storage.prototype.setItem = () => { throw new Error('storage unavailable'); };
  try { await click('Confirmar solicitação'); } finally { dom.window.Storage.prototype.setItem = original; }
  assert.match(text(), /Nenhum envio foi solicitado/);
  assert.equal(requests.filter(c => c.method === 'POST').length, 0);
});

test('modal opens with named heading and focus, closes by button or Escape, reloads on opening', async () => {
  reset(); await mount();
  const main = document.querySelector('dialog[aria-labelledby]');
  assert.equal(main.open, true);
  assert.equal(document.activeElement.id, main.getAttribute('aria-labelledby'));
  assert.equal(document.body.style.overflow, 'hidden');
  assert.equal(button('Check-in via WhatsApp').getAttribute('aria-haspopup'), 'dialog');
  assert.match(text(), /Telefone•••• •••• 1234/);
  await click('Fechar');
  assert.equal(document.querySelector('dialog'), null);
  assert.equal(document.activeElement, button('Check-in via WhatsApp'));
  assert.equal(document.body.style.overflow, '');
  data.acompanhamento.status = 'PAUSADO';
  await click('Check-in via WhatsApp');
  assert.equal(requests.filter(c => c.method === 'GET').length, 8);
  assert.match(text(), /Pausado/); assert.equal(requestButton().disabled, true);
  await act(async () => document.querySelector('dialog[aria-labelledby]').dispatchEvent(new dom.window.Event('cancel', { bubbles: false, cancelable: true })));
  assert.equal(document.querySelector('dialog'), null);
  assert.equal(document.activeElement, button('Check-in via WhatsApp'));
});
test('Escape cancels confirmation without submitting or closing the consultation modal', async () => {
  reset(); await mount(); await click('Solicitar check-in');
  await act(async () => document.querySelector('dialog[aria-label]').dispatchEvent(new dom.window.Event('cancel', { bubbles: false, cancelable: true })));
  assert.equal(document.querySelector('dialog[aria-label]').open, false);
  assert.equal(document.querySelector('dialog[aria-labelledby]').open, true);
  assert.equal(requests.filter(c => c.method === 'POST').length, 0);
});
test('result stays visible in modal and closing during a POST cannot create a duplicate on reopening', async () => {
  reset(); const gate = deferred(); postHandler = () => gate.promise;
  await mount(); await click('Solicitar check-in'); await click('Confirmar solicitação');
  await click('Fechar'); await click('Check-in via WhatsApp');
  assert.equal(requestButton().disabled, true);
  data.diagnostico.conversas = [conversation('AGUARDANDO_ACEITE', { estado: 'ACEITO' })];
  gate.resolve({ solicitacao_id: 2, conversa_id: 5, tentativa_id: 3, estado: 'ACEITO', aceitacao_meta: true }); await flush();
  await refresh();
  assert.equal(document.querySelector('dialog[aria-labelledby]').open, true);
  assert.match(text(), /aceito pela Meta; entrega ainda não confirmada/);
  assert.equal(requests.filter(c => c.method === 'POST').length, 1);
});

test('loading and loaded states share the stable frame with actions outside the scroll body', async () => {
  reset(); const gate = deferred(); getHandler = () => gate.promise;
  await mount();
  const frame = document.querySelector('.mental-whatsapp-dialog--overview');
  const body = frame.querySelector('.mental-whatsapp-dialog__body');
  const footer = frame.querySelector('.mental-whatsapp-dialog__footer');
  assert.equal(body.getAttribute('aria-busy'), 'true');
  assert.equal(footer.contains(button('Fechar')), true);
  assert.equal(body.contains(footer), false);
  gate.resolve(); await flush();
  assert.equal(document.querySelector('.mental-whatsapp-dialog--overview'), frame);
  assert.equal(body.getAttribute('aria-busy'), 'false');
  assert.equal(footer.contains(button('Salvar programação')), true);
  assert.match(body.textContent, /Próximo envio previsto \(Cuiabá\)/);
  assert.equal(body.querySelectorAll('.mental-whatsapp-dialog__details > div').length, 7);
  await click('Solicitar check-in');
  assert.equal(document.querySelector('dialog[aria-label]').classList.contains('mental-whatsapp-dialog--overview'), false);
});

const scheduleButton = () => button('Salvar programação') || button('Salvando…');
const dayInput = () => element().querySelector('select');
const timeInput = () => element().querySelector('input[type="time"]');
const activeInput = () => element().querySelector('input[type="checkbox"]');
async function change(input, value) {
  await act(async () => {
    const prototype = input.tagName === 'SELECT' ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value);
    input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
}
async function preferences(day='4', time='19:00') { await change(dayInput(), day); await change(timeInput(), time); }

test('weekly persisted preference loads; civil time and next occurrence use Cuiaba', async () => {
  reset(); Object.assign(data.acompanhamento, { dia_semana: 4, horario_local: '19:00:00', programacao_ativa: true });
  await mount();
  assert.equal(dayInput().value, '4'); assert.equal(timeInput().value, '19:00'); assert.equal(activeInput().checked, true);
  assert.match(text(), /30\/10\/2026,? 19:49/);
  assert.match(text(), /Programação salva. Execução automática ainda não ativada/);
  assert.equal(requests.length, 4);
  for (const input of [dayInput(),timeInput()]) assert.ok(element().querySelector(`label[for="${input.id}"]`));
});
test('weekly initial save uses exact scope and PUT, updates without extra reads or dispatch', async () => {
  reset(); await mount(); await preferences(); await act(async () => activeInput().click());
  await click('Salvar programação');
  const calls=requests.filter(r => r.method==='PUT'); assert.equal(calls.length,1);
  assert.equal(calls[0].url,'/saude-mental/pessoas/1/contextos/1/whatsapp/programacao');
  assert.deepEqual(calls[0].config.params,{instituicao_id:2});
  assert.deepEqual(calls[0].body,{dia_semana:4,horario_local:'19:00',programacao_ativa:true});
  assert.equal(requests.length,5); assert.match(text(),/Preferência semanal atualizada/);
});
test('weekly pause and resume retain preference; changing day/time uses backend response', async () => {
  reset(); Object.assign(data.acompanhamento,{dia_semana:4,horario_local:'19:00:00',programacao_ativa:true});
  await mount(); await act(async () => activeInput().click()); await click('Salvar programação');
  assert.match(text(),/Programação semanal pausada/); assert.equal(dayInput().value,'4'); assert.equal(timeInput().value,'19:00');
  assert.match(text(),/Não definido/);
  await act(async () => activeInput().click()); await click('Salvar programação');
  await preferences('6','08:30'); await click('Salvar programação');
  assert.deepEqual(requests.filter(r=>r.method==='PUT').map(r=>r.body),[
    {dia_semana:4,horario_local:'19:00',programacao_ativa:false},
    {dia_semana:4,horario_local:'19:00',programacao_ativa:true},
    {dia_semana:6,horario_local:'08:30',programacao_ativa:true}]);
  assert.equal(requests.filter(r=>r.method==='POST').length,0);
});
test('weekly missing values are invalid; backend validation/auth errors never claim success', async () => {
  for (const status of [401,403,409,422]) {
    reset(); await mount(); await click('Salvar programação'); assert.equal(requests.filter(r=>r.method==='PUT').length,0);
    await preferences(); putHandler=()=>{throw {response:{status}};}; await click('Salvar programação');
    assert.ok(element().querySelector('[role="alert"]'));
    assert.doesNotMatch(text(),/Preferência semanal atualizada|Programação salva/); await unmount();
  }
});
test('weekly permissions and absent contract fail closed without blocking extraordinary compatibility', async () => {
  reset(); await mount({...jornada,bem_estar:{pode_registrar:false}}); assert.equal(scheduleButton().disabled,true); await unmount();
  for (const change of [a=>{delete a.programacao_ativa;},a=>{a.status='ENCERRADO';},a=>{a.consentimento_status='REVOGADO';}]) {
    reset(); change(data.acompanhamento); await mount(); assert.equal(scheduleButton().disabled,true); await unmount();
  }
  reset(); delete data.acompanhamento.programacao_ativa; await mount(); assert.equal(requestButton().disabled,false);
});
test('weekly concurrent clicks issue one request; uncertain outcome requires refresh', async () => {
  reset(); const gate=deferred(); putHandler=()=>gate.promise;
  await mount(); await preferences(); const save=scheduleButton();
  await act(async()=>{save.click();save.click();}); assert.equal(requests.filter(r=>r.method==='PUT').length,1);
  assert.equal(requestButton().disabled,true); assert.equal(button('Atualizar WhatsApp').disabled,true);
  gate.reject(new Error('timeout')); await flush(); assert.match(text(),/Não foi possível confirmar o salvamento/);
  assert.equal(scheduleButton().disabled,true); await refresh(); assert.equal(scheduleButton().disabled,false);
  assert.equal(requests.filter(r=>r.method==='PUT').length,1);
});
test('weekly late response cannot leak to a different institution/person/context', async () => {
  reset(); const gate=deferred(); putHandler=()=>gate.promise; await mount(); await preferences(); await click('Salvar programação');
  const saved={...data.acompanhamento,dia_semana:4,horario_local:'19:00:00',programacao_ativa:false};
  const other={...jornada,instituicao_id:8,pessoa_id:9,contexto_assistencial_id:10,paciente_id:11};
  data.acompanhamento={...data.acompanhamento,contexto_assistencial_id:10,paciente_id:11};
  await act(async()=>root.render(h(Component,{jornada:other}))); await click('Check-in via WhatsApp');
  gate.resolve(saved); await flush(); assert.equal(dayInput().value,''); assert.doesNotMatch(text(),/Preferência semanal atualizada|Programação salva/);
  assert.ok(requests.filter(r=>r.method==='GET').slice(-4).every(r=>r.config.params.instituicao_id===8 && r.url.includes('/pessoas/9/contextos/10/')));
});
test('weekly mismatched response is unconfirmed and cannot update current scope', async () => {
  reset(); await mount(); await preferences(); putHandler=({body})=>({...data.acompanhamento,...body,contexto_assistencial_id:999});
  await click('Salvar programação'); assert.match(text(),/Não foi possível confirmar o salvamento/); assert.equal(scheduleButton().disabled,true);
});
