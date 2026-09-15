import api from "./api";

const API = "/sessoes-assistenciais";

export async function listarMinhasSessoesAssistenciais() {
  const { data } = await api.get(
    "/sessoes-assistenciais/minhas"
  );

  return data;
}

export async function listarSessoesPorPaciente(pacienteId) {
  const { data } = await api.get(
    `${API}/paciente/${pacienteId}`
  );

  return data;
}

export async function obterSessaoAssistencial(sessaoId) {
  const { data } = await api.get(`${API}/${sessaoId}`);
  return data;
}

export async function confirmarSessaoAssistencial(sessaoId) {
  const { data } = await api.post(`${API}/${sessaoId}/confirmar`);
  return data;
}

export async function iniciarSessaoAssistencial(sessaoId) {
  const { data } = await api.post(`${API}/${sessaoId}/iniciar`);
  return data;
}

export async function registrarAtendimento(sessaoId, payload) {
  const { data } = await api.post(
    `${API}/${sessaoId}/registrar-atendimento`,
    payload
  );

  return data;
}

export async function finalizarSessaoAssistencial(sessaoId) {
  const { data } = await api.post(`${API}/${sessaoId}/finalizar`);
  return data;
}