import { useId, useRef, useState } from "react";
import { baixarRelatorioPacientePdf } from "../services/pacientes";

import "./ReportDownload.css";
import Button from "./ui/Button";

export default function ReportDownload({ patientId, careLine }) {
  const headingId = useId();
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  function close() { dialogRef.current.close(); }
  function keepFocus(event) {
    if (event.key !== "Tab") return;
    const controls = [...dialogRef.current.querySelectorAll("input:not(:disabled), button:not(:disabled)")];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }
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
      close();
    } catch { setError("Não foi possível gerar o relatório. Verifique o período e seu acesso."); }
    finally { setBusy(false); }
  }
  return <>
    <Button ref={triggerRef} onClick={() => dialogRef.current.showModal()}>Gerar relatório</Button>
    <dialog ref={dialogRef} className="report-period" aria-labelledby={headingId}
      onClose={() => triggerRef.current?.focus()} onKeyDown={keepFocus}>

    <h2 id={headingId}>Período do relatório</h2>
    <div className="report-period__fields">
    <label>Data inicial <input type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
    <label>Data final <input type="date" value={end} onChange={e => setEnd(e.target.value)} /></label>
    <button type="button" disabled={busy} onClick={download}>{busy ? "Gerando…" : "Gerar relatório"}</button>
    <button type="button" onClick={close}>Cancelar</button>
    </div>
    {error && <span role="alert">{error}</span>}
  </dialog>
  </>;
}
