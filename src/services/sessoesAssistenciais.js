import axios from "axios";

const API = `${import.meta.env.VITE_API_URL}/sessoes-assistenciais`;

export async function listarSessoesPorPaciente(pacienteId) {
  const { data } = await axios.get(
    `${API}/paciente/${pacienteId}`
  );

  return data;
}

export async function obterSessaoAssistencial(sessaoId) {
  const { data } = await axios.get(`${API}/${sessaoId}`);
  return data;
}

export async function confirmarSessaoAssistencial(sessaoId) {
  const { data } = await axios.post(`${API}/${sessaoId}/confirmar`);
  return data;
}

export async function iniciarSessaoAssistencial(sessaoId) {
  const { data } = await axios.post(`${API}/${sessaoId}/iniciar`);
  return data;
}

export async function registrarAtendimento(sessaoId, payload) {
  const { data } = await axios.post(
    `${API}/${sessaoId}/registrar-atendimento`,
    payload
  );

  return data;
}

export async function finalizarSessaoAssistencial(sessaoId) {
  const { data } = await axios.post(`${API}/${sessaoId}/finalizar`);
  return data;
}