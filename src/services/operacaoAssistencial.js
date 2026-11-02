import { api } from "../lib/api";
const base = "/operacao-assistencial";
export const instituicoesOperacionais = () => api.get(`${base}/instituicoes`).then(r => r.data);
export const contextosOperacionais = instituicao_id => api.get(`${base}/contextos`, { params: { instituicao_id } }).then(r => r.data);
export const estadoOperacional = (instituicao_id, contexto) => api.get(`${base}/contextos/${contexto}`, { params: { instituicao_id } }).then(r => r.data);
export const executarOperacao = (instituicao_id, contexto, comando, payload) => api.post(`${base}/contextos/${contexto}/${comando}`, payload, { params: { instituicao_id } }).then(r => r.data);
export function erroOperacional(error) {
  const messages = {
    AUTHORITY_DENIED: "A conta não possui autoridade para delegar esta capacidade.",
    CONTEXT_ADMINISTRATION_DENIED: "Sua conta precisa de permissão para administrar participações neste contexto. Solicite a concessão ao responsável por delegar permissões.",
    SELF_GRANT_DENIED: "Autoconcessão não é permitida.",
    SELF_DELEGATION_DENIED: "Não é permitido nomear a própria conta.",
    BOOTSTRAP_ALREADY_PERFORMED: "A nomeação inicial desta instituição já foi realizada. Atualize o estado para consultar os responsáveis existentes.",
    INITIAL_BOOTSTRAP_REQUIRED: "Um administrador da plataforma precisa realizar a primeira nomeação de responsável.",
    ELIGIBLE_AUTHORITY_EXISTS: "Já existe responsável habilitado para delegar esta permissão neste escopo. A recuperação não está disponível.",
    PARTICIPATION_PERIOD_CONFLICT: "Já existe participação com período sobreposto.",
    PROFESSIONAL_LINK_INELIGIBLE: "O vínculo profissional não está vigente ou não contém o período informado.",
    CONTEXT_NOT_OPEN: "A ativação exige contexto aberto e válido.",
    VALID_PERSON_REQUIRED: "A conta deve estar associada a uma Pessoa ativa. Solicite a regularização ao administrador.",
    USER_INACTIVE: "A conta selecionada está inativa. Atualize os candidatos.",
    INSTITUTION_INACTIVE: "A instituição está inativa. Nenhuma operação pode ser concluída.",
    CONTEXT_INVALIDATED: "Este contexto foi invalidado. Selecione outro contexto válido.",
    ROOT_INACTIVE: "O acesso institucional está inativo.",
  };
  return messages[error?.response?.data?.detail?.code] || ({401: "Sessão expirada.",403: "Operação não autorizada para esta conta e contexto.",404: "Recurso operacional não encontrado.",409: "O estado mudou ou há conflito. Atualize a consulta.",422: "Confira os campos obrigatórios e o período."}[error?.response?.status]) || "Resultado não confirmado. Não repita a escrita sem conferência administrativa.";
}
