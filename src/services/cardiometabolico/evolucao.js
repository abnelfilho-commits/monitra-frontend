import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");

  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function buscarEvolucaoCardiometabolica(pacienteId) {
  const response = await axios.get(
    `${API_URL}/cardiometabolico/pacientes/${pacienteId}/evolucao`,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data || [];
}
