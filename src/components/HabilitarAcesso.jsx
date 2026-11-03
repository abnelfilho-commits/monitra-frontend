import { Fragment, useEffect, useRef, useState } from "react";
import Button from "./ui/Button";
import PessoaArea from "./pessoas/PessoaArea";
import usePessoaDraft from "./pessoas/usePessoaDraft";
import { listarInstituicoes } from "../services/instituicoes";
import { habilitarAcesso, obterAcessosPessoa } from "../services/pessoas";

const input = { display: "block", width: "100%", boxSizing: "border-box", padding: 10, margin: "6px 0 16px" };
const errors = {
  EMAIL_CONFLICT: "E-mail já utilizado por outra identidade. Nenhuma associação foi alterada.",
  PERSON_EMAIL_CONFLICT: "Esta Pessoa já possui conta com outro e-mail. Nenhuma substituição foi realizada.",
  ACCESS_CONFLICT: "Já existe autorização com outro perfil ou estado. Utilize a operação administrativa explícita correspondente.",
  ACCOUNT_CONFLICT: "Conflito de identidade. Consulte o estado antes de continuar.",
  PERSON_INACTIVE: "Pessoa inativa. Regularize o cadastro antes de habilitar acesso.",
  USER_INACTIVE: "A conta existente está inativa. Este fluxo não reativa contas.",
  INSTITUTION_INACTIVE: "Instituição inativa.",
};
export default function HabilitarAcesso({ person, onDirty, onBusy, institutionId, onUncertain, blocked = false, profileValue, embedded = false }) {
  const [open, setOpen] = useState(false), [institutions, setInstitutions] = useState(null);
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [institution, setInstitution] = useState(""), [profile, setProfile] = useState("");
  const [active, setActive] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [result, setResult] = useState(null), [unknown, setUnknown] = useState(false);
  const [revision, refresh] = useState(0), [readError, setReadError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const markSaved = usePessoaDraft("acesso", [email, institution, profile, active], onDirty);
  useEffect(() => { onDirty?.("senha-acesso", !!password); return () => onDirty?.("senha-acesso", false); }, [password, onDirty]);
  const lock = useRef(false);
  useEffect(() => {
    let current = true;
    obterAcessosPessoa(person.id).then(data => {
      if (data.pessoa_id !== person.id || !Array.isArray(data.autorizacoes) || !("usuario" in data)) throw Error("Invalid access response");
      if (current) { setResult(data); setReadError(""); }
    }).catch(() => { if (current) setReadError("Não foi possível consultar o acesso persistido. Nenhuma ausência de conta foi confirmada."); });
    return () => { current = false; };
  }, [person.id, revision]);
  useEffect(() => {
    if (!open) return;
    let current = true;
    listarInstituicoes().then(rows => { if (current) setInstitutions(rows); })
      .catch(() => { if (current) setError("Não foi possível consultar instituições. Feche e tente novamente."); });
    return () => { current = false; };
  }, [open]);
  async function submit(e) {
    e.preventDefault();
    if (lock.current || unknown || blocked || (institutionId && result?.autorizacoes.some(a => a.instituicao_id === institutionId)) || !result || readError || result.pessoa_id !== person.id || (confirmed && !result.usuario) || !person.ativo || result.usuario?.ativo === false || !institution || !profile || !password.trim()) return;
    lock.current = true; setBusy(true); onBusy?.(true); setError("");
    let written = false;
    try {
      const payload = { email: result.usuario?.email || email, senha_inicial: password, instituicao_id: Number(institution), perfil_institucional: profile, ativo: active };
      const response = await habilitarAcesso(person.id, payload);
      written = true;
      markSaved(); setOpen(false); setConfirmed(false); setResult(null);
      const data = await obterAcessosPessoa(person.id);
      const usuarioId = result.usuario?.id ?? response?.usuario_id;
      if (data.pessoa_id !== person.id || !data.usuario || data.usuario.email !== payload.email || (usuarioId != null && data.usuario.id !== usuarioId) || !Array.isArray(data.autorizacoes) || !data.autorizacoes.some(a => a.instituicao_id === payload.instituicao_id && a.perfil_institucional === profile && a.ativo === active)) throw Error("Unconfirmed access");
      setResult(data); setReadError(""); setConfirmed(true);
    } catch (e) {
      const status = e?.response?.status;
      setError(errors[e?.response?.data?.detail?.code] || ({401: "Sessão expirada.",403: "Operação exclusiva do ADMIN global.",404: "Pessoa ou instituição não encontrada.",409: "Conflito: nenhuma sobrescrita foi realizada.",422: "Confira e-mail, senha (até 72 bytes), instituição e perfil."}[status]) || "Resultado não confirmado. Solicite conferência antes de repetir.");
      if (written || !status || status >= 500) { setUnknown(true); setReadError("Resultado não confirmado. Solicite conferência administrativa antes de repetir."); onUncertain?.(); }
    } finally { setPassword(""); setBusy(false); onBusy?.(false); lock.current = false; }
  }
  const Area = embedded ? Fragment : PessoaArea;
  const scopedAccess = institutionId && result?.autorizacoes.find(a => a.instituicao_id === institutionId);
  const areaProps = embedded ? {} : { title: "Acesso à plataforma", summary: readError ? "Não foi possível confirmar o acesso." : !result ? "Consultando acesso…" : result.usuario ? `Conta ${result.usuario.ativo ? "ativa" : "inativa"} · ${result.autorizacoes.length} autorização(ões) institucional(is).` : "Nenhuma conta associada." };
  return <Area {...areaProps}>
    <p>Possuir acesso à plataforma não concede autoridade, participação ou acesso clínico. O perfil institucional não concede permissões clínicas.</p>
    {readError && <p role="alert">{readError}</p>}
    {unknown && <p role="alert">Novas tentativas bloqueadas até conferência administrativa. Atualizar acesso não repete a solicitação.</p>}
    {!result && !readError && <p role="status">Consultando acesso persistido...</p>}
    <Button variant="secondary" disabled={busy} onClick={() => { setOpen(false); setPassword(""); setResult(null); setReadError(""); refresh(n => n + 1); }}>Atualizar acesso</Button>
    {result && !readError && <Button disabled={!person.ativo || result.usuario?.ativo === false || (confirmed && !result.usuario) || busy || unknown || blocked || !!scopedAccess} variant="secondary" onClick={() => { setOpen(!open); setEmail(result.usuario?.email || ""); setInstitution(institutionId ? String(institutionId) : ""); setProfile(profileValue || ""); setActive(false); setPassword(""); setError(""); setConfirmed(false); }}> {open ? "Fechar acesso" : result.usuario ? "Habilitar em outra instituição" : "Habilitar acesso"}</Button>}
    {scopedAccess && <p role="status">Acesso existente nesta instituição: {scopedAccess.perfil_institucional} — {scopedAccess.ativo ? "ativo" : "inativo"}. Nenhuma nova habilitação será criada. Alteração de perfil ou reativação exige operação administrativa própria.</p>}
    {result?.usuario?.ativo === false && <p>Conta inativa. Solicite a regularização ao administrador; esta ação não reativa contas.</p>}
    {!person.ativo && <p>Pessoa inativa: habilitação indisponível.</p>}
    {open && result && !readError && <form onSubmit={submit}>
      <p>{person.nome_completo} — Pessoa #{person.id} — {person.ativo ? "Ativa" : "Inativa"}</p>
      <p>A senha inicial é usada somente para uma nova conta. Uma conta compatível será reutilizada sem troca de senha. O estado abaixo refere-se à autorização nesta instituição.</p>
      {error && <p role="alert">{error}</p>}
      {!institutions && !error && <p role="status">Carregando instituições...</p>}
      <fieldset disabled={busy || unknown || blocked || !person.ativo || !institutions} style={{ border: 0, padding: 0, minWidth: 0 }}>
        <label>E-mail de acesso<input style={input} type="email" required readOnly={!!result.usuario} autoComplete="off" value={result.usuario?.email || email} onChange={e => setEmail(e.target.value)} /></label>
        {result.usuario && <p id="existing-account-password">A conta e o e-mail serão preservados. Este formulário exige uma senha inicial, mas ela não será utilizada nem alterará a senha da conta existente. Não informe sua senha atual.</p>}
        <label>Senha inicial<input aria-describedby={result.usuario ? "existing-account-password" : undefined} style={input} type="password" required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label>Instituição do acesso<select disabled={!!institutionId} aria-label="Instituição do acesso" style={input} required value={institution} onChange={e => setInstitution(e.target.value)}><option value="">Selecione explicitamente</option>{institutions?.map(i => <option key={i.id} value={i.id} disabled={!i.ativo || result.autorizacoes.some(a => a.instituicao_id === i.id)}>{i.nome_fantasia || i.razao_social}{result.autorizacoes.some(a => a.instituicao_id === i.id) ? " — acesso já registrado" : ""}</option>)}</select></label>
        <label>Perfil institucional<select disabled={!!profileValue} aria-label="Perfil institucional" style={input} required value={profile} onChange={e => setProfile(e.target.value)}><option value="">Selecione explicitamente</option>{["GESTOR","PROFISSIONAL","SUPORTE"].map(p => <option key={p}>{p}</option>)}</select></label>
        <label><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Autorização institucional ativa</label>
        <Button type="submit">Confirmar habilitação</Button>
      </fieldset>
      {busy && <p role="status">Habilitando acesso...</p>}

    </form>}
    {result && !readError && result.usuario && <div>
      <dl>
        <dt>Conta</dt><dd>{result.usuario.email}</dd>
        <dt>Status da conta</dt><dd>{result.usuario.ativo ? "Ativa" : "Inativa"}</dd>
      </dl>
      <h3>Autorizações institucionais</h3>
      {!(institutionId ? scopedAccess : result.autorizacoes.length) && <p>Nenhuma autorização institucional registrada.</p>}
      {result.autorizacoes.filter(a => !institutionId || a.instituicao_id === institutionId).map(a => <div key={a.id} style={{ borderTop: "1px solid #e5e7eb", padding: "12px 0" }}>
        <strong>{a.instituicao_nome}</strong>{!a.instituicao_ativa && <span> · Instituição inativa</span>}
        <p>Perfil: {a.perfil_institucional} · Autorização: {a.ativo ? "Ativa" : "Inativa"}</p>
      </div>)}
      {confirmed && <p role="status">Acesso institucional habilitado e consultado. Nenhuma autorização clínica foi concedida.</p>}
    </div>}
    {result && !result.usuario && confirmed && <p role="alert">A conta não foi encontrada na reconsulta. Solicite conferência administrativa antes de repetir.</p>}
  </Area>;
}
