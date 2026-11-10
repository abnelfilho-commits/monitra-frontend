import { api } from "../lib/api";

export async function consultarCapacidade({ instituicao_id, data_referencia, ocupacao_id }, signal) {
  const params = { instituicao_id, data_referencia };
  if (ocupacao_id) params.ocupacao_id = ocupacao_id;
  return (await api.get("/admin/vinculos-institucionais/capacidades/consolidacao", { params, signal })).data;
}

const base = '/admin/vinculos-institucionais/profissionais';
export async function consultarVinculos(instituicao_id, signal) {
  return (await api.get(base, { params: { instituicao_id }, signal })).data;
}
export async function consultarHistorico(vinculo, params, signal) {
  return (await api.get(`${base}/${vinculo}/capacidades`, { params, signal })).data;
}
export async function operarCapacidade(vinculo, params, operation, identity, payload) {
  const suffix = operation === 'create' ? '' : `/${identity}/${operation}`;
  return (await api.post(`${base}/${vinculo}/capacidades${suffix}`, payload, { params })).data;
}
