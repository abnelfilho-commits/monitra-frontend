import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import { salvarPTSMental } from "../../services/saudeMental";

export default function CronogramaMental({ institution, pessoaId, contextoId, plan, objective, planning, canWrite }) {
  const [data, setData] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false), [review, setReview] = useState([]);
  const base = `/${plan.id}/objetivos/${objective.id}/planejamentos/${planning.id}`;
  const call = (method, payload) => salvarPTSMental(institution, pessoaId, contextoId, method, base + "/cronograma", payload);
  async function load() {
    setBusy(true); setError("");
    try {
      const result = await call("GET"); setData(result); setUncertain(false);
      setReview(result.proposta.map(s => ({ numero: s.numero, data: s.data, hora_inicio: "", hora_fim: "" })));
    } catch { setError("Cronograma indisponível ou consulta não autorizada neste contexto."); setData(null); }
    finally { setBusy(false); }
  }
  async function confirm(event) {
    event.preventDefault();
    if (disabled) return;
    setBusy(true); setError("");
    try { setData(await call("POST", { cronograma: review })); }
    catch (e) { setError(e?.response?.data?.detail?.message || "Não foi possível confirmar. Consulte novamente o cronograma antes de repetir."); setUncertain(true); }
    finally { setBusy(false); }
  }
  const disabled = busy || uncertain || !canWrite || !data?.pode_registrar;
  const edit = (index, name, value) => setReview(rows => rows.map((r, i) => i === index ? { ...r, [name]: value } : r));
  return <section aria-label={`Cronograma do planejamento ${planning.id}`}>
    <Button variant="secondary" disabled={busy} onClick={load}>{data?.quantidade_materializada ? "Consultar cronograma" : "Sugerir Cronograma"}</Button>
    {error && <p role="alert">{error}</p>}
    {data && <>
      <p>Planejado: {data.quantidade_planejada} · Cronograma: {data.quantidade_materializada}</p>
      <p>{data.atividade} · {data.ocupacao} · {data.profissional}</p>
      {data.quantidade_materializada > 0 ? <>
        <p>Cronograma confirmado. Planejamento protegido contra alterações estruturais.</p>
        <Link to="/agenda-assistencial?espaco=saude-mental">Abrir Agenda Assistencial</Link>
        <div style={{ overflowX: "auto" }}><table><thead><tr><th>Sessão</th><th>Data</th><th>Horário</th><th>Duração</th><th>Estado</th><th>Consulta</th></tr></thead><tbody>
          {data.sessoes.map(s => <tr key={s.id}><td>{s.numero_sessao}</td><td>{s.data_agendada}</td><td>{s.hora_inicio || "Não definido"}{s.hora_fim ? `–${s.hora_fim}` : ""}</td><td>{s.duracao_minutos} min</td><td>{s.status}</td><td><Link to={`/sessoes-assistenciais/${s.id}?espaco=saude-mental`}>Visualizar Sessão {s.numero_sessao}</Link></td></tr>)}
        </tbody></table></div>
      </> : <form onSubmit={confirm}>
        <p>Revise as datas e informe início e fim. Os horários devem respeitar a duração de {planning.duracao_minutos} minutos. Confirmar cria sessões agendadas, não realizadas.</p>
        <fieldset disabled={disabled}><legend>Cronograma sugerido</legend>
          <div style={{ overflowX: "auto" }}><table><thead><tr><th>Sessão</th><th>Data</th><th>Hora início</th><th>Hora fim</th></tr></thead><tbody>
            {review.map((s, i) => <tr key={s.numero}><td>{s.numero}</td><td><input aria-label={`Data sessão ${s.numero}`} type="date" required min={planning.data_inicio} max={planning.data_fim} value={s.data} onChange={e => edit(i, "data", e.target.value)} /></td><td><input aria-label={`Início sessão ${s.numero}`} type="time" required value={s.hora_inicio} onChange={e => edit(i, "hora_inicio", e.target.value)} /></td><td><input aria-label={`Fim sessão ${s.numero}`} type="time" required value={s.hora_fim} onChange={e => edit(i, "hora_fim", e.target.value)} /></td></tr>)}
          </tbody></table></div>
          <Button type="submit" disabled={!review.length}>Confirmar Cronograma</Button>
          <Button type="button" variant="secondary" onClick={() => setData(null)}>Cancelar</Button>
        </fieldset>
      </form>}
    </>}
  </section>;
}
