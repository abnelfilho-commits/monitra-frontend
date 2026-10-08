import { useState } from "react";
import Button from "../../components/ui/Button";
import { salvarPTSMental } from "../../services/saudeMental";

export default function CronogramaMental({ institution, pessoaId, contextoId, plan, objective, planning, canWrite }) {
  const [data, setData] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false), [attendance, setAttendance] = useState(null);
  const base = `/${plan.id}/objetivos/${objective.id}/planejamentos/${planning.id}`;
  const call = (method, suffix, payload) => salvarPTSMental(institution, pessoaId, contextoId, method, base + suffix, payload);
  async function load() {
    setBusy(true); setError("");
    try { setData(await call("GET", "/cronograma")); setUncertain(false); setAttendance(null); }
    catch { setError("Cronograma indisponível ou consulta não autorizada neste contexto."); setData(null); }
    finally { setBusy(false); }
  }
  async function write(suffix, payload) {
    if (busy || uncertain || !canWrite || !data?.pode_registrar) return;
    setBusy(true); setError("");
    try { setData(await call("POST", suffix, payload)); setAttendance(null); }
    catch (e) { setError(e?.response?.data?.detail?.message || "Não foi possível confirmar a operação. Consulte novamente o cronograma."); setUncertain(true); }
    finally { setBusy(false); }
  }
  const disabled = busy || uncertain || !canWrite || !data?.pode_registrar;
  return <section aria-label={`Cronograma do planejamento ${planning.id}`}>
    <Button variant="secondary" disabled={busy} onClick={load}>Consultar cronograma</Button>
    {error && <p role="alert">{error}</p>}
    {data && <>
      <p>Planejado: {data.quantidade_planejada} · Cronograma: {data.quantidade_materializada}</p>
      <p>{data.quantidade_materializada ? "Cronograma gerado" : "Cronograma não gerado — revise as datas propostas abaixo."}</p>
      <p>{data.atividade} · {data.ocupacao} · {data.profissional}</p>
      {data.quantidade_materializada > 0 && <p>Planejamento protegido contra alterações estruturais após a geração das sessões.</p>}
      {!data.quantidade_materializada && <><p>Horários não definidos. A confirmação cria sessões AGENDADAS, não realizadas.</p><Button disabled={disabled} onClick={() => write("/cronograma")}>Gerar cronograma</Button></>}
      <div style={{ overflowX: "auto" }}><table><thead><tr><th>Sessão</th><th>Data</th><th>Horário</th><th>Duração</th><th>Estado</th><th>Ações</th></tr></thead><tbody>
        {(data.quantidade_materializada ? data.sessoes : data.proposta).map(s => <tr key={s.id || s.numero}>
          <td>{s.numero_sessao || s.numero}</td><td>{s.data_agendada || s.data}</td><td>{s.hora_inicio || "Não definido"}{s.hora_fim ? `–${s.hora_fim}` : ""}</td><td>{s.duracao_minutos} min</td><td>{s.status || "Proposta não materializada"}</td>
          <td>{s.status === "AGENDADA" && <Button disabled={disabled} onClick={() => write(`/sessoes/${s.id}/estado`, { acao: "confirmar" })}>Confirmar sessão {s.numero_sessao}</Button>}
            {s.status === "CONFIRMADA" && <Button disabled={disabled} onClick={() => write(`/sessoes/${s.id}/estado`, { acao: "iniciar" })}>Iniciar sessão {s.numero_sessao}</Button>}
            {s.status === "EM_ANDAMENTO" && (!s.registro_longitudinal_id ? <Button disabled={disabled} onClick={() => setAttendance({ id: s.id, narrativa: "", proximos: "" })}>Registrar atendimento {s.numero_sessao}</Button> : <Button disabled={disabled} onClick={() => write(`/sessoes/${s.id}/estado`, { acao: "finalizar" })}>Finalizar sessão {s.numero_sessao}</Button>)}
            {s.narrativa && <details><summary>Registro do atendimento</summary><p style={{ whiteSpace: "pre-wrap" }}>{s.narrativa}</p>{s.proximos_passos?.map((p, i) => <p key={i}>{p}</p>)}<p>Conta registradora: #{s.autor_usuario_id}</p></details>}
          </td></tr>)}
      </tbody></table></div>
      {attendance && <form onSubmit={e => { e.preventDefault(); write(`/sessoes/${attendance.id}/atendimento`, { narrativa: attendance.narrativa.trim(), proximos_passos: attendance.proximos.split("\n").map(x => x.trim()).filter(Boolean) }); }}>
        <fieldset disabled={disabled}><legend>Registro do atendimento</legend>
          <label>Como foi o atendimento?<textarea required value={attendance.narrativa} onChange={e => setAttendance({ ...attendance, narrativa: e.target.value })} /></label>
          <label>Próximos passos (um por linha)<textarea value={attendance.proximos} onChange={e => setAttendance({ ...attendance, proximos: e.target.value })} /></label>
          <Button type="submit">Salvar atendimento</Button><Button type="button" variant="secondary" onClick={() => setAttendance(null)}>Cancelar registro</Button>
        </fieldset>
      </form>}
    </>}
  </section>;
}
