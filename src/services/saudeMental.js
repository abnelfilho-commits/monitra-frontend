import api from "./api";

export const instituicoesMentais = async () => (await api.get("/saude-mental/instituicoes")).data;
export const pessoasMentais = async (instituicao, offset = 0) => (await api.get("/saude-mental/pessoas", { params: { instituicao_id: instituicao, offset } })).data;
export const jornadaMental = async (instituicao, pessoa, contexto) => (await api.get(`/saude-mental/pessoas/${pessoa}/contextos/${contexto}`, { params: { instituicao_id: instituicao } })).data;

export function erroMental(error) {
  return ({401: "Sua sessão expirou. Entre novamente.", 403: "Você não possui autorização para esta jornada.", 404: "Jornada indisponível ou sem autorização contextual.", 422: "Selecione uma instituição e um contexto válidos.", 503: "A linha Saúde Mental está indisponível neste ambiente."})[error?.response?.status] || "Não foi possível carregar Saúde Mental. Tente novamente.";
}
