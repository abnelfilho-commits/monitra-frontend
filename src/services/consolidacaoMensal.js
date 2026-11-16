import { api } from "../lib/api";

export function parametrosConsolidacao({ instituicao_id, mes_referencia, ocupacao_id }) {
  const inteiroPositivo = (valor) => /^\d+$/.test(String(valor)) && Number.isSafeInteger(Number(valor)) && Number(valor) > 0;
  if (!inteiroPositivo(instituicao_id)) throw new Error("Selecione uma instituição válida.");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes_referencia ?? "") || Number(mes_referencia.slice(0, 4)) === 0) {
    throw new Error("Informe uma competência válida no formato AAAA-MM.");
  }
  const params = { instituicao_id: Number(instituicao_id), mes_referencia };
  if (ocupacao_id != null && ocupacao_id !== "") {
    if (!inteiroPositivo(ocupacao_id)) throw new Error("Selecione uma ocupação válida.");
    params.ocupacao_id = Number(ocupacao_id);
  }
  return params;
}

export async function consultarConsolidacaoMensal(filtros, { signal } = {}) {
  const { data } = await api.get("/admin/consolidacao-gerencial/mensal", {
    params: parametrosConsolidacao(filtros), signal,
  });
  return data;
}
