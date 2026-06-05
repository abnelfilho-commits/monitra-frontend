import api from "./api";

export async function buscarPacienteCardiometabolico(
  pacienteId
) {
  const response = await api.get(
    `/cardiometabolico/pacientes/${pacienteId}`
  );

  return response.data;
}

export async function listarTimelineCardiometabolico(
  pacienteId
) {
  const response = await api.get(
    `/cardiometabolico/pacientes/${pacienteId}/timeline`
  );

  return response.data;
}

export async function obterTimelineCardiometabolico(id) {
  const response = await api.get(
    `/cardiometabolico/pacientes/${id}/timeline`
  );

  return response.data;
}

export async function obterEvolucaoCardiometabolico(id) {
  const response = await api.get(
    `/cardiometabolico/pacientes/${id}/evolucao`
  );

  return response.data;
}

export async function obterDashboardCardiometabolico() {
  const response = await api.get(
    "/cardiometabolico/dashboard"
  );

  return response.data;
}

export async function obterDashboardAnalytics() {
  const response = await api.get(
    "/cardiometabolico/dashboard-analytics"
  );

  return response.data;
}

export async function salvarRegistroDiarioCardiometabolico(
  payload
) {
  const response = await api.post(
    "/cardiometabolico/registro-diario",
    payload
  );

  return response.data;
}

export async function salvarRegistroCardiometabolico(payload) {
  const response = await api.post(
    "/cardiometabolico/registro-diario",
    payload
  );

  return response.data;
}
