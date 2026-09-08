import { api } from "../lib/api";

export async function obterCockpitProfissional() {
  const res = await api.get("/cockpit/profissional");
  return res.data;
}