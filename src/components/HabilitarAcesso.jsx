import { useEffect, useRef, useState } from "react";
import Button from "./ui/Button";
import { listarInstituicoes } from "../services/instituicoes";
import { habilitarAcesso } from "../services/pessoas";

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
  const lock = useRef(false);
  useEffect(() => {
    if (!open) return;
    let current = true;
    listarInstituicoes().then(rows => { if (current) setInstitutions(rows); })
      .catch(() => { if (current) setError("Não foi possível consultar instituições. Feche e tente novamente."); });
    return () => { current = false; };
  }, [open]);
  async function submit(e) {
    e.preventDefault();
    if (lock.current || unknown) return;
    lock.current = true; setBusy(true); setError(""); setResult(null);
    try {
      const r = await habilitarAcesso(person.id, { email, senha_inicial: password, instituicao_id: Number(institution), perfil_institucional: profile, ativo: active });
      setResult(r);
    } catch (e) {
      const status = e?.response?.status;
      setError(errors[e?.response?.data?.detail?.code] || ({401: "Sessão expirada.",403: "Operação exclusiva do ADMIN global.",404: "Pessoa ou instituição não encontrada.",409: "Conflito: nenhuma sobrescrita foi realizada.",422: "Confira e-mail, senha (até 72 bytes), instituição e perfil."}[status]) || "Resultado não confirmado. Solicite conferência antes de repetir.");
      if (!status || status >= 500) setUnknown(true);
    } finally { setPassword(""); setBusy(false); lock.current = false; }
  }
  return <section style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
    <h2>Acesso institucional</h2>
    <p>Habilitar acesso não concede autoridade, participação ou acesso clínico. O perfil institucional não concede capabilities.</p>
    <Button disabled={!person.ativo || busy} variant="secondary" onClick={() => { setOpen(!open); setPassword(""); setError(""); }}> {open ? "Fechar acesso" : "Habilitar acesso"}</Button>
    {!person.ativo && <p>Pessoa inativa: habilitação indisponível.</p>}
    {open && <form onSubmit={submit}>
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
      {result && <p role="status">Acesso preparado — instituição {institutions?.find(i => i.id === result.autorizacao.instituicao_id)?.razao_social || `#${result.autorizacao.instituicao_id}`} — {result.autorizacao.perfil_institucional} — autorização {result.autorizacao.ativo ? "ativa" : "inativa"}. Nenhuma autorização clínica foi concedida.</p>}
    </form>}
  </section>;
}
