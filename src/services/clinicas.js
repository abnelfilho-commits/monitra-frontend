import { api } from "../lib/api";

export async function listarClinicas() {
  const res = await api.get("/clinicas/");
  return res.data;
}

export async function obterClinica(id) {
  const res = await api.get(`/clinicas/${id}`);
  return res.data;
}

export async function criarClinica(payload) {
  const res = await api.post("/clinicas/", payload);
  return res.data;
}

export async function atualizarClinica(id, payload) {
  const res = await api.put(`/clinicas/${id}`, payload);
  return res.data;
}

export async function inativarClinica(id) {
  const res = await api.delete(`/clinicas/${id}`);
  return res.data;
}
