import { api } from "../lib/api";

export async function listarTimelinePorPaciente(pacienteId) {
  const res = await api.get(`/pacientes/${pacienteId}/timeline`);
  return res.data;
}
