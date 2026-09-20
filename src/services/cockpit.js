import { api } from "../lib/api";

export async function obterCockpitProfissional(careLine, offset = 0, limit = 5) {
  const res = await api.get("/cockpit/profissional", { params: { care_line: careLine, offset, limit } });
  return res.data;
}