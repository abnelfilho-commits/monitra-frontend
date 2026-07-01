import api from "./api";

export async function listarAtividadesTerapeuticas(moduloId = null) {
  const params = moduloId ? { modulo_id: moduloId } : {};

  const response = await api.get("/atividades-terapeuticas/", {
    params,
  });

  return response.data;
}

export async function criarAtividadeTerapeutica(payload) {
  const response = await api.post("/atividades-terapeuticas/", payload);
  return response.data;
}

export async function listarOcupacoesProfissionais() {
  const response = await api.get("/atividades-terapeuticas/ocupacoes-profissionais");
  return response.data;
}

export async function criarOcupacaoProfissional(payload) {
  const response = await api.post(
    "/atividades-terapeuticas/ocupacoes-profissionais",
    payload
  );
  return response.data;
}

export async function listarOcupacoesDaAtividade(atividadeId) {
  const response = await api.get(
    `/atividades-terapeuticas/${atividadeId}/ocupacoes`
  );
  return response.data;
}

export async function vincularOcupacaoAtividade(atividadeId, ocupacaoId) {
  const response = await api.post(
    `/atividades-terapeuticas/${atividadeId}/ocupacoes`,
    {
      ocupacao_id: ocupacaoId,
    }
  );
  return response.data;
}

export async function removerOcupacaoAtividade(atividadeId, ocupacaoId) {
  const response = await api.delete(
    `/atividades-terapeuticas/${atividadeId}/ocupacoes/${ocupacaoId}`
  );
  return response.data;
}