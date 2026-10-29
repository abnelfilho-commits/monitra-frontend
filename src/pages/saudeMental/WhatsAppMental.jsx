import { useEffect, useId, useRef, useState } from "react";
import "./WhatsAppMental.css";
import Button from "../../components/ui/Button";
import { consultarWhatsAppMental, solicitarWhatsAppMental, salvarProgramacaoWhatsAppMental } from "../../services/saudeMental";
const weekdays = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
const civilTime = value => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(value);
const hasScheduleContract = a => a && typeof a.programacao_ativa === "boolean"
  && ((a.dia_semana === null && a.horario_local === null && !a.programacao_ativa)
    || (Number.isInteger(a.dia_semana) && a.dia_semana >= 0 && a.dia_semana <= 6 && civilTime(a.horario_local)));
const scheduleDraft = a => ({ day: a?.dia_semana == null ? "" : String(a.dia_semana), time: a?.horario_local?.slice(0, 5) || "", active: a?.programacao_ativa === true });
const nextDate = value => value && !Number.isNaN(Date.parse(value))
  ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Cuiaba", dateStyle: "short", timeStyle: "short" }).format(new Date(value))
  : "Não definido";

const openStates = ["AGUARDANDO_ACEITE", "EM_ANDAMENTO"];
const pendingStates = ["PREPARADO", "EM_EXECUCAO", "INCERTO"];
const labels = { ATIVO: "Ativo", PAUSADO: "Pausado", ENCERRADO: "Encerrado", PENDENTE: "Pendente", CONSENTIDO: "Consentido", REVOGADO: "Revogado", AUTORIZADA: "Autorizada", REVOGADA: "Revogada", AUSENTE: "Ausente", DESTINO_DIVERGENTE: "Destino divergente", SEMANAL: "Semanal", SEM_INTERRUPCAO_REGISTRADA: "Sem interrupção registrada", WHATSAPP_INTERROMPIDO: "Interrompida", AGUARDANDO_ACEITE: "Aguardando aceite", EM_ANDAMENTO: "Em andamento", CONCLUIDA: "Concluída", CANCELADA: "Cancelada", EXPIRADA: "Expirada" };
const label = value => labels[value] || "Indisponível";
const maskedPhone = phone => /^\d{8,15}$/.test(phone || "") ? `•••• •••• ${phone.slice(-4)}` : "Indisponível";
const attemptMessage = attempt => {
  if (!attempt) return "Entrega sem confirmação disponível.";
  if (attempt.evidencia_contraditoria) return "Evidências de entrega divergentes. Solicite verificação antes de repetir.";
  if (attempt.entrega_confirmada === true) return "Convite entregue (confirmação recebida).";
  if (attempt.falha_informada === true) return "Falha de entrega informada pela Meta.";
  if (attempt.estado === "REJEITADO") return "Convite rejeitado pela Meta.";
  if (attempt.estado === "ACEITO") return "Convite aceito pela Meta; entrega ainda não confirmada.";
  return "Resultado não confirmado. Não repita a solicitação; consulte o estado ou solicite verificação.";
};
function validSnapshot(data, jornada) {
  const { acompanhamento: a, autorizacao: auth, comunicacao: comm, diagnostico: diag } = data;
  if (!auth || !comm || !Array.isArray(diag?.conversas)) return false;
  const identity = a?.id ?? null;
  return (a === null || (Number.isInteger(a?.id) && a.contexto_assistencial_id === jornada.contexto_assistencial_id && a.paciente_id === jornada.paciente_id))
    && [auth, comm, diag].every(item => item.acompanhamento_id === identity)
    && diag.conversas.every(c => Number.isInteger(c.conversa_id) && Array.isArray(c.tentativas)
      && [...openStates, "CONCLUIDA", "CANCELADA", "EXPIRADA"].includes(c.estado_assistencial)
      && c.tentativas.every(t => [...pendingStates, "ACEITO", "REJEITADO"].includes(t.estado)));
}
function impediment(data, canWrite) {
  if (!canWrite) return "Solicitação não autorizada para registro neste contexto.";
  const { acompanhamento: a, autorizacao: auth, comunicacao: comm, diagnostico: diag } = data;
  if (!a) return "Acompanhamento WhatsApp não configurado.";
  if (a.status !== "ATIVO") return "O acompanhamento não está ativo.";
  if (!["PENDENTE", "CONSENTIDO"].includes(a.consentimento_status)) return "Consentimento revogado ou indisponível.";
  if (auth.estado !== "AUTORIZADA") return "Autorização de comunicação indisponível para este destino.";
  if (comm.estado !== "SEM_INTERRUPCAO_REGISTRADA" || comm.interrompido_pela_pessoa !== false || comm.bloqueio_preventivo !== false) return "Comunicação interrompida, bloqueada ou indisponível.";
  if (!/^\d{8,15}$/.test(a.telefone || "")) return "Telefone indisponível.";
  if (diag.conversas.some(c => c.tentativas.some(t => pendingStates.includes(t.estado) || t.evidencia_contraditoria))) return "Há envio pendente ou incerto. Solicite verificação antes de repetir.";
  if (diag.conversas.some(c => openStates.includes(c.estado_assistencial))) return "Já existe uma conversa aberta. Aguarde sua conclusão ou regularização.";
  return "";
}
function readPending(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.key === "string" ? parsed : { key: "unknown" };
  } catch { return { key: "unknown" }; }
}

