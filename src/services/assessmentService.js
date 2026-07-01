import api from "./api";

export async function obterFormulario(codigo) {
    const response = await api.get(`/formularios/codigo/${codigo}`);
    return response.data;
}

export async function salvarRegistroLongitudinal(payload) {
    const response = await api.post("/registros-longitudinais/", payload);
    return response.data;
}

export async function executarAssessment(registroId, instrumento) {
    const response = await api.post("/assessments/execute", {
        registro_id: registroId,
        instrumento,
    });

    return response.data;
}

export async function obterAssessmentPorRegistro(registroId) {
    const response = await api.get(
        `/assessments/registro/${registroId}`
    );

    return response.data;
}

export async function listarAssessmentsPaciente(pacienteId) {
    const res = await api.get(`/assessments/paciente/${pacienteId}`);
    return res.data;
}

export async function obterAssessment(id) {
    const response = await api.get(`/assessments/${id}`);
    return response.data;
}