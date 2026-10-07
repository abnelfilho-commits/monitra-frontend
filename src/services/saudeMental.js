import api from "./api";

export const instituicoesMentais = async () => (await api.get("/saude-mental/instituicoes")).data;
export const pessoasMentais = async (instituicao, offset = 0) => (await api.get("/saude-mental/pessoas", { params: { instituicao_id: instituicao, offset } })).data;
export const jornadaMental = async (instituicao, pessoa, contexto) => (await api.get(`/saude-mental/pessoas/${pessoa}/contextos/${contexto}`, { params: { instituicao_id: instituicao } })).data;

export function erroMental(error) {
  return ({401: "Sua sessão expirou. Entre novamente.", 403: "Você não possui autorização para esta jornada.", 404: "Jornada indisponível ou sem autorização contextual.", 422: "Selecione uma instituição e um contexto válidos.", 503: "A linha Saúde Mental está indisponível neste ambiente."})[error?.response?.status] || "Não foi possível carregar Saúde Mental. Tente novamente.";
}

export const registrarCheckin = async (instituicao, pessoa, contexto, payload) => (await api.post(`/saude-mental/pessoas/${pessoa}/contextos/${contexto}/check-ins`, payload, { params: { instituicao_id: instituicao } })).data;

export function erroCheckin(error) {
  return ({401: "Sua sessão expirou. Entre novamente.", 403: "O registro não está autorizado neste contexto. Atualize a jornada.", 409: "Não foi possível confirmar o registro. Atualize a jornada antes de tentar novamente.", 422: "Revise as respostas e o contexto do formulário.", 503: "O formulário está indisponível neste ambiente."})[error?.response?.status] || "Não foi possível confirmar o registro. Atualize a jornada antes de tentar novamente.";
}

export const registrarDiagnosticoMental = async (instituicao, pessoa, contexto, payload) => (await api.post(`/saude-mental/pessoas/${pessoa}/contextos/${contexto}/diagnosticos`, payload, { params: { instituicao_id: instituicao } })).data;

export const registrarIntervencaoMental = async (instituicao, pessoa, contexto, payload) => (await api.post(`/saude-mental/pessoas/${pessoa}/contextos/${contexto}/intervencoes`, payload, { params: { instituicao_id: instituicao } })).data;

export const registrarPHQ9Mental = async (instituicao, pessoa, contexto, payload) => (await api.post(`/saude-mental/pessoas/${pessoa}/contextos/${contexto}/phq9`, payload, { params: { instituicao_id: instituicao } })).data;
