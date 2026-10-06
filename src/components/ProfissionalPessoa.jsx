import { useEffect, useRef, useState } from "react";
import Button from "./ui/Button";
import { listarInstituicoes } from "../services/instituicoes";
import { listarOcupacoesProfissionais } from "../services/atividadesTerapeuticas";
import { comandoIdentidade, ativarProfissionalPessoa, inativarProfissionalPessoa, criarVinculoProfissional } from "../services/pessoas";

const input = { width: "100%", boxSizing: "border-box", padding: 10, marginTop: 6 };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 16 };
const validState = data => (data.profissional_id === null && data.profissional_ativo === null) ||
  (Number.isInteger(data.profissional_id) && data.profissional_id > 0 && typeof data.profissional_ativo === "boolean");
const errors = {
  CADASTRAL_CONFLICT: "Há divergência cadastral. Atualize e confira os dados da Pessoa antes de continuar.",
  ROLE_ATTRIBUTES_CONFLICT: "O papel existente possui dados diferentes. Nenhum dado foi sobrescrito.",
  LEGACY_PROFESSIONAL_NOT_SUPPORTED: "Este papel não pode ser administrado por este fluxo institucional.",
  PERIOD_CONFLICT: "Já existe vínculo com período conflitante. Confira os vínculos persistidos.",
  IDEMPOTENCY_CONFLICT: "Esta preparação já foi registrada com outros dados. Consulte o estado antes de continuar.",
};
const message = e => errors[e?.response?.data?.detail?.code] || ({
  401: "Sessão expirada. Entre novamente.", 403: "Operação exclusiva do ADMIN global.",
  404: "Pessoa ou papel não encontrado. Atualize a consulta.",
  409: "Conflito de domínio. Consulte o estado e revise os dados.",
  422: "Confira os dados obrigatórios, a ocupação, o período e o motivo.",
}[e?.response?.status]) || "Resultado não confirmado. Não repita a escrita sem conferência administrativa.";

export default function ProfissionalPessoa({ person, data, onReload, onBusy, onUncertain }) {
  const [reason, setReason] = useState(""), [linkReason, setLinkReason] = useState("");
  const [institution, setInstitution] = useState(""), [occupation, setOccupation] = useState("");
  const [start, setStart] = useState(""), [end, setEnd] = useState("");
  const [showLink, setShowLink] = useState(false), [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState(""), [revision, refresh] = useState(0);
  const [busy, setBusy] = useState(false), [readFailed, setReadFailed] = useState(false);
  const [error, setError] = useState(""), [success, setSuccess] = useState("");
  const lock = useRef(false), keys = useRef(new Map());
  useEffect(() => {
    if (!showLink) return;
    let current = true;
    Promise.all([listarInstituicoes(), listarOcupacoesProfissionais()]).then(([institutions, occupations]) => {
      if (!Array.isArray(institutions) || !Array.isArray(occupations)) throw Error("Invalid catalog");
      if (current) { setCatalog({ institutions, occupations }); setCatalogError(""); }
    }).catch(() => { if (current) { setCatalog(null); setCatalogError("Não foi possível consultar instituições e ocupações. Nenhuma opção foi presumida."); } });
    return () => { current = false; };
  }, [showLink, revision]);

  async function reload() {
    const next = await onReload();
    if (!validState(next)) throw Error("Professional state unavailable");
    setReadFailed(false);
  }
  async function consult() {
    if (lock.current) return;
    lock.current = true; setBusy(true); onBusy(true); setError(""); setSuccess("");
    try { await reload(); } catch { setReadFailed(true); setError("Não foi possível confirmar o estado persistido do papel Profissional."); }
    finally { lock.current = false; setBusy(false); onBusy(false); }
  }
  async function write(operation) {
    if (lock.current || readFailed || !validState(data)) return;
    lock.current = true; setBusy(true); onBusy(true); setError(""); setSuccess("");
    let confirmed = false;
    try {
      await operation(); confirmed = true;
      await reload();
      setSuccess("Operação confirmada e estado persistido consultado. Nenhuma participação ou capability clínica foi concedida.");
    } catch (e) {
      setReadFailed(true);
      setError(confirmed ? "Escrita confirmada, mas a leitura posterior falhou. Atualize o estado; não repita a escrita." : message(e));
      if (!confirmed && (!e.response || e.response.status >= 500)) onUncertain();
    } finally { lock.current = false; setBusy(false); onBusy(false); }
  }
  function prepare() {
    const fields = ["nome_completo", "nome_social", "data_nascimento", "sexo", "cpf", "email", "telefone", "ativo"];
    const pessoa = Object.fromEntries(fields.filter(k => Object.hasOwn(person, k)).map(k => [k, person[k]]));
    const payload = { pessoa, papel: "PROFISSIONAL", motivo: reason.trim() };
    const fingerprint = JSON.stringify(payload);
    if (!keys.current.has(fingerprint)) keys.current.set(fingerprint, crypto.randomUUID());
    return comandoIdentidade(true, { ...payload, chave_idempotencia: keys.current.get(fingerprint) });
  }
  const known = validState(data), exists = data.profissional_id !== null;
  return <section aria-label="Papel Profissional" style={{ borderTop: "1px solid #e5e7eb", marginTop: 20, paddingTop: 16 }}>
    <h3>Profissional</h3>
    <p>Papel Profissional, vínculo institucional e acesso à plataforma são independentes. Esta preparação não cria participação contextual nem concede acesso clínico.</p>
    <Button variant="secondary" disabled={busy} onClick={consult}>Atualizar estado do Profissional</Button>
    {error && <p role="alert">{error}</p>}{success && <p role="status">{success}</p>}
    {!known ? <p role="alert">Estado do papel Profissional indisponível. Atualize a consulta antes de preparar ou ativar.</p> : <>
      <p>{exists ? `Papel Profissional #${data.profissional_id} — ${data.profissional_ativo ? "Ativo" : "Inativo"}` : "Nenhum papel Profissional associado."}</p>
      <fieldset disabled={busy || readFailed} style={{ border: 0, padding: 0, minWidth: 0 }}>
        {!exists ? !person.cpf ? <p>A preparação exige CPF regularizado. Nenhum CPF será fabricado.</p> :
          <form onSubmit={e => { e.preventDefault(); write(prepare); }}>
            <label>Motivo da preparação profissional *<textarea style={input} required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
            <Button type="submit" disabled={!reason.trim()}>Preparar Profissional</Button>
          </form> : <>
          <Button variant={data.profissional_ativo ? "secondary" : "primary"} onClick={() => write(() => data.profissional_ativo ? inativarProfissionalPessoa(person.id) : ativarProfissionalPessoa(person.id))}>
            {data.profissional_ativo ? "Inativar Profissional" : "Ativar Profissional"}
          </Button>{" "}
          <Button variant="secondary" onClick={() => setShowLink(v => !v)}>{showLink ? "Fechar vínculo profissional" : "Adicionar vínculo profissional institucional"}</Button>
          <p>Os vínculos profissionais persistidos são exibidos na tabela acima. O estado de cada vínculo é independente do estado do papel.</p>
          {showLink && <>
            {catalogError ? <p role="alert">{catalogError} <Button variant="secondary" onClick={() => refresh(n => n + 1)}>Reconsultar opções profissionais</Button></p> : !catalog ? <p role="status">Consultando instituições e ocupações...</p> :
              <form onSubmit={e => { e.preventDefault(); write(() => criarVinculoProfissional({ profissional_id: data.profissional_id, instituicao_id: Number(institution), ocupacao_id: Number(occupation), data_inicio: start, data_fim: end || null, motivo: linkReason.trim() })); }}>
                <h4>Novo vínculo profissional institucional</h4>
                <div style={grid}>
                  <label>Instituição do vínculo profissional *<select style={input} required value={institution} onChange={e => setInstitution(e.target.value)}><option value="">Selecione explicitamente</option>{catalog.institutions.map(i => <option key={i.id} value={i.id} disabled={!i.ativo}>{i.nome_fantasia || i.razao_social}{!i.ativo ? " (inativa)" : ""}</option>)}</select></label>
                  <label>Ocupação do vínculo profissional *<select style={input} required value={occupation} onChange={e => setOccupation(e.target.value)}><option value="">Selecione explicitamente</option>{catalog.occupations.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}</select></label>
                  <label>Vínculo profissional — início *<input style={input} type="date" required value={start} onChange={e => setStart(e.target.value)} /></label>
                  <label>Vínculo profissional — término<input style={input} type="date" min={start} value={end} onChange={e => setEnd(e.target.value)} /></label>
                </div>
                <label>Motivo do vínculo profissional *<textarea style={input} required value={linkReason} onChange={e => setLinkReason(e.target.value)} /></label>
                <Button type="submit" disabled={!institution || !occupation || !start || !linkReason.trim() || !!(end && end < start)}>Criar vínculo profissional</Button>
              </form>}
          </>}
        </>}
      </fieldset>
    </>}
    {busy && <p role="status">Processando operação profissional...</p>}
  </section>;
}
