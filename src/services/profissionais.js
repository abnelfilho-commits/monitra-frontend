import { api } from "../lib/api";

export async function listarProfissionais() {
  const res = await api.get("/profissionais/");
  return res.data;
}

export async function listarProfissionaisPorClinica(clinicaId) {
  const res = await api.get(`/profissionais/clinica/${clinicaId}`);
  return res.data;
}

export async function obterProfissional(id) {
  const res = await api.get(`/profissionais/${id}`);
  return res.data;
}

export async function criarProfissional(payload) {
  const res = await api.post("/profissionais/", payload);
  return res.data;
}

export async function atualizarProfissional(id, payload) {
  const res = await api.put(`/profissionais/${id}`, payload);
  return res.data;
}

export async function inativarProfissional(id) {
  const res = await api.delete(`/profissionais/${id}`);
  return res.data;
}
