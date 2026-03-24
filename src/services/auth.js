import { api } from "../lib/api";

export async function loginRequest(email, senha) {
  const params = new URLSearchParams();
  params.append("username", email);
  params.append("password", senha);

  const res = await api.post("/auth/login", params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return res.data;
}

export async function meRequest() {
  const res = await api.get("/me");
  return res.data;
}
