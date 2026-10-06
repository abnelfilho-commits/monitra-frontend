import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageLayout from "../components/layouts/PageLayout";
import Button from "../components/ui/Button";
import { instituicoesOperacionais, contextosOperacionais, estadoOperacional, executarOperacao, erroOperacional } from "../services/operacaoAssistencial";

const labels = { CONTEXTO_ADMINISTRAR: "Administrar participação contextual", ASSISTENCIAL_LER: "Consultar jornada assistencial", ASSISTENCIAL_REGISTRAR: "Registrar atendimento / check-in" };
const field = { display: "block", width: "100%", padding: 10, margin: "8px 0 16px", boxSizing: "border-box" };
const card = { border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16, background: "white" };

export default function OperacaoAssistencial() {
  const [search, setSearch] = useSearchParams();
  const institution = search.get("instituicao_id") || "";
  const context = search.get("contexto_id") || "";
  return <PageLayout><h1>Operação contextual — Saúde Mental</h1><p>Nomeação, participação e capacidades são operações independentes. Nenhuma concede acesso clínico automaticamente.</p>
    <Link to="/saude-mental">Voltar à Saúde Mental</Link>
    <Scope key={`${institution}:${context}`} {...{institution, context, setSearch}} />
  </PageLayout>;
}
function Scope({ institution, context, setSearch }) {
  const [choices, setChoices] = useState(null), [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    Promise.all([instituicoesOperacionais(), institution ? contextosOperacionais(Number(institution)) : Promise.resolve([])])
      .then(([institutions, contexts]) => { if (current) { setChoices({institutions, contexts}); setError(""); } })
      .catch(e => { if (current) setError(erroOperacional(e)); });
    return () => { current = false; };
  }, [institution, retry]);
  return <>
    {error ? <p role="alert">{error} <Button onClick={() => setRetry(n => n + 1)}>Reconsultar opções</Button></p> : !choices ? <p role="status">Carregando escopos operacionais...</p> : <section style={card}>
      <label htmlFor="operation-institution">Instituição</label><select id="operation-institution" style={field} value={institution} onChange={e => setSearch(e.target.value ? { instituicao_id: e.target.value } : {})}><option value="">Selecione explicitamente</option>{choices.institutions.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}</select>
      <label htmlFor="operation-context">Contexto</label><select id="operation-context" style={field} disabled={!institution} value={context} onChange={e => setSearch({ instituicao_id: institution, ...(e.target.value ? { contexto_id: e.target.value } : {}) })}><option value="">Selecione explicitamente</option>{choices.contexts.map(c => <option key={c.id} value={c.id}>Contexto #{c.id} · {c.data_inicio} → {c.data_fim || "aberto"}</option>)}</select>
      {!choices.institutions.length && <p>Nenhuma instituição disponível para operações desta conta. Os pré-requisitos devem ser preparados explicitamente.</p>}
      {institution && !choices.contexts.length && <p>Nenhum contexto operacional disponível para esta conta nesta instituição.</p>}
    </section>}
    {institution && context && <Operations institution={Number(institution)} context={Number(context)} />}
  </>;
}
function Operations({ institution, context }) {
  const [state, setState] = useState(null), [error, setError] = useState(""), [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false), [unknown, setUnknown] = useState(false), [retry, setRetry] = useState(0);
  const [reason, setReason] = useState(""), [account, setAccount] = useState(""), [caps, setCaps] = useState([]);
  const [target, setTarget] = useState(""), [cap, setCap] = useState(""), [professional, setProfessional] = useState("");
  const [start, setStart] = useState(""), [end, setEnd] = useState("");
  const lock = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let current = true;
    estadoOperacional(institution, context).then(r => { if (current) { setState(r); setError(""); } }).catch(e => { if (current) { setError(erroOperacional(e)); setState(null); } });
    return () => { current = false; };
  }, [institution, context, retry]);
  async function write(command, body) {
    if (lock.current || unknown) return;
    lock.current = true; setBusy(true); setError(""); setSuccess("");
    let committed = false;
    try {
      await executarOperacao(institution, context, command, body); committed = true;
      const next = await estadoOperacional(institution, context);
      if (alive.current) { setState(next); setSuccess("Operação confirmada. Estado consultado novamente."); setAccount(""); setCaps([]); setTarget(""); setCap(""); setProfessional(""); }
    } catch (e) {
      if (alive.current) { setError(committed ? "Escrita confirmada, mas a consulta posterior falhou. Não repita a operação; atualize a consulta." : erroOperacional(e)); setState(null); if (!committed && (!e.response || e.response.status >= 500)) setUnknown(true); }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  const actions = state?.acoes;
  const targets = cap === "CONTEXTO_ADMINISTRAR" ? state?.contas || [] : (state?.profissionais || []).filter(p => p.pode_receber_grant).filter((p, i, all) => all.findIndex(x => x.usuario_instituicao_acesso_id === p.usuario_instituicao_acesso_id) === i).map(p => ({id: p.usuario_instituicao_acesso_id, nome: p.profissional}));
  return <>
    {error && <p role="alert">{error}</p>}{success && <p role="status">{success}</p>}
    {unknown && <p role="alert">Novas escritas bloqueadas nesta sessão até conferência administrativa do resultado indeterminado.</p>}
    <Button variant="secondary" disabled={busy} onClick={() => { setState(null); setRetry(n => n + 1); }}>Atualizar estado</Button>
    {!state && !error && <p role="status">Consultando autoridade e estado...</p>}
    {state && <fieldset disabled={busy || unknown} style={{border:0,padding:0,minWidth:0}}>
      <section style={card}><h2>Saúde Mental</h2><p>Contexto #{context} · {state.linha ? state.linha.ativo ? "Ativa" : "Inativa" : "Linha não adicionada"}</p>
        {actions.ativar_linha && <Button onClick={() => write("saude-mental/ativar")}>Ativar Saúde Mental</Button>}
        {actions.desativar_linha && <Button variant="secondary" onClick={() => { if (window.confirm("Desativar Saúde Mental? Isso não revoga grants existentes.")) write("saude-mental/desativar"); }}>Desativar Saúde Mental</Button>}
        <p>Ativar a linha não cria participação, autoridade ou capacidade clínica. Sua desativação não substitui a revogação de grants.</p>
      </section>
      {(actions.bootstrap || actions.recovery_capacidades.length > 0 || actions.conceder_capacidades.length > 0 || actions.administrar_participacao) && <><label htmlFor="operation-reason">Motivo da operação *</label><textarea id="operation-reason" style={field} value={reason} onChange={e => setReason(e.target.value)} /></>}
      {(actions.bootstrap || actions.recovery_capacidades.length > 0) && <section style={card}><h2>Nomear autoridade de delegação</h2><p>Administrador da plataforma não recebe acesso clínico. Esta operação nomeia outra conta responsável pela delegação contextual.</p>
        <label htmlFor="authority-account">Conta A</label><select id="authority-account" style={field} value={account} onChange={e => setAccount(e.target.value)}><option value="">Selecione</option>{state.contas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select>
        {(actions.bootstrap ? Object.keys(labels) : actions.recovery_capacidades).map(c => <label key={c} style={{display:"block"}}><input type="checkbox" checked={caps.includes(c)} onChange={e => setCaps(old => e.target.checked ? [...old,c] : old.filter(x => x !== c))} /> Autoridade para delegar: {labels[c]}</label>)}
        <Button disabled={!account || !caps.length || !reason.trim()} onClick={() => write(`autoridades/${actions.bootstrap ? "bootstrap" : "recovery"}`, {usuario_instituicao_acesso_id:Number(account), capacidades:caps, motivo:reason})}>{actions.bootstrap ? "Nomear autoridade (bootstrap)" : "Recuperar autoridade (recovery)"}</Button>
        <p>A nomeação não concede CONTEXTO_ADMINISTRAR nem acesso clínico à conta A.</p>
      </section>}
      {actions.conceder_capacidades.length > 0 && <section style={card}><h2>Conceder capacidade contextual</h2><label htmlFor="grant-capability">Capacidade</label><select id="grant-capability" style={field} value={cap} onChange={e => { setCap(e.target.value); setTarget(""); }}><option value="">Selecione</option>{actions.conceder_capacidades.map(c => <option key={c} value={c}>{labels[c]}</option>)}</select>
        <label htmlFor="grant-target">Destinatário</label><select id="grant-target" style={field} value={target} onChange={e => setTarget(e.target.value)}><option value="">Selecione</option>{targets.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select>
        <Button disabled={!target || !cap || !reason.trim()} onClick={() => write("grants", {usuario_instituicao_acesso_id:Number(target),capacidade:cap,motivo:reason})}>Conceder capacidade selecionada</Button>
        <p>CONTEXTO_ADMINISTRAR é destinado à conta D. Capacidades clínicas são destinadas explicitamente ao profissional B; não criam sua participação.</p>
      </section>}
      {actions.administrar_participacao && <section style={card}><h2>Participação profissional</h2><label htmlFor="participation-professional">Profissional B / vínculo vigente</label><select id="participation-professional" style={field} value={professional} onChange={e => setProfessional(e.target.value)}><option value="">Selecione</option>{state.profissionais.map(p => <option key={p.id} value={p.id}>{p.profissional} · {p.data_inicio} → {p.data_fim || "aberto"}</option>)}</select>
        <label>Início da participação<input style={field} type="date" value={start} onChange={e => setStart(e.target.value)} /></label><label>Término da participação<input style={field} type="date" min={start} value={end} onChange={e => setEnd(e.target.value)} /></label>
        <Button disabled={!professional || !start || !reason.trim() || (end && end < start)} onClick={() => write("participacoes", {profissional_instituicao_id:Number(professional),data_inicio:start,data_fim:end || null,motivo:reason})}>Estabelecer participação</Button>
      </section>}
      <section style={card}><h2>Estado operacional do contexto</h2>
        <h3>Autoridades</h3>{!state.autoridades.length && <p>Nenhuma autoridade registrada para este escopo.</p>}{state.autoridades.map(a => <p key={a.id}>{a.nome || "Conta indisponível"} · {labels[a.capacidade_delegavel]} · {a.revogado_em ? "Revogada" : "Não revogada"}</p>)}
        <h3>Participações</h3>{!state.participacoes.length && <p>Nenhuma participação registrada.</p>}{state.participacoes.map(p => <p key={p.id}>{state.profissionais.find(x => x.id === p.profissional_instituicao_id)?.profissional || "Vínculo profissional registrado"} · {p.data_inicio} → {p.data_fim || "aberto"} · {p.invalidado_em ? "Invalidada" : p.encerrado_em ? "Encerrada" : "Não encerrada"}</p>)}
        <h3>Capacidades concedidas</h3>{!state.grants.length && <p>Nenhuma capacidade concedida neste contexto.</p>}{state.grants.map(g => <div key={g.id}><p>{g.nome || "Conta indisponível"} · {labels[g.capacidade]} · {g.revogado_em ? "Revogada" : "Não revogada"}</p>{g.pode_revogar && <Button variant="danger" disabled={!reason.trim()} onClick={() => { if (window.confirm("Revogar esta capacidade contextual?")) write(`grants/${g.id}/revogar`, {motivo:reason}); }}>Revogar {labels[g.capacidade]}</Button>}</div>)}
        <p>Um registro não revogado não prova acesso efetivo: conta, raiz, Pessoa, vínculo, participação e demais requisitos continuam sendo verificados pelo backend.</p>
      </section>
    </fieldset>}{busy && <p role="status">Executando operação explícita...</p>}
  </>;
}
