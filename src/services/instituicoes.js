import { api } from "../lib/api";

const base = "/admin/instituicoes";

export async function listarInstituicoes(filtros = {}) {
  const response = await api.get(`${base}/`, { params: filtros });
  return response.data;
}

export async function obterInstituicao(id) {
  const response = await api.get(`${base}/${id}`);
  return response.data;
}

export async function criarInstituicao(payload) {
  const response = await api.post(`${base}/`, payload);
  return response.data;
}

export async function atualizarInstituicao(id, payload) {
  const response = await api.patch(`${base}/${id}`, payload);
  return response.data;
}

export async function ativarInstituicao(id) {
  const response = await api.post(`${base}/${id}/ativar`);
  return response.data;
}

export async function inativarInstituicao(id) {
  const response = await api.post(`${base}/${id}/inativar`);
  return response.data;
}
