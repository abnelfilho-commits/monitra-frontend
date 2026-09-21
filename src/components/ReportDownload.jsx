import { useId, useState } from "react";
import { baixarRelatorioPacientePdf } from "../services/pacientes";

import "./ReportDownload.css";

export default function ReportDownload({ patientId, careLine }) {
  const headingId = useId();
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
  return <section className="report-period" aria-labelledby={headingId}>
    <h2 id={headingId}>Período do relatório</h2>
    <div className="report-period__fields">
    <label>Data inicial <input type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
    <label>Data final <input type="date" value={end} onChange={e => setEnd(e.target.value)} /></label>
    <button type="button" disabled={busy} onClick={download}>{busy ? "Gerando…" : "Gerar relatório"}</button>
    </div>
    {error && <span role="alert">{error}</span>}
  </section>;
}
