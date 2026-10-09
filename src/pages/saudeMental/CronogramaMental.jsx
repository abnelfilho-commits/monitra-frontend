import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import { salvarPTSMental } from "../../services/saudeMental";

export default function CronogramaMental({ institution, pessoaId, contextoId, plan, objective, planning, canWrite }) {
  const dialog=useRef(null), headingId=useId();
  const [opened,setOpened]=useState(false);
  const [data, setData] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false), [review, setReview] = useState([]);
  const base = `/${plan.id}/objetivos/${objective.id}/planejamentos/${planning.id}`;
  const call = (method, payload) => salvarPTSMental(institution, pessoaId, contextoId, method, base + "/cronograma", payload);
  async function load() {
    setOpened(true);setBusy(true); setError("");
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
    try { setData(await call("POST", { cronograma: review })); setOpened(false); }
    catch (e) { setError(e?.response?.data?.detail?.message || "Não foi possível confirmar. Consulte novamente o cronograma antes de repetir."); setUncertain(true); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    let active=true;
    salvarPTSMental(institution,pessoaId,contextoId,"GET",base+"/cronograma").then(result=>{if(active)setData(result);}).catch(()=>{if(active)setError("Cronograma indisponível ou consulta não autorizada neste contexto.");});
    return ()=>{active=false;};
  },[institution,pessoaId,contextoId,base]);
  useEffect(() => {
    if(!opened)return;
    const node=dialog.current, previous=document.body.style.overflow;
    node.showModal();document.body.style.overflow="hidden";
    return ()=>{node.close();document.body.style.overflow=previous;};
  },[opened]);
  const disabled = busy || uncertain || !canWrite || !data?.pode_registrar;
  const edit = (index, name, value) => setReview(rows => rows.map((r, i) => i === index ? { ...r, [name]: value } : r));
  return <section aria-label={`Cronograma do planejamento ${planning.id}`}>
    <Button variant="secondary" disabled={busy} onClick={load}>{data?.quantidade_materializada ? "Consultar Cronograma" : "Sugerir Cronograma"}</Button>
    {data?.quantidade_materializada > 0 && <p role="status">Cronograma confirmado · {data.quantidade_materializada} sessões. <Link to="/agenda-assistencial?espaco=saude-mental" state={{returnTo:`/saude-mental/pessoas/${pessoaId}/contextos/${contextoId}/pts?instituicao_id=${encodeURIComponent(institution)}`}}>Abrir Agenda Assistencial</Link></p>}
    {!opened&&error && <p role="alert">{error}</p>}
    <dialog ref={dialog} className="mental-pts__modal mental-pts__modal--large" aria-labelledby={headingId} onCancel={e=>{e.preventDefault();if(!busy)setOpened(false);}}>
    <header className="mental-pts__modal-header"><h3 id={headingId}>{data?.quantidade_materializada ? "Consultar Cronograma" : "Sugerir Cronograma"}</h3><Button variant="secondary" disabled={busy} onClick={()=>setOpened(false)}>Fechar</Button></header>
    <div className="mental-pts__modal-body">
    {error && <p role="alert">{error}</p>}{busy&&<p role="status">Carregando…</p>}
    {data && <>
      <p>Planejado: {data.quantidade_planejada} · Cronograma: {data.quantidade_materializada}</p>
      <p>{data.atividade} · {data.ocupacao} · {data.profissional}</p>
      {data.quantidade_materializada > 0 ? <>
        <p>Cronograma confirmado. Planejamento protegido contra alterações estruturais.</p>
        <div style={{ overflowX: "auto" }}><table><thead><tr><th>Sessão</th><th>Data</th><th>Horário</th><th>Duração</th><th>Estado</th><th>Consulta</th></tr></thead><tbody>
          {data.sessoes.map(s => <tr key={s.id}><td data-label="Sessão">{s.numero_sessao}</td><td data-label="Data">{s.data_agendada}</td><td data-label="Horário">{s.hora_inicio || "Não definido"}{s.hora_fim ? `–${s.hora_fim}` : ""}</td><td data-label="Duração">{s.duracao_minutos} min</td><td data-label="Estado">{s.status}</td><td data-label="Consulta"><Link to={`/sessoes-assistenciais/${s.id}?espaco=saude-mental`}>Visualizar Sessão {s.numero_sessao}</Link></td></tr>)}
        </tbody></table></div>
      </> : <form id={headingId+"-form"} onSubmit={confirm}>
        <p>Revise as datas e informe os horários antes de confirmar as sessões.</p>
        <fieldset disabled={disabled}><legend>Cronograma sugerido</legend>
          <div style={{ overflowX: "auto" }}><table><thead><tr><th>Sessão</th><th>Data</th><th>Hora início</th><th>Hora fim</th></tr></thead><tbody>
            {review.map((s, i) => <tr key={s.numero}><td data-label="Sessão">{s.numero}</td><td data-label="Data"><input aria-label={`Data sessão ${s.numero}`} type="date" required min={planning.data_inicio} max={planning.data_fim} value={s.data} onChange={e => edit(i, "data", e.target.value)} /></td><td data-label="Hora início"><input aria-label={`Início sessão ${s.numero}`} type="time" required value={s.hora_inicio} onChange={e => edit(i, "hora_inicio", e.target.value)} /></td><td data-label="Hora fim"><input aria-label={`Fim sessão ${s.numero}`} type="time" required value={s.hora_fim} onChange={e => edit(i, "hora_fim", e.target.value)} /></td></tr>)}
          </tbody></table></div>
        </fieldset>
      </form>}
    </>}</div>
    <footer className="mental-pts__modal-footer"><Button type="button" variant="secondary" disabled={busy} onClick={()=>setOpened(false)}>{data?.quantidade_materializada ? "Fechar consulta" : "Cancelar"}</Button>
    {data && !data.quantidade_materializada && <Button type="submit" form={headingId+"-form"} disabled={disabled||!review.length}>Confirmar Cronograma</Button>}</footer>
    </dialog>
  </section>;
}
