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

// The operational list deliberately has no person identity. Verify each structural
// detail through the existing ADMIN endpoint before associating it with a person.
export async function contextosDaPessoa(instituicao, vinculos) {
  const candidates = await contextosOperacionais(instituicao);
  if (!Array.isArray(candidates)) throw Error("Invalid context list");
  const result = [];
  for (const candidate of candidates) {
    const { data } = await api.get(`/admin/contextos-assistenciais/${candidate.id}`, { params: { instituicao_id: instituicao } });
    if (data.id !== candidate.id || data.instituicao_id !== instituicao || !Number.isInteger(data.paciente_id) || !Number.isInteger(data.paciente_instituicao_id)) throw Error("Invalid context identity");
    if (data.ativo && vinculos.some(v => v.id === data.paciente_instituicao_id && v.paciente_id === data.paciente_id && v.instituicao_id === instituicao)) result.push(data);
  }
  return result;
}

// Match persisted operational identities; UTC civil dates mirror the backend gate.
export function participacaoVigente(state, institution, context, participationId) {
  const today = new Date().toISOString().slice(0, 10);
  const current = p => typeof p.data_inicio === "string" && p.data_inicio <= today && (!p.data_fim || p.data_fim >= today);
  if (state?.instituicao_id !== institution || state?.contexto_id !== context) return null;
  const parts = (state.participacoes || []).filter(p => p.id === participationId);
  if (parts.length !== 1) return null;
  const p = parts[0];
  if (p.instituicao_id !== institution || p.contexto_assistencial_id !== context || p.invalidado_em || p.encerrado_em || p.revogado_em || !current(p)) return null;
  const links = (state.profissionais || []).filter(l => l.id === p.profissional_instituicao_id);
  if (links.length !== 1 || !current(links[0]) || !Number.isSafeInteger(links[0].usuario_instituicao_acesso_id)) return null;
  const same = state.participacoes.filter(other => other.profissional_instituicao_id === p.profissional_instituicao_id && !other.invalidado_em && !other.encerrado_em && current(other));
  return same.length === 1 ? links[0] : null;
}
