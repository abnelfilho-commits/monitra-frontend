import api from "./api";

export async function obterContextoFinanceiroInstitucional() {
  const response = await api.get("/financeiro/institucional/contexto");
  return response.data;
}

export async function gerarPreviewFinanceiroInstitucional(payload) {
  const response = await api.post(
    "/financeiro/institucional/preview",
    payload
  );

  return response.data;
}
