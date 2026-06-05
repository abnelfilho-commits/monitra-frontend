import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");

  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function listarPacientesCardiometabolico() {
  const response = await axios.get(
    `${API_URL}/cardiometabolico/pacientes`,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data || [];
}

export async function buscarPacienteCardiometabolico(
  pacienteId
) {
  const response = await axios.get(
    `${API_URL}/cardiometabolico/pacientes/${pacienteId}`,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
}
