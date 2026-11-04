import { useCallback, useEffect, useRef, useState } from "react";
import Button from "./ui/Button";
import ContextoOperacoes from "./ContextoOperacoes";
import { useAuth } from "../context/AuthContext";
import { obterPessoa } from "../services/pessoas";
import { pessoasMentais } from "../services/saudeMental";
import { instituicoesOperacionais, contextosOperacionais, estadoOperacional, executarOperacao, participacaoVigente } from "../services/operacaoAssistencial";

const date = v => v ? v.split("-").reverse().join("/") : "sem término";
const period = c => `${date(c.data_inicio)} — ${date(c.data_fim)}`;
const identity = c => [c.instituicao_id, c.pessoa_id, c.paciente_id, c.paciente_instituicao_id, c.id].join(":");
function validateRows(rows, institution) {
  if (!Array.isArray(rows)) throw Error("Invalid contexts");
  const ids = new Set(), links = new Map(), patients = new Map(), people = new Map();
  for (const c of rows) {
    if (![c.id, c.instituicao_id, c.paciente_id, c.paciente_instituicao_id, c.pessoa_id].every(v => Number.isSafeInteger(v) && v > 0) || c.instituicao_id !== institution || ids.has(c.id)) throw Error("Invalid identity");
    const pair = `${c.paciente_id}:${c.pessoa_id}`;
    if ((links.has(c.paciente_instituicao_id) && links.get(c.paciente_instituicao_id) !== pair) || (patients.has(c.paciente_id) && patients.get(c.paciente_id) !== c.pessoa_id) || (people.has(c.pessoa_id) && people.get(c.pessoa_id) !== c.paciente_id)) throw Error("Conflicting identity");
    ids.add(c.id); links.set(c.paciente_instituicao_id, pair); patients.set(c.paciente_id, c.pessoa_id); people.set(c.pessoa_id, c.paciente_id);
  }
  return rows;
}
function validateState(value, selected) {
  if (value?.instituicao_id !== selected.instituicao_id || value?.contexto_id !== selected.id || typeof value.acoes?.administrar_participacao !== "boolean" || !Array.isArray(value.profissionais) || !Array.isArray(value.participacoes)) throw Error("Invalid scope");
  return value;
}
function message(error) {
  const code = error?.response?.data?.detail?.code;
  return ({PARTICIPATION_PERIOD_CONFLICT:"Já existe um vínculo com esse profissional no período informado.", PROFESSIONAL_LINK_INELIGIBLE:"O profissional não está disponível para o período informado. Atualize os dados.", CONTEXT_ADMINISTRATION_DENIED:"Sua conta não está autorizada a vincular profissionais neste atendimento. Solicite a preparação ao responsável."}[code]) || ({401:"Sua sessão expirou. Entre novamente.",403:"Sua conta não está autorizada para esta operação.",409:"Os dados mudaram ou o período está em conflito. Atualize os dados.",422:"Confira as datas e o motivo."}[error?.response?.status]) || "Não foi possível confirmar os dados. Atualize ou solicite conferência ao responsável.";
}

