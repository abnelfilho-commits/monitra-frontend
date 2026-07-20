import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export async function obterDiagnostico(diagnosticoId) {
  if (!diagnosticoId) {
    throw new Error(
      "O identificador do diagnóstico é obrigatório."
    );
  }

  const response = await axios.get(
    `${API_URL}/diagnosticos/${diagnosticoId}`
  );

  return response.data;
}

export async function registrarDiagnostico(dados) {
  if (!dados?.paciente_id) {
    throw new Error("O paciente é obrigatório.");
  }

  if (!dados?.tipo) {
    throw new Error("O tipo do diagnóstico é obrigatório.");
  }

  if (!dados?.descricao_clinica?.trim()) {
    throw new Error(
      "A descrição clínica do diagnóstico é obrigatória."
    );
  }

  if (!dados?.data_diagnostico) {
    throw new Error(
      "A data do diagnóstico é obrigatória."
    );
  }

  const payload = {
    paciente_id: Number(dados.paciente_id),
    tipo: dados.tipo,
    status: dados.status || "ATIVO",
    cid: dados.cid?.trim() || null,
    descricao_clinica:
      dados.descricao_clinica.trim(),
    data_diagnostico: dados.data_diagnostico,

    medico_nome: dados.medico_nome?.trim() || null,
    medico_especialidade:
      dados.medico_especialidade?.trim() || null,
    medico_crm: dados.medico_crm?.trim() || null,
    medico_cpf: dados.medico_cpf?.trim() || null,

    observacoes: dados.observacoes?.trim() || null,
  };

  const response = await axios.post(
    `${API_URL}/diagnosticos`,
    payload
  );

  return response.data;
}