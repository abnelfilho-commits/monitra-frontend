export function getApiErrorMessage(err, fallback = "Ocorreu um erro.") {
  const detail = err?.response?.data?.detail;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d?.msg).filter(Boolean).join(" | ");

  // alguns handlers retornam objeto
  const data = err?.response?.data;
  if (data && typeof data === "object") return JSON.stringify(data);

  return err?.message || fallback;
}
