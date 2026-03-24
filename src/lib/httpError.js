export function getErrorMessage(err, fallback = "Ocorreu um erro.") {
  return (
    err?.response?.data?.detail ||
    err?.response?.data?.message ||
    err?.message ||
    fallback
  );
}
