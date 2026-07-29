import api from "./api";

export async function listarAgendaPorObjetivo(
  objetivoId
) {
  const response = await api.get(
    `/agenda-cuidados/objetivo/${objetivoId}`
  );

  return response.data;
}

export async function criarAgendaCuidado(
  payload
) {
  const response = await api.post(
    "/agenda-cuidados/",
    payload
  );

  return response.data;
}

export async function atualizarAgendaCuidado(
  agendaId,
  payload
) {
  const response = await api.put(
    `/agenda-cuidados/${agendaId}`,
    payload
  );

  return response.data;
}

export async function excluirAgendaCuidado(
  agendaId
) {
  const response = await api.delete(
    `/agenda-cuidados/${agendaId}`
  );

  return response.data;
}

export async function registrarFrequenciaAgenda(agendaId, payload) {
  const response = await api.patch(
    `/agenda-cuidados/${agendaId}/frequencia`,
    payload
  );

  return response.data;
}

export async function sugerirCronograma(agendaId) {
  const response = await api.post(
    `/scheduling/agenda/${agendaId}/sugerir`
  );

  return response.data;
}

export async function confirmarCronograma(
  agendaId,
  payload
) {
  const response = await api.post(
    `/scheduling/agenda/${agendaId}/confirmar`,
    payload
  );

  return response.data;
}