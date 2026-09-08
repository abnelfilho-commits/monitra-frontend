import { api } from "../lib/api";

export async function obterCockpitGestao() {
  const res = await api.get("/cockpit/gestao");
  return res.data;
}