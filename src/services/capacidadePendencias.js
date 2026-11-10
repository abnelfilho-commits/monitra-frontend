// Session-only intent journal. Never stores reason, names, credentials or clinical data.
const prefix = 'integra:capacity:v1:';
const id = n => Number.isSafeInteger(n) && n > 0;
const civil = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const period = p => p && civil(p.data_inicio) && (p.data_fim === null || civil(p.data_fim)) && id(p.minutos_semanais);
export function pendingKey(user, institution, link) {
  if (![user, institution, link].every(id)) throw Error('Identidade indisponível');
  return `${prefix}${user}:${institution}:${link}`;
}
export function readPending(key) {
  const raw = sessionStorage.getItem(key);
  if (raw === null) return null;
  const op = JSON.parse(raw);
  if (op?.scope !== key || op.version !== 1 || !['create','close','invalidate'].includes(op.action) ||
      !period(op.expected) || (op.action !== 'create' && !id(op.id)) || (op.id != null && !id(op.id))) throw Error('Pendência inválida');
  return op;
}
export function savePending(key, op) {
  if (readPending(key)) throw Error('Operação pendente');
  const value = { ...op, version: 1, scope: key };
  sessionStorage.setItem(key, JSON.stringify(value));
  if (JSON.stringify(readPending(key)) !== JSON.stringify(value)) throw Error('Armazenamento indisponível');
  return value;
}
export function clearPending(key, op) {
  if (JSON.stringify(readPending(key)) !== JSON.stringify(op)) throw Error('Pendência divergente');
  sessionStorage.removeItem(key);
  if (sessionStorage.getItem(key) !== null) throw Error('Pendência não removida');
}
export function matchesPending(row, op) {
  return (!op.id || row.id === op.id) && row.minutos_semanais === op.expected.minutos_semanais &&
    row.data_inicio === op.expected.data_inicio && row.data_fim === op.expected.data_fim &&
    row.ativo === (op.action !== 'invalidate');
}