export default function VincularPessoa({ onBusy, onUncertain, blocked }) {
  const [institutions, setInstitutions] = useState(null), [institution, setInstitution] = useState("");
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const reportBusy = useCallback(v => { setBusy(v); onBusy(v); }, [onBusy]);
  useEffect(() => {
    let current = true;
    instituicoesOperacionais().then(rows => { if (!Array.isArray(rows)) throw Error("Invalid institutions"); if (current) setInstitutions(rows); }).catch(e => { if (current) setError(message(e)); });
    return () => { current = false; };
  }, []);
  return <section className="setup-card" aria-label="Vincular Pessoa a Profissional">
    {error && <p role="alert">{error}</p>}
    <fieldset disabled={busy || blocked}>
      <label>Instituição<select aria-label="Instituição" disabled={!institutions} value={institution} onChange={e => setInstitution(e.target.value)}><option value="">Selecione</option>{institutions?.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}</select></label>
      {institutions?.length === 0 && <p>Nenhuma instituição disponível para esta conta. Solicite conferência ao responsável.</p>}
      {institution && <Patient key={institution} institution={Number(institution)} onBusy={reportBusy} onUncertain={onUncertain} blocked={blocked} />}
    </fieldset>
  </section>;
}
function Patient({ institution, onBusy, onUncertain, blocked }) {
  const { user } = useAuth();
  const [rows, setRows] = useState(null), [person, setPerson] = useState(""), [context, setContext] = useState("");
  const [names, setNames] = useState({}), [error, setError] = useState(""), [revision, refresh] = useState(0);
  useEffect(() => {
    let current = true;
    contextosOperacionais(institution).then(value => { const valid = validateRows(value, institution); if (current) { setRows(valid); setError(""); } }).catch(e => { if (current) setError(message(e)); });
    return () => { current = false; };
  }, [institution, revision]);
  useEffect(() => {
    if (!rows?.length) return;
    let current = true;
    async function loadNames() {
      const found = {};
      if (user?.perfil === "ADMIN") {
        await Promise.all([...new Set(rows.map(r => r.pessoa_id))].map(async id => {
          try { const p = await obterPessoa(id); if (p.id === id && typeof p.nome_completo === "string") found[id] = p.nome_social || p.nome_completo; } catch { /* Optional name; never an authorization prerequisite. */ }
        }));
      } else {
        // Existing authorized list only; never request a clinical record for its name.
        let offset = 0, more = true;
        while (more && current) {
          const page = await pessoasMentais(institution, offset);
          if (!Array.isArray(page?.itens)) break;
          for (const p of page.itens) {
            if (rows.some(c => c.id === p.contexto_assistencial_id && c.instituicao_id === p.instituicao_id && c.pessoa_id === p.pessoa_id && c.paciente_id === p.paciente_id && c.paciente_instituicao_id === p.paciente_instituicao_id) && typeof p.nome_completo === "string") found[p.pessoa_id] = p.nome_social || p.nome_completo;
          }
          more = page.tem_mais === true && page.itens.length > 0 && rows.some(c => !found[c.pessoa_id]); offset += page.itens.length;
        }
      }
      if (current) setNames(found);
    }
    loadNames().catch(() => { /* Names unavailable: preserve explicit reference selection. */ });
    return () => { current = false; };
  }, [rows, institution, user?.perfil]);
  const people = [...new Set((rows || []).map(c => c.pessoa_id))];
  const contexts = (rows || []).filter(c => c.pessoa_id === Number(person));
  const selected = contexts.length === 1 ? contexts[0] : contexts.find(c => c.id === Number(context));
  return <>
    {error && <p role="alert">{error} <Button onClick={() => { setRows(null); setError(""); refresh(n => n + 1); }}>Atualizar pacientes</Button></p>}
    {!rows && !error && <p role="status">Carregando pacientes...</p>}
    {rows?.length === 0 && <p>Nenhum atendimento existente está disponível nesta instituição. Solicite a preparação ao responsável. Nenhum atendimento será criado aqui.</p>}
    {people.length > 0 && <label>Paciente<select aria-label="Paciente" value={person} onChange={e => { setPerson(e.target.value); setContext(""); }}><option value="">Selecione</option>{people.map(id => <option key={id} value={id}>{names[id] || `Pessoa ${id} — nome indisponível`}</option>)}</select></label>}
    {contexts.length > 1 && <label>Contexto existente<select aria-label="Contexto existente" value={context} onChange={e => setContext(e.target.value)}><option value="">Selecione o atendimento</option>{contexts.map(c => <option key={c.id} value={c.id}>{period(c)}</option>)}</select></label>}
    {selected && <><p>Atendimento: {period(selected)}</p><Participation key={identity(selected)} selected={selected} onBusy={onBusy} onUncertain={onUncertain} blocked={blocked} /></>}
  </>;
}
function Participation({ selected, onBusy, onUncertain, blocked }) {
  const [state, setState] = useState(null), [error, setError] = useState(""), [success, setSuccess] = useState("");
  const [professional, setProfessional] = useState(""), [start, setStart] = useState(""), [end, setEnd] = useState(""), [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false), [unknown, setUnknown] = useState(false), [revision, refresh] = useState(0);
  const [completed, setCompleted] = useState(null);
  const lock = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let current = true;
    estadoOperacional(selected.instituicao_id, selected.id).then(value => { const valid = validateState(value, selected); if (current) { setState(valid); setError(""); } }).catch(e => { if (current) { setState(null); setError(message(e)); } });
    return () => { current = false; };
  }, [selected, revision]);
  const candidates = [...new Map((state?.profissionais || []).map(p => [p.id, p])).values()];
  const completedLink = completed && state ? participacaoVigente(state, selected.instituicao_id, selected.id, completed) : null;
  const chosen = candidates.find(p => p.id === Number(professional));
  const validPeriod = !!start && (!end || end >= start) && chosen && start >= chosen.data_inicio && (!chosen.data_fim || (end && end <= chosen.data_fim));
  async function resume(id) {
    if (lock.current || blocked || unknown) return;
    lock.current = true; setBusy(true); onBusy(true); setCompleted(null); setError("");
    try {
      const rows = validateRows(await contextosOperacionais(selected.instituicao_id), selected.instituicao_id);
      if (!rows.some(c => identity(c) === identity(selected))) throw Error("Context changed");
      const fresh = validateState(await estadoOperacional(selected.instituicao_id, selected.id), selected);
      if (!participacaoVigente(fresh, selected.instituicao_id, selected.id, id)) throw Error("Invalid participation");
      if (alive.current) { setState(fresh); setCompleted(id); setSuccess("Participação existente confirmada. Continue as permissões de atendimento."); }
    } catch {
      if (alive.current) { setUnknown(true); onUncertain(); setError("Participação não confirmada ou identidade ambígua. Solicite conferência antes de continuar."); }
    } finally { lock.current = false; onBusy(false); if (alive.current) setBusy(false); }
  }
  async function submit(e) {
    e.preventDefault();
    if (lock.current || blocked || unknown || !state?.acoes.administrar_participacao || !validPeriod || !reason.trim()) return;
    lock.current = true; setBusy(true); onBusy(true); setError(""); setSuccess("");
    let sent = false, accepted = false;
    try {
      const rows = validateRows(await contextosOperacionais(selected.instituicao_id), selected.instituicao_id);
      if (!rows.some(c => identity(c) === identity(selected))) throw Error("Context changed");
      const current = validateState(await estadoOperacional(selected.instituicao_id, selected.id), selected);
      if (!current.acoes.administrar_participacao || !current.profissionais.some(p => p.id === chosen.id && start >= p.data_inicio && (!p.data_fim || (end && end <= p.data_fim)))) { setState(current); throw Error("Eligibility changed"); }
      if (current.participacoes.some(p => p.profissional_instituicao_id === chosen.id && !p.invalidado_em && !p.encerrado_em &&
          (!p.data_fim || start <= p.data_fim) && (!end || p.data_inicio <= end))) {
        setState(current); setError("Participação já registrada nesse período. Continue pelas permissões do vínculo existente."); return;
      }
      const payload = { profissional_instituicao_id: chosen.id, data_inicio: start, data_fim: end || null, motivo: reason.trim() };
      sent = true;
      const receipt = await executarOperacao(selected.instituicao_id, selected.id, "participacoes", payload);
      accepted = true;
      const after = validateState(await estadoOperacional(selected.instituicao_id, selected.id), selected);
      if (!after.participacoes.some(p => Number.isInteger(receipt?.id) && p.id === receipt.id && p.profissional_instituicao_id === payload.profissional_instituicao_id && p.data_inicio === payload.data_inicio && p.data_fim === payload.data_fim && !p.invalidado_em && !p.encerrado_em)) throw Error("Readback missing");
      if (alive.current) { setState(after); setSuccess("Vínculo registrado e confirmado. Participação concluída."); setCompleted(receipt.id); setProfessional(""); setStart(""); setEnd(""); setReason(""); }
    } catch (e) {
      if (alive.current) {
        setError(message(e));
        if (accepted || (sent && (!e.response || e.response.status >= 500))) { setUnknown(true); onUncertain(); }
      }
    } finally { lock.current = false; onBusy(false); if (alive.current) setBusy(false); }
  }
  return <>
    {error && <p role="alert">{error}</p>}{success && <p role="status">{success}</p>}
    {unknown && <p role="alert">Resultado não confirmado. Não repita a solicitação; peça conferência ao responsável.</p>}
    {!state && !error && <p role="status">Carregando profissionais...</p>}
    {state && !state.acoes.administrar_participacao && <p role="alert">Sua conta não está autorizada a vincular profissionais neste atendimento. Solicite a preparação ao responsável.</p>}
    {state?.acoes.administrar_participacao && !candidates.length && <p>Nenhum profissional elegível nesta instituição. Solicite a preparação do profissional ao responsável.</p>}
    {state?.acoes.administrar_participacao && candidates.length > 0 && <form onSubmit={submit}>
      <fieldset disabled={busy || unknown || blocked}>
        <label>Profissional<select aria-label="Profissional" required value={professional} onChange={e => setProfessional(e.target.value)}><option value="">Selecione</option>{candidates.map(p => <option key={p.id} value={p.id}>{p.profissional} · {period(p)}</option>)}</select></label>
        <div className="setup-grid"><label>Data de início<input required type="date" min={chosen?.data_inicio} max={chosen?.data_fim || undefined} value={start} onChange={e => setStart(e.target.value)} /></label><label>Data de término (opcional)<input type="date" min={start || chosen?.data_inicio} max={chosen?.data_fim || undefined} value={end} onChange={e => setEnd(e.target.value)} /></label></div>
        {chosen?.data_fim && <p>O período deve terminar até {date(chosen.data_fim)}.</p>}
        <label>Motivo<textarea required value={reason} onChange={e => setReason(e.target.value)} /></label>
        <Button type="submit" disabled={!validPeriod || !reason.trim()}>Confirmar vínculo</Button>
      </fieldset>
    </form>}
    {completed && state && !completedLink && <p role="alert">Permissões pendentes: participação sem vigência ou identidade não confirmada. Solicite conferência.</p>}
    {completedLink && <ContextoOperacoes key={completed} institution={selected.instituicao_id} context={selected.id} selected={selected}
      embedded externalStep={4} participationTarget={completedLink.id} participationId={completed} onBusy={onBusy} onUncertain={onUncertain} blocked={blocked || unknown} />}
    {busy && <p role="status">Confirmando vínculo...</p>}
    {state && <section aria-label="Vínculos registrados"><h2>Vínculos registrados</h2>{!state.participacoes.length && <p>Nenhum vínculo registrado neste atendimento.</p>}{state.participacoes.map(p => <p key={p.id}>{candidates.find(c => c.id === p.profissional_instituicao_id)?.profissional || "Profissional com nome indisponível"} · {period(p)} · {p.invalidado_em ? "Invalidado" : p.encerrado_em ? "Encerrado" : "Registrado"} {participacaoVigente(state, selected.instituicao_id, selected.id, p.id) && <Button disabled={busy || blocked || unknown} onClick={() => resume(p.id)}>Continuar permissões</Button>}</p>)}</section>}
    <Button variant="secondary" disabled={busy} onClick={() => { setState(null); setSuccess(""); refresh(n => n + 1); }}>Atualizar vínculos</Button>
  </>;
}
