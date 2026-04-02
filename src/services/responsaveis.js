import { api } from "../lib/api";

export async function listarResponsaveis() {
  const res = await api.get("/responsaveis/");
  return res.data;
}

export async function criarResponsavel(payload) {
  const res = await api.post("/responsaveis/", payload);
  return res.data;
}

export async function vincularResponsavelPaciente(payload) {
  const res = await api.post("/responsaveis/vinculos", payload);
  return res.data;
}

export async function listarPacientes() {
  const res = await api.get("/pacientes/");
  return res.data;
}
