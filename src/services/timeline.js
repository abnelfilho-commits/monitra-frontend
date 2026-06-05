import { api } from "../lib/api";

export async function listarTimelinePorPaciente(pacienteId) {
  const res = await api.get(`/timeline/pacientes/${pacienteId}`);
  return res.data;
}
