import { api } from "../lib/api";
const base = "/operacao-assistencial";
export const instituicoesOperacionais = () => api.get(`${base}/instituicoes`).then(r => r.data);
export const contextosOperacionais = instituicao_id => api.get(`${base}/contextos`, { params: { instituicao_id } }).then(r => r.data);
export const estadoOperacional = (instituicao_id, contexto) => api.get(`${base}/contextos/${contexto}`, { params: { instituicao_id } }).then(r => r.data);
export const executarOperacao = (instituicao_id, contexto, comando, payload) => api.post(`${base}/contextos/${contexto}/${comando}`, payload, { params: { instituicao_id } }).then(r => r.data);
export function erroOperacional(error) {
  const messages = {
    AUTHORITY_DENIED: "A conta não possui autoridade para delegar esta capacidade.",
    CONTEXT_ADMINISTRATION_DENIED: "É necessária concessão explícita de CONTEXTO_ADMINISTRAR.",
    SELF_GRANT_DENIED: "Autoconcessão não é permitida.",
    SELF_DELEGATION_DENIED: "Não é permitido nomear a própria conta.",
    BOOTSTRAP_ALREADY_PERFORMED: "O bootstrap desta instituição já foi realizado.",
    INITIAL_BOOTSTRAP_REQUIRED: "Ainda é necessário o bootstrap inicial.",
    ELIGIBLE_AUTHORITY_EXISTS: "Já existe autoridade elegível para este escopo. Recovery não permitido.",
    PARTICIPATION_PERIOD_CONFLICT: "Já existe participação com período sobreposto.",
    PROFESSIONAL_LINK_INELIGIBLE: "O vínculo profissional não está vigente ou não contém o período informado.",
    CONTEXT_NOT_OPEN: "A ativação exige contexto aberto e válido.",
    ROOT_INACTIVE: "O acesso institucional está inativo.",
  };
  return messages[error?.response?.data?.detail?.code] || ({401: "Sessão expirada.",403: "Operação não autorizada para esta conta e contexto.",404: "Recurso operacional não encontrado.",409: "O estado mudou ou há conflito. Atualize a consulta.",422: "Confira os campos obrigatórios e o período."}[error?.response?.status]) || "Resultado não confirmado. Não repita a escrita sem conferência administrativa.";
}
