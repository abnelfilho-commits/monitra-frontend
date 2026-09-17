import { api } from "../lib/api";

export async function criarIntervencao(payload) {
  const res = await api.post("/intervencoes/", { ...payload, requested_care_line: "NEURO" });
  return res.data;
}

export async function excluirIntervencao(id) {
  const res = await api.delete(`/intervencoes/${id}?care_line=NEURO`);
  return res.data;
}

export async function obterIntervencao(id) {
  const res = await api.get(`/intervencoes/${id}?care_line=NEURO`);
  return res.data;
}

export async function atualizarIntervencao(id, payload) {
  const res = await api.put(`/intervencoes/${id}?care_line=NEURO`, payload);
  return res.data;
}