// Remount even when used outside the keyed Prontuário. No state crosses scopes.
export default function WhatsAppMental({ jornada }) {
  const scope = `${jornada.instituicao_id}:${jornada.pessoa_id}:${jornada.contexto_assistencial_id}`;
  return <WhatsAppLauncher key={scope} jornada={jornada} storageKey={`mental-whatsapp-pending:${scope}`} />;
}
function WhatsAppLauncher({ jornada, storageKey }) {
  const [opened, setOpened] = useState(false);
  const trigger = useRef(null);
  return <>
    <Button ref={trigger} variant="secondary" aria-haspopup="dialog" onClick={() => setOpened(true)}>Check-in via WhatsApp</Button>
    {opened && <WhatsAppScope jornada={jornada} storageKey={storageKey} onClose={() => setOpened(false)} trigger={trigger} />}
  </>;
}
function WhatsAppScope({ jornada, storageKey, onClose, trigger }) {
  const { instituicao_id: institution, pessoa_id: person, contexto_assistencial_id: context } = jornada;
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refused, setRefused] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(scheduleDraft(null));
  const [saving, setSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [scheduleUncertain, setScheduleUncertain] = useState(false);
  const saveLock = useRef(false);
  const [pending, setPending] = useState(() => readPending(storageKey));
  const mounted = useRef(false), sending = useRef(false), reader = useRef(null), dialog = useRef(null);
  const titleId = useId();
  const modal = useRef(null), heading = useRef(null);
  const canWrite = jornada.bem_estar?.pode_registrar === true && jornada.linha_estado === "ATIVA" && jornada.contexto_estado === "ABERTO";

  async function load() {
    reader.current?.abort();
    const controller = new AbortController();
    reader.current = controller;
    setLoading(true); setError(""); setSnapshot(null);
    try {
      const data = await consultarWhatsAppMental(institution, person, context, controller.signal);
      if (!mounted.current || controller.signal.aborted) return;
      if (!validSnapshot(data, jornada)) throw new Error("INVALID_RESPONSE");
      setSnapshot(data);
      setDraft(scheduleDraft(data.acompanhamento));
      setScheduleUncertain(false); setScheduleError(""); setScheduleMessage("");
      // Resolve only the exact attempt returned by our POST, never a nearby conversation.
      const saved = readPending(storageKey);
      const conversation = data.diagnostico.conversas.find(c => c.conversa_id === saved?.conversationId);
      const attempt = conversation?.tentativas.find(t => t.id === saved?.attemptId);
      if (attempt && ["ACEITO", "REJEITADO"].includes(attempt.estado) && !attempt.evidencia_contraditoria) {
        sessionStorage.removeItem(storageKey);
        setPending(null);
        setMessage(attemptMessage(attempt));
      }
    } catch (e) {
      if (!mounted.current || controller.signal.aborted) return;
      setSnapshot(null);
      setError(({ 401: "Sua sessão expirou. Entre novamente.", 403: "Consulta WhatsApp não autorizada neste contexto." })[e?.response?.status] || "Não foi possível confirmar o estado do WhatsApp. Atualize a consulta antes de solicitar.");
    } finally {
      if (mounted.current && !controller.signal.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    const node = modal.current, returnFocus = trigger.current;
    const previousOverflow = document.body.style.overflow;
    node.showModal();
    heading.current.focus();
    document.body.style.overflow = "hidden";
    void load();
    return () => {
      mounted.current = false; reader.current?.abort();
      node.close(); document.body.style.overflow = previousOverflow;
      returnFocus?.focus();
    };
    // This component is remounted for every institution/person/context change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!confirming) return;
    const node = dialog.current;
    node.showModal();
    return () => node.close();
  }, [confirming]);

  const reason = snapshot ? impediment(snapshot, canWrite) : "";
  const disabled = loading || busy || saving || !snapshot || Boolean(reason) || Boolean(pending) || refused;
  async function send() {
    if (sending.current || disabled || !confirming) return;
    const existing = readPending(storageKey);
    if (existing) { setPending(existing); setConfirming(false); return; }
    sending.current = true;
    setBusy(true); setConfirming(false); setMessage("");
    let marker;
    try {
      marker = { key: crypto.randomUUID() };
      // Survives refresh/navigation; an unknown outcome never creates a replacement request.
      sessionStorage.setItem(storageKey, JSON.stringify(marker));
      setPending(marker);
    } catch {
      setError("Não foi possível proteger a solicitação contra repetição. Nenhum envio foi solicitado.");
      sending.current = false; setBusy(false); return;
    }
    try {
      const result = await solicitarWhatsAppMental(institution, person, context, marker.key);
      const valid = Number.isInteger(result?.solicitacao_id) && Number.isInteger(result?.conversa_id)
        && (result.tentativa_id === null || Number.isInteger(result.tentativa_id))
        && [...pendingStates, "ACEITO", "REJEITADO"].includes(result.estado)
        && result.aceitacao_meta === (result.estado === "ACEITO");
      if (!valid) throw new Error("INVALID_RESPONSE");
      marker = { ...marker, conversationId: result.conversa_id, attemptId: result.tentativa_id };
      sessionStorage.setItem(storageKey, JSON.stringify(marker));
      if (mounted.current) { setPending(marker); setMessage(attemptMessage(result)); }
    } catch (e) {
      // These HTTP responses confirm rejection before dispatch; all other failures stay uncertain.
      if ([401, 403, 409, 422].includes(e?.response?.status)) {
        sessionStorage.removeItem(storageKey);
        if (mounted.current) {
          setPending(null);
          setRefused(true);
          setMessage([401, 403].includes(e.response.status) ? "Solicitação não autorizada. Atualize o acesso antes de tentar novamente." : "Solicitação recusada por validação ou impedimento. Consulte o estado atualizado.");
        }
      } else if (mounted.current) setMessage("Resultado não confirmado. Não repita a solicitação; solicite verificação.");
    } finally {
      if (mounted.current) { await load(); setBusy(false); }
      sending.current = false;
    }
  }
  const a = snapshot?.acompanhamento;
  const scheduleAvailable = hasScheduleContract(a);
  const scheduleAllowed = canWrite && scheduleAvailable && ["ATIVO", "PAUSADO"].includes(a.status)
    && ["PENDENTE", "CONSENTIDO"].includes(a.consentimento_status);
  const scheduleDisabled = loading || busy || saving || confirming || !scheduleAllowed || scheduleUncertain;
  async function saveSchedule(event) {
    event.preventDefault();
    if (saveLock.current || scheduleDisabled) return;
    if (!/^[0-6]$/.test(draft.day) || !civilTime(draft.time)) {
      setScheduleError("Selecione o dia e um horário válido (HH:mm)."); return;
    }
    const payload = { dia_semana: Number(draft.day), horario_local: draft.time, programacao_ativa: draft.active };
    saveLock.current = true; setSaving(true); setScheduleError(""); setScheduleMessage("");
    try {
      const saved = await salvarProgramacaoWhatsAppMental(institution, person, context, payload);
      if (!mounted.current) return;
      if (!hasScheduleContract(saved) || saved.id !== a.id || saved.contexto_assistencial_id !== context
        || saved.paciente_id !== jornada.paciente_id || saved.dia_semana !== payload.dia_semana
        || saved.horario_local.slice(0, 5) !== payload.horario_local || saved.programacao_ativa !== payload.programacao_ativa) throw new Error("INVALID_RESPONSE");
      setSnapshot(previous => ({ ...previous, acompanhamento: saved }));
      setDraft(scheduleDraft(saved));
      setScheduleMessage(saved.programacao_ativa ? "Preferência semanal atualizada." : "Programação semanal pausada. Dia e horário preservados.");
    } catch (e) {
      if (!mounted.current) return;
      const status = e?.response?.status;
      setScheduleError(({ 401: "Sua sessão expirou. Entre novamente.", 403: "Alteração da programação não autorizada neste contexto.",
        409: "Programação recusada. Atualize o acompanhamento e verifique os impedimentos.", 422: "Revise o dia e o horário da programação." })[status]
        || "Não foi possível confirmar o salvamento. Atualize o WhatsApp antes de tentar novamente.");
      if (![401, 403, 409, 422].includes(status)) setScheduleUncertain(true);
    } finally {
      saveLock.current = false;
      if (mounted.current) setSaving(false);
    }
  }
  const conversations = snapshot?.diagnostico.conversas || [];
  const current = [...conversations].sort((a, b) => b.conversa_id - a.conversa_id).find(c => openStates.includes(c.estado_assistencial))
    || [...conversations].sort((a, b) => b.conversa_id - a.conversa_id)[0];
  const lastAttempt = [...(current?.tentativas || [])].sort((a, b) => b.tentativa - a.tentativa)[0];
  return <dialog ref={modal} className="mental-whatsapp-dialog mental-whatsapp-dialog--overview" aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onClose(); }}>
    <header className="mental-whatsapp-dialog__header">
    <h2 ref={heading} tabIndex={-1} id={titleId}>Check-in via WhatsApp</h2>
    <p>Pessoa: <strong>{jornada.nome_social || jornada.nome_completo}</strong></p>
    <p>Instituição: {jornada.instituicao_nome} · Contexto assistencial #{context}</p>
    </header>
    <div className="mental-whatsapp-dialog__body" aria-busy={loading}>
    {loading && <p role="status">Consultando acompanhamento WhatsApp…</p>}
    {error && <p role="alert">{error}</p>}
    <section aria-labelledby={`${titleId}-weekly`}>
    <h3 id={`${titleId}-weekly`}>Programação semanal</h3>
    {a && !scheduleAvailable && <p>Configuração semanal indisponível neste ambiente.</p>}
    {snapshot && !a && <p>Acompanhamento WhatsApp não configurado.</p>}
    <form id={`${titleId}-schedule`} onSubmit={saveSchedule} aria-busy={saving}>
      <fieldset disabled={scheduleDisabled} className="mental-whatsapp-schedule">
        <legend className="mental-whatsapp-schedule__legend">Preferência semanal — horário de Cuiabá</legend>
        <label htmlFor={`${titleId}-day`}>Dia da semana
          <select id={`${titleId}-day`} required value={draft.day} onChange={e => setDraft({ ...draft, day: e.target.value })}>
            <option value="">Selecione</option>
            {weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}
          </select>
        </label>
        <label htmlFor={`${titleId}-time`}>Horário (Cuiabá)
          <input id={`${titleId}-time`} type="time" step="60" required value={draft.time} onChange={e => setDraft({ ...draft, time: e.target.value })} />
        </label>
        <label className="mental-whatsapp-schedule__toggle"><input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} /> Programação semanal ativa</label>
      </fieldset>
    </form>
    <p>Próximo envio previsto (Cuiabá): <strong>{nextDate(a?.proximo_envio_em)}</strong></p>
    {scheduleAvailable && <p>{a.dia_semana !== null ? "Programação salva. Execução automática ainda não ativada." : "Execução automática ainda não ativada."}</p>}
    {scheduleAvailable && !canWrite && <p>Alteração da programação não autorizada neste contexto.</p>}
    {scheduleError && <p role="alert">{scheduleError}</p>}
    {scheduleMessage && <p role="status">{scheduleMessage}</p>}
    </section>
    <section aria-labelledby={`${titleId}-extra`}>
    <h3 id={`${titleId}-extra`}>Check-in extraordinário</h3>
    {snapshot && (a ? <dl className="mental-whatsapp-dialog__details">
      <div><dt>Status do acompanhamento</dt><dd>{label(a.status)}</dd></div>
      <div><dt>Consentimento</dt><dd>{label(a.consentimento_status)}</dd></div>
      <div><dt>Telefone</dt><dd>{maskedPhone(a.telefone)}</dd></div>
      <div><dt>Autorização de comunicação</dt><dd>{label(snapshot.autorizacao.estado)}</dd></div>
      <div><dt>Comunicação</dt><dd>{label(snapshot.comunicacao.estado)}{snapshot.comunicacao.bloqueio_preventivo && " · Bloqueio preventivo"}</dd></div>
      <div><dt>Frequência configurada</dt><dd>{label(a.frequencia)}</dd></div>
      <div><dt>Conversa atual ou mais recente</dt><dd>{current ? label(current.estado_assistencial) : "Nenhuma conversa registrada"}</dd></div>
    </dl> : <p>Acompanhamento WhatsApp não configurado.</p>)}
    <p>O check-in extraordinário não altera a programação semanal.</p>
    {current && <p>{attemptMessage(lastAttempt)}</p>}
    {reason && a && <p>{reason}</p>}
    {pending && <p role="alert">Há uma solicitação aguardando confirmação. Novas solicitações estão bloqueadas; consulte o estado ou solicite verificação.</p>}
    {message && <p role="status">{message}</p>}
    {refused && <p>Novas solicitações bloqueadas nesta consulta. Após verificar o impedimento, atualize o prontuário.</p>}
    </section>
    </div>
    <footer className="mental-whatsapp-dialog__footer">
      <Button variant="secondary" onClick={onClose}>Fechar</Button>
      <Button type="submit" form={`${titleId}-schedule`} disabled={scheduleDisabled}>{saving ? "Salvando…" : "Salvar programação"}</Button>
      <Button disabled={disabled} onClick={() => setConfirming(true)}>Solicitar check-in</Button>
      <Button variant="secondary" disabled={loading || busy || saving} onClick={() => void load()}>Atualizar WhatsApp</Button>
    </footer>
    <dialog ref={dialog} aria-label="Confirmar solicitação de check-in" onCancel={e => { e.preventDefault(); e.stopPropagation(); setConfirming(false); }} className="mental-whatsapp-dialog">
      {confirming && <>
        <h3>Solicitar Check-in de Bem-Estar?</h3>
        <p>Pessoa: {jornada.nome_social || jornada.nome_completo}</p>
        <p>Instituição: {jornada.instituicao_nome} · Contexto #{context}</p>
        <p>WhatsApp: {maskedPhone(a?.telefone)}</p>
        <p>Será solicitado um convite extraordinário, sem alterar a programação semanal.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="secondary" onClick={() => setConfirming(false)}>Cancelar</Button>
          <Button disabled={disabled} onClick={() => void send()}>Confirmar solicitação</Button>
        </div>
      </>}
    </dialog>
  </dialog>;
}
