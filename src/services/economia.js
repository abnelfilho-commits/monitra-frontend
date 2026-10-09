import { api } from "../lib/api";
const base = "/admin/economia/servicos";
export const listarServicos = async () => (await api.get(`${base}/`)).data;
export const obterServico = async id => (await api.get(`${base}/${id}`)).data;
export const criarServico = async payload => (await api.post(`${base}/`, payload)).data;
export const atualizarServico = async (id, payload) => (await api.put(`${base}/${id}`, payload)).data;
export const alterarEstadoServico = async (id, ativo) => (await api.patch(`${base}/${id}/estado`, { ativo })).data;
