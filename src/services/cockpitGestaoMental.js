import api from "./api";
export const MANAGEMENT_AVAILABLE = "mental-management-available";
export const MANAGEMENT_DENIED = "mental-management-denied";
const count = n => Number.isSafeInteger(n) && n >= 0;
const day = x => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(`${x}T00:00:00Z`));
export function validarGestao(data, semanas) {
  const m = data?.metadados;
  const keys = ["instituicoes_ativas", "profissionais_vinculados", "atendimentos_programados", "atendimentos_realizados"];
  if (!keys.every(k => count(data?.indicadores?.[k])) || !m || m.semanas !== semanas ||
      !Array.isArray(m.instituicao_ids) || !m.instituicao_ids.every(id => count(id) && id > 0) ||
      !["GLOBAL", "INSTITUICOES_AUTORIZADAS"].includes(m.escopo) || m.fuso !== "America/Cuiaba" ||
      ![m.data_inicio, m.data_fim, m.data_consulta].every(day) ||
      !Array.isArray(m.limitacoes) || !m.limitacoes.every(x => typeof x === "string")) throw new Error("INVALID_MANAGEMENT_RESPONSE");
  const a = data.atendimentos_programados_realizados, b = data.evolucao_atendimentos;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== semanas || b.length !== semanas ||
      !a.every((row, i) => day(row.semana) && count(row.programados) && count(row.realizados) &&
        b[i]?.semana === row.semana && b[i]?.realizados === row.realizados &&
        Date.parse(`${row.semana}T00:00:00Z`) === Date.parse(`${m.data_inicio}T00:00:00Z`) + i * 604800000)) throw new Error("INVALID_MANAGEMENT_RESPONSE");
  return data;
}
export async function cockpitGestaoMental(semanas = 4, instituicao, signal) {
  try {
    const r = await api.get("/saude-mental/cockpit/gestao", { params: { semanas, ...(instituicao ? { instituicao_id: instituicao } : {}) }, signal });
    const data = validarGestao(r.data, semanas);
    if (!signal?.aborted && !instituicao) window.dispatchEvent(new Event(MANAGEMENT_AVAILABLE));
    return data;
  } catch (error) {
    if (!signal?.aborted && error?.response?.status === 403) window.dispatchEvent(new Event(MANAGEMENT_DENIED));
    throw error;
  }
}
export function erroGestao(error) {
  if (error?.message === "INVALID_MANAGEMENT_RESPONSE") return "Resposta gerencial incompleta ou inválida. Tente novamente.";
  return ({401: "Sua sessão expirou. Entre novamente.", 403: "Acesso gerencial indisponível para esta conta ou instituição.",
    422: "Filtro inválido. Utilize 4, 8 ou 12 semanas e uma instituição autorizada.", 503: "A linha Saúde Mental está indisponível neste ambiente."})[error?.response?.status] ||
    "Não foi possível consultar a gestão. Falha técnica não confirma ausência de autorização. Tente novamente.";
}
