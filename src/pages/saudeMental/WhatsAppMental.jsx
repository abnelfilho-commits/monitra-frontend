import { useEffect, useId, useRef, useState } from "react";
import "./WhatsAppMental.css";
import Button from "../../components/ui/Button";
import { consultarWhatsAppMental, solicitarWhatsAppMental } from "../../services/saudeMental";
import { displayTimestamp } from "./bemEstarPresentation";

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
  const disabled = loading || busy || !snapshot || Boolean(reason) || Boolean(pending) || refused;
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
    {snapshot && (a ? <dl className="mental-whatsapp-dialog__details">
      <div><dt>Status do acompanhamento</dt><dd>{label(a.status)}</dd></div>
      <div><dt>Consentimento</dt><dd>{label(a.consentimento_status)}</dd></div>
      <div><dt>Telefone</dt><dd>{maskedPhone(a.telefone)}</dd></div>
      <div><dt>Autorização de comunicação</dt><dd>{label(snapshot.autorizacao.estado)}</dd></div>
      <div><dt>Comunicação</dt><dd>{label(snapshot.comunicacao.estado)}{snapshot.comunicacao.bloqueio_preventivo && " · Bloqueio preventivo"}</dd></div>
      <div><dt>Frequência configurada</dt><dd>{label(a.frequencia)}</dd></div>
      <div><dt>Próximo envio previsto</dt><dd>{a.proximo_envio_em ? displayTimestamp(a.proximo_envio_em) : "Não definido"}</dd></div>
      <div><dt>Conversa atual ou mais recente</dt><dd>{current ? label(current.estado_assistencial) : "Nenhuma conversa registrada"}</dd></div>
    </dl> : <p>Acompanhamento WhatsApp não configurado.</p>)}
    <p>O check-in extraordinário não altera a programação semanal.</p>
    {current && <p>{attemptMessage(lastAttempt)}</p>}
    {reason && a && <p>{reason}</p>}
    {pending && <p role="alert">Há uma solicitação aguardando confirmação. Novas solicitações estão bloqueadas; consulte o estado ou solicite verificação.</p>}
    {message && <p role="status">{message}</p>}
    {refused && <p>Novas solicitações bloqueadas nesta consulta. Após verificar o impedimento, atualize o prontuário.</p>}
    </div>
    <footer className="mental-whatsapp-dialog__footer">
      <Button variant="secondary" onClick={onClose}>Fechar</Button>
      <Button disabled={disabled} onClick={() => setConfirming(true)}>Solicitar check-in</Button>
      <Button variant="secondary" disabled={loading || busy} onClick={() => void load()}>Atualizar WhatsApp</Button>
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
