import { api } from "../lib/api";

export const listarPessoas = (offset, limit) => api.get("/admin/pessoas/", { params: { offset, limit } }).then(r => r.data);
export const obterPessoa = id => api.get(`/admin/pessoas/${id}`).then(r => r.data);
export const atualizarPessoa = (id, dados) => api.patch(`/admin/pessoas/${id}`, dados).then(r => r.data);
export const localizarPessoa = cpf => api.post("/admin/identidades/localizar", { cpf }).then(r => r.data);
export const comandoIdentidade = (papel, dados) => api.post(`/admin/identidades/${papel ? "papeis" : "pessoas"}`, dados).then(r => r.data);
export const listarVinculosPessoa = instituicao_id => api.get("/admin/vinculos-institucionais/pacientes", { params: { instituicao_id } }).then(r => r.data);
export const criarVinculoPessoa = dados => api.post("/admin/vinculos-institucionais/pacientes", dados).then(r => r.data);
export const criarContextoPessoa = dados => api.post("/admin/contextos-assistenciais/", dados).then(r => r.data);
export const adicionarSaudeMental = (id, instituicao_id) => api.post(`/admin/contextos-assistenciais/${id}/linhas`, { modulo_id: 3 }, { params: { instituicao_id } }).then(r => r.data);
export const obterContextoPessoa = (id, instituicao_id) => api.get(`/admin/contextos-assistenciais/${id}`, { params: { instituicao_id } }).then(r => r.data);

export const habilitarAcesso = (id, dados) => api.post(`/admin/pessoas/${id}/acesso`, dados).then(r => r.data);
