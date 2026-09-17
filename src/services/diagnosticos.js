import { api } from "../lib/api";



export async function obterDiagnostico(diagnosticoId, careLine = "NEURO") {
  if (!diagnosticoId) {
    throw new Error(
      "O identificador do diagnóstico é obrigatório."
    );
  }

  const response = await api.get(
    `/diagnosticos/${diagnosticoId}`, { params: { care_line: careLine } }
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
    care_line: dados.care_line || "NEURO",
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

  const response = await api.post(
    "/diagnosticos",
    payload
  );

  return response.data;
}

export async function listarDiagnosticos(pacienteId, careLine) {
  const { data } = await api.get(`/diagnosticos/paciente/${pacienteId}`, { params: { care_line: careLine } });
  return data;
}
