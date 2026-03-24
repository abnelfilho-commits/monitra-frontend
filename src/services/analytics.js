import { api } from "../lib/api";

export async function obterMapaRiscoClinica(clinicaId) {
  const res = await api.get(`/analytics/clinicas/${clinicaId}/mapa-risco`);
  return res.data;
}

export async function obterRiscoPaciente(pacienteId) {
  const res = await api.get(`/analytics/pacientes/${pacienteId}/risco`);
  return res.data;
}

export async function obterEvolucaoPaciente(pacienteId) {
  const res = await api.get(`/analytics/pacientes/${pacienteId}/evolucao`);
  return res.data;
}
