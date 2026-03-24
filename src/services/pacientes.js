import { api } from "../lib/api";

export async function listarPacientes() {
  const res = await api.get("/pacientes/");
  return res.data;
}

export async function obterPaciente(id) {
  const res = await api.get(`/pacientes/${id}`);
  return res.data;
}

export async function criarPaciente(payload) {
  const res = await api.post("/pacientes/", payload);
  return res.data;
}

export async function atualizarPaciente(id, payload) {
  const res = await api.put(`/pacientes/${id}`, payload);
  return res.data;
}

export async function inativarPaciente(id) {
  const res = await api.delete(`/pacientes/${id}`);
  return res.data;
}

export async function baixarRelatorioPacientePdf(id) {
  const res = await api.get(`/pacientes/${id}/relatorio-pdf`, {
    responseType: "blob",
  });
  return res.data;
}
