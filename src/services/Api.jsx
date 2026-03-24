const BASE_URL = "http://localhost:8000";

export async function apiRequest(endpoint, method = "GET", body = null) {
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const token = usuario?.access_token;

  const headers = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  if (!response.ok) {
    throw new Error("Erro na requisição");
  }

  return response.json();
}

