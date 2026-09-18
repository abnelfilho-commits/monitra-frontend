import { useState } from "react";
import { baixarRelatorioPacientePdf } from "../services/pacientes";

export default function ReportDownload({ patientId, careLine }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    if (start && end && start > end) { setError("Período inválido."); return; }
    setBusy(true); setError("");
    try {
      const blob = await baixarRelatorioPacientePdf(patientId, careLine, {
        ...(start ? { period_start: start } : {}), ...(end ? { period_end: end } : {}),
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `relatorio_${careLine.toLowerCase()}_${patientId}.pdf`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch { setError("Não foi possível gerar o relatório. Verifique o período e seu acesso."); }
    finally { setBusy(false); }
  }
  return <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
    <label>Início do relatório <input type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
    <label>Fim do relatório <input type="date" value={end} onChange={e => setEnd(e.target.value)} /></label>
    <button type="button" disabled={busy} onClick={download}>{busy ? "Gerando…" : "📄 Gerar Relatório"}</button>
    {error && <span role="alert">{error}</span>}
  </div>;
}
