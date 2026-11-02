import { useEffect, useRef, useState } from "react";
import Button from "./ui/Button";
import { estadoOperacional, executarOperacao, erroOperacional } from "../services/operacaoAssistencial";
import "../pages/OperacaoAssistencial.css";

const labels = { CONTEXTO_ADMINISTRAR: "Administrar participações", ASSISTENCIAL_LER: "Consultar atendimento", ASSISTENCIAL_REGISTRAR: "Registrar atendimento e check-ins" };
const steps = ["Identificação e pré-requisitos", "Responsável por delegar", "Administrar participações", "Participação profissional", "Permissões de atendimento", "Resumo do estado operacional"];
const date = value => value ? value.split("-").reverse().join("/") : "em aberto";
const contextLabel = c => `${date(c.data_inicio)} → ${date(c.data_fim)} · referência ${c.id}`;
const validState = (s, institution, context) => s?.instituicao_id === institution && s?.contexto_id === context && s.acoes && [s.contas, s.profissionais, s.autoridades, s.grants, s.participacoes].every(Array.isArray);

export default function ContextoOperacoes({ institution, context, institutionName, selected, externalStep, embedded = false, onBusy, onUncertain, blocked = false, refreshKey = 0, onState }) {
  const [state, setState] = useState(null), [error, setError] = useState(""), [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false), [unknown, setUnknown] = useState(false), [retry, setRetry] = useState(0);
  const [localStep, setStep] = useState(0);
  const step = externalStep ?? localStep;
  const [reason, setReason] = useState(""), [account, setAccount] = useState(""), [caps, setCaps] = useState([]);
  const [target, setTarget] = useState(""), [cap, setCap] = useState(""), [professional, setProfessional] = useState("");
  const [start, setStart] = useState(""), [end, setEnd] = useState(""), [revoke, setRevoke] = useState("");
  const lock = useRef(false), alive = useRef(true), heading = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let current = true;
    estadoOperacional(institution, context).then(r => {
      if (!validState(r, institution, context)) throw Error("Invalid operational scope");
      if (current) { setState(r); onState?.(r); setError(""); }
    }).catch(e => { if (current) { setError(erroOperacional(e)); setState(null); } });
    return () => { current = false; };
  }, [institution, context, retry, refreshKey, onState]);
  async function write(command, body) {
    if (lock.current || unknown || blocked || !state) return;
    lock.current = true; setBusy(true); onBusy?.(true); setError(""); setSuccess("");
    let committed = false;
    try {
      await executarOperacao(institution, context, command, body); committed = true;
      const next = await estadoOperacional(institution, context);
      if (!validState(next, institution, context)) throw Error("Invalid operational scope");
      if (alive.current) { setState(next); onState?.(next); setSuccess("Operação confirmada. Estado consultado novamente. Confira o resumo antes de continuar."); setAccount(""); setCaps([]); setTarget(""); setCap(""); setProfessional(""); setReason(""); setRevoke(""); }
    } catch (e) {
      if (alive.current) { setError(committed ? "Escrita confirmada, mas a consulta posterior falhou. Não repita a operação; atualize a consulta." : erroOperacional(e)); setState(null); if (!committed && (!e.response || e.response.status >= 500)) { setUnknown(true); onUncertain?.(); } }
    } finally { lock.current = false; onBusy?.(false); if (alive.current) setBusy(false); }
  }
  function navigate(next) {
    setStep(next); setSuccess(""); setReason(""); setCap(""); setTarget(""); setAccount(""); setCaps([]); setProfessional(""); setRevoke("");
    heading.current?.focus();
  }
  const actions = state?.acoes;
  const nominate = actions && (actions.bootstrap || actions.recovery_capacidades.length > 0);
  const grantCapability = step === 2 ? "CONTEXTO_ADMINISTRAR" : cap;
  const clinicalTargets = (state?.profissionais || []).filter(p => p.pode_receber_grant).filter((p, i, all) => all.findIndex(x => x.usuario_instituicao_acesso_id === p.usuario_instituicao_acesso_id) === i).map(p => ({id: p.usuario_instituicao_acesso_id, nome: p.profissional}));
  const targets = step === 2 ? state?.contas || [] : clinicalTargets;
  const grantAllowed = actions?.conceder_capacidades.includes(grantCapability);
  const clinicalCaps = (actions?.conceder_capacidades || []).filter(c => c !== "CONTEXTO_ADMINISTRAR");
  const canWrite = state && ((step === 1 && nominate && state.contas.length > 0) || (step === 2 && grantAllowed && targets.length > 0) || (step === 3 && actions.administrar_participacao && state.profissionais.length > 0) || (step === 4 && clinicalCaps.length > 0 && targets.length > 0) || (step === 5 && state.grants.some(g => g.pode_revogar)));
  return <>
    {!embedded && <nav className="setup-steps" aria-label="Etapas da configuração">{steps.map((name, i) => <button type="button" key={name} disabled={busy} aria-current={step === i ? "step" : undefined} onClick={() => navigate(i)}>{i + 1}. {name}</button>)}</nav>}
    <section className="setup-card" aria-busy={busy}>
      <h2 ref={heading} tabIndex={-1}>{steps[step]}</h2>
      <p><strong>{institutionName}</strong> · {contextLabel(selected)}</p>
      {error && <p role="alert">{error}</p>}{success && <p role="status">{success}</p>}
      {unknown && <p role="alert">Novas escritas bloqueadas nesta sessão até conferência administrativa do resultado indeterminado. A atualização consulta o estado, mas não libera uma repetição automática.</p>}
      {!state && !error && <p role="status">Consultando autorizações e estado...</p>}
      {state && <fieldset disabled={busy || unknown || blocked}>
        {step === 0 && <>
          <p>Quem executa: administrador da plataforma para preparar ou ativar a linha. As demais etapas indicam o responsável necessário.</p>
          <ul><li>Instituição e contexto disponíveis para a conta conectada.</li><li>Saúde Mental: {state.linha ? state.linha.ativo ? "ativa" : "inativa" : "não adicionada"}.</li><li>Delegação, administração de participações e acesso clínico são autorizações independentes.</li></ul>
          {!state.linha && <p>Um administrador precisa adicionar Saúde Mental na preparação do contexto em Pessoas. Nenhuma linha será criada automaticamente.</p>}
          {actions.ativar_linha && <Button onClick={() => write("saude-mental/ativar")}>Ativar Saúde Mental</Button>}
          {actions.desativar_linha && <Button variant="secondary" onClick={() => { if (window.confirm("Desativar Saúde Mental? As permissões existentes não serão revogadas.")) write("saude-mental/desativar"); }}>Desativar Saúde Mental</Button>}
          {state.linha && !actions.ativar_linha && !actions.desativar_linha && <p>Esta conta não pode alterar a linha neste estado. A ativação exige administrador, contexto aberto e linha disponível.</p>}
          <p>Para retomar depois, utilize este mesmo endereço e consulte o estado. A lista apresenta apenas os dados de contexto autorizados, sem expor dados clínicos.</p>
        </>}
        {canWrite && <label>Motivo da operação *<textarea aria-label="Motivo da operação *" value={reason} onChange={e => setReason(e.target.value)} /></label>}
        {step === 1 && <>
          <p>Quem executa: administrador da plataforma. Nomeie outra conta para delegar permissões; isso não concede acesso clínico nem administração de participações ao responsável.</p>
          {!nominate ? <p>A nomeação não está disponível para esta conta ou já existe responsável elegível. Consulte o resumo; se necessário, solicite a conferência ao administrador.</p> : !state.contas.length ? <p role="status">Nenhum candidato disponível. O responsável deve ser outra conta ativa, associada a uma Pessoa ativa e com acesso ativo nesta instituição. {embedded ? "Use a ação de resolver acesso institucional nesta etapa." : "Solicite ao administrador a preparação em Pessoas → Acesso à plataforma."}</p> : <>
            <label>Responsável por delegar permissões<select aria-label="Responsável por delegar permissões" value={account} onChange={e => setAccount(e.target.value)}><option value="">Selecione</option>{state.contas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select></label>
            <fieldset><legend>Permissões que poderá delegar</legend>{(actions.bootstrap ? Object.keys(labels) : actions.recovery_capacidades).map(c => <label className="setup-check" key={c}><input type="checkbox" checked={caps.includes(c)} onChange={e => setCaps(old => e.target.checked ? [...old, c] : old.filter(x => x !== c))} />{labels[c]}</label>)}</fieldset>
            <Button disabled={!account || !caps.length || !reason.trim()} onClick={() => write(`autoridades/${actions.bootstrap ? "bootstrap" : "recovery"}`, {usuario_instituicao_acesso_id:Number(account), capacidades:caps, motivo:reason})}>{actions.bootstrap ? "Nomear responsável" : "Restabelecer responsável"}</Button>
          </>}
        </>}
        {(step === 2 || step === 4) && <>
          <p>Quem executa: responsável autorizado a delegar a permissão selecionada, utilizando sua própria conta. Não é permitido conceder permissão à própria conta.</p>
          {step === 2 && <p>Escolha quem poderá estabelecer participações profissionais. Esta permissão não concede acesso clínico.</p>}
          {step === 4 && <p>Conceda somente as permissões necessárias ao atendimento. A participação profissional é preparada separadamente.</p>}
          {(step === 2 ? !grantAllowed : !clinicalCaps.length) ? <p>Esta conta não está autorizada a delegar estas permissões. O responsável nomeado deve acessar este contexto com sua própria conta para continuar.</p> : !targets.length ? <p role="status">Nenhum destinatário elegível disponível. {step === 2 ? "É necessária outra conta ativa com Pessoa e acesso institucional ativos." : "O profissional precisa de conta e Pessoa ativas, acesso institucional e vínculo profissional vigente; a própria conta não pode receber a concessão."}</p> : <>
            {step === 4 && <label>Permissão de atendimento<select aria-label="Permissão de atendimento" value={cap} onChange={e => { setCap(e.target.value); setTarget(""); }}><option value="">Selecione</option>{clinicalCaps.map(c => <option key={c} value={c}>{labels[c]}</option>)}</select></label>}
            <label>Destinatário<select aria-label="Destinatário" value={target} onChange={e => setTarget(e.target.value)}><option value="">Selecione</option>{targets.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></label>
            <Button disabled={!target || !grantAllowed || !reason.trim()} onClick={() => write("grants", {usuario_instituicao_acesso_id:Number(target), capacidade:grantCapability, motivo:reason})}>Conceder permissão</Button>
          </>}
        </>}
        {step === 3 && <>
          <p>Quem executa: conta com permissão para administrar participações neste contexto. O período deve estar contido no vínculo profissional vigente, sem sobreposição com participação existente.</p>
          {!actions.administrar_participacao ? <p>Esta conta não possui permissão para administrar participações. Solicite a concessão ao responsável por delegar ou continue com a conta já autorizada.</p> : !state.profissionais.length ? <p role="status">Nenhum profissional elegível disponível. Solicite ao administrador a conferência da Pessoa, conta, acesso institucional e vínculo profissional vigente.</p> : <>
            <label>Profissional com vínculo vigente<select aria-label="Profissional com vínculo vigente" value={professional} onChange={e => setProfessional(e.target.value)}><option value="">Selecione</option>{state.profissionais.map(p => <option key={p.id} value={p.id}>{p.profissional} · {date(p.data_inicio)} → {date(p.data_fim)}</option>)}</select></label>
            <div className="setup-grid"><label>Início da participação<input type="date" value={start} onChange={e => setStart(e.target.value)} /></label><label>Término da participação (opcional)<input type="date" min={start} value={end} onChange={e => setEnd(e.target.value)} /></label></div>
            <Button disabled={!professional || !start || !reason.trim() || !!(end && end < start)} onClick={() => write("participacoes", {profissional_instituicao_id:Number(professional), data_inicio:start, data_fim:end || null, motivo:reason})}>Estabelecer participação</Button>
          </>}
        </>}
        {step === 5 && <>
          <p>Este resumo é uma consulta, não uma etapa de preenchimento. Um registro não revogado não garante acesso: os demais requisitos são verificados pelo backend a cada operação.</p>
          <h3>Responsáveis por delegar</h3>{!state.autoridades.length && <p>Nenhum responsável registrado para este contexto.</p>}{state.autoridades.map(a => <p key={a.id}>{a.nome || "Nome indisponível"} · {labels[a.capacidade_delegavel]} · {a.revogado_em ? "Revogada" : "Não revogada"}</p>)}
          <h3>Participações</h3>{!state.participacoes.length && <p>Nenhuma participação registrada.</p>}{state.participacoes.map(p => <p key={p.id}>{state.profissionais.find(x => x.id === p.profissional_instituicao_id)?.profissional || "Vínculo profissional registrado"} · {date(p.data_inicio)} → {date(p.data_fim)} · {p.invalidado_em ? "Invalidada" : p.encerrado_em ? "Encerrada" : "Não encerrada"} <small>(referência {p.id})</small></p>)}
          <h3>Permissões concedidas</h3>{!state.grants.length && <p>Nenhuma permissão concedida neste contexto.</p>}{state.grants.map(g => <p key={g.id}>{g.nome || "Nome indisponível"} · {labels[g.capacidade]} · {g.revogado_em ? "Revogada" : "Não revogada"}</p>)}
          {state.grants.some(g => g.pode_revogar) && <><label>Permissão a revogar<select aria-label="Permissão a revogar" value={revoke} onChange={e => setRevoke(e.target.value)}><option value="">Selecione, se necessário</option>{state.grants.filter(g => g.pode_revogar).map(g => <option key={g.id} value={g.id}>{g.nome || "Nome indisponível"} · {labels[g.capacidade]}</option>)}</select></label><Button variant="danger" disabled={!revoke || !reason.trim()} onClick={() => { if (window.confirm("Revogar esta permissão neste contexto?")) write(`grants/${revoke}/revogar`, {motivo:reason}); }}>Revogar permissão</Button></>}
        </>}
      </fieldset>}
      {busy && <p role="status">Executando operação explícita...</p>}
      <footer className="setup-footer"><Button variant="secondary" disabled={busy} onClick={() => { setState(null); setRetry(n => n + 1); setSuccess(""); }}>Atualizar estado</Button>{!embedded && <><Button variant="secondary" disabled={busy || step === 0} onClick={() => navigate(step - 1)}>Anterior</Button><Button disabled={busy || step === steps.length - 1} onClick={() => navigate(step + 1)}>Próxima etapa</Button></>}</footer>
    </section>
  </>;
}
