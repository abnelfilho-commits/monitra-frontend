import { api } from "../lib/api";

export async function listarUsuarios() {
  const res = await api.get("/usuarios/");
  return res.data;
}

export async function obterUsuario(id) {
  const res = await api.get(`/usuarios/${id}`);
  return res.data;
}

export async function criarUsuario(payload) {
  const res = await api.post("/usuarios/", payload);
  return res.data;
}

export async function atualizarUsuario(id, payload) {
  const res = await api.put(`/usuarios/${id}`, payload);
  return res.data;
}