import api from "./api";

export async function listarPTS(pacienteId) {
  const res = await api.get(`/pts/paciente/${pacienteId}`);
  return res.data;
}

export async function criarPTS(payload) {
  const res = await api.post("/pts", payload);
  return res.data;
}

export async function listarObjetivosPTS(ptsId) {
  const res = await api.get(`/pts/${ptsId}/objetivos`);
  return res.data;
}

export async function criarObjetivoPTS(ptsId, payload) {
  const res = await api.post(
    `/pts/${ptsId}/objetivos`,
    payload
  );
  return res.data;
}

export async function atualizarObjetivoPTS(
  objetivoId,
  payload
) {
  const res = await api.put(
    `/pts/objetivos/${objetivoId}`,
    payload
  );

  return res.data;
}

export async function encerrarPTS(ptsId) {
  const res = await api.put(`/pts/${ptsId}/encerrar`);
  return res.data;
}

export async function reabrirPTS(ptsId) {
  const res = await api.put(`/pts/${ptsId}/reabrir`);
  return res.data;
}