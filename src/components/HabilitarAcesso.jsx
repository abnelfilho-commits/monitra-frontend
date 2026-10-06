import { useEffect, useRef, useState } from "react";
import Button from "./ui/Button";
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
export default function HabilitarAcesso({ person }) {
  const [open, setOpen] = useState(false), [institutions, setInstitutions] = useState(null);
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [institution, setInstitution] = useState(""), [profile, setProfile] = useState("");
  const [active, setActive] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [result, setResult] = useState(null), [unknown, setUnknown] = useState(false);
  const [revision, refresh] = useState(0), [readError, setReadError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
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
    if (lock.current || unknown || !result || readError || result.usuario) return;
    lock.current = true; setBusy(true); setError("");
    try {
      await habilitarAcesso(person.id, { email, senha_inicial: password, instituicao_id: Number(institution), perfil_institucional: profile, ativo: active });
      setOpen(false); setConfirmed(true); setResult(null); setReadError(""); refresh(n => n + 1);
    } catch (e) {
      const status = e?.response?.status;
      setError(errors[e?.response?.data?.detail?.code] || ({401: "Sessão expirada.",403: "Operação exclusiva do ADMIN global.",404: "Pessoa ou instituição não encontrada.",409: "Conflito: nenhuma sobrescrita foi realizada.",422: "Confira e-mail, senha (até 72 bytes), instituição e perfil."}[status]) || "Resultado não confirmado. Solicite conferência antes de repetir.");
      if (!status || status >= 500) setUnknown(true);
    } finally { setPassword(""); setBusy(false); lock.current = false; }
  }
  return <section style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
    <h2>Acesso à plataforma</h2>
    <p>Possuir acesso à plataforma não concede autoridade, participação ou acesso clínico. O perfil institucional não concede capabilities.</p>
    {readError && <p role="alert">{readError}</p>}
    {!result && !readError && <p role="status">Consultando acesso persistido...</p>}
    <Button variant="secondary" disabled={busy} onClick={() => { setOpen(false); setPassword(""); setResult(null); setReadError(""); refresh(n => n + 1); }}>Atualizar acesso</Button>
    {result && !readError && !result.usuario && !confirmed && <Button disabled={!person.ativo || busy} variant="secondary" onClick={() => { setOpen(!open); setPassword(""); setError(""); }}> {open ? "Fechar acesso" : "Habilitar acesso"}</Button>}
    {!person.ativo && <p>Pessoa inativa: habilitação indisponível.</p>}
    {open && result && !result.usuario && !readError && <form onSubmit={submit}>
      <p>{person.nome_completo} — Pessoa #{person.id} — {person.ativo ? "Ativa" : "Inativa"}</p>
      <p>A senha inicial é usada somente para uma nova conta. Uma conta compatível será reutilizada sem troca de senha. O estado abaixo refere-se à autorização nesta instituição.</p>
      {error && <p role="alert">{error}</p>}
      {unknown && <p role="alert">Novas tentativas bloqueadas até conferência administrativa.</p>}
      {!institutions && !error && <p role="status">Carregando instituições...</p>}
      <fieldset disabled={busy || unknown || !person.ativo || !institutions} style={{ border: 0, padding: 0, minWidth: 0 }}>
        <label>E-mail de acesso<input style={input} type="email" required autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Senha inicial<input style={input} type="password" required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label>Instituição do acesso<select aria-label="Instituição do acesso" style={input} required value={institution} onChange={e => setInstitution(e.target.value)}><option value="">Selecione explicitamente</option>{institutions?.map(i => <option key={i.id} value={i.id} disabled={!i.ativo}>{i.nome_fantasia || i.razao_social}</option>)}</select></label>
        <label>Perfil institucional<select aria-label="Perfil institucional" style={input} required value={profile} onChange={e => setProfile(e.target.value)}><option value="">Selecione explicitamente</option>{["GESTOR","PROFISSIONAL","SUPORTE"].map(p => <option key={p}>{p}</option>)}</select></label>
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
      {!result.autorizacoes.length && <p>Nenhuma autorização institucional registrada.</p>}
      {result.autorizacoes.map(a => <div key={a.id} style={{ borderTop: "1px solid #e5e7eb", padding: "12px 0" }}>
        <strong>{a.instituicao_nome}</strong>{!a.instituicao_ativa && <span> · Instituição inativa</span>}
        <p>Perfil: {a.perfil_institucional} · Autorização: {a.ativo ? "Ativa" : "Inativa"}</p>
      </div>)}
      {confirmed && <p role="status">Acesso institucional habilitado e consultado. Nenhuma autorização clínica foi concedida.</p>}
    </div>}
    {result && !result.usuario && confirmed && <p role="alert">A conta não foi encontrada na reconsulta. Solicite conferência administrativa antes de repetir.</p>}
  </section>;
}
