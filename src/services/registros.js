import { api } from "../lib/api";

export async function criarRegistroDiario(payload) {
  const res = await api.post("/registros/", payload);
  return res.data;
}

export async function excluirRegistroDiario(id) {
  const res = await api.delete(`/registros/${id}`);
  return res.data;
}

export async function obterRegistroDiario(id) {
  const res = await api.get(`/registros/${id}`);
  return res.data;
}

export async function atualizarRegistroDiario(id, payload) {
  const res = await api.put(`/registros/${id}`, payload);
  return res.data;
}
