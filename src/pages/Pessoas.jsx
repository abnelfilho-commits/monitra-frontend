import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageLayout from "../components/layouts/PageLayout";
import Button from "../components/ui/Button";
import { listarInstituicoes } from "../services/instituicoes";
import * as api from "../services/pessoas";
import HabilitarAcesso from "../components/HabilitarAcesso";
import ProfissionalPessoa from "../components/ProfissionalPessoa";
import PessoaArea from "../components/pessoas/PessoaArea";
import usePessoaDraft from "../components/pessoas/usePessoaDraft";
import "./Pessoas.css";
import PessoaNavigationGuard from "../components/pessoas/PessoaNavigationGuard";

const fields = { nome_completo: "Nome completo", nome_social: "Nome social", data_nascimento: "Data de nascimento", sexo: "Sexo", email: "E-mail", telefone: "Telefone" };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 16 };
const panel = { background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 };
const input = { width: "100%", boxSizing: "border-box", padding: 10, marginTop: 6 };
const cell = { padding: 12, textAlign: "left", borderBottom: "1px solid #e5e7eb" };
const types = { BENEFICIARIO: "Beneficiário", ASSISTENCIAL: "Assistencial", COLABORADOR: "Colaborador", ASSOCIADO: "Associado", OUTRO: "Outro" };
const labelInstitution = i => i.nome_fantasia || i.razao_social;
const date = value => value ? value.split("-").reverse().join("/") : "Sem término";
const maskedCpf = cpf => cpf ? `***.***.${cpf.slice(-5, -2)}-${cpf.slice(-2)}` : "Não informado";
const formOf = p => Object.fromEntries(Object.keys(fields).map(k => [k, p?.[k] || ""]));
const personal = form => Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || null]));
const messages = {
  CADASTRAL_CONFLICT: "Há divergência cadastral com a Pessoa existente. Consulte e revise o cadastro antes de continuar.",
  INSTITUTIONAL_CONTEXT_PENDING: "O papel existente exige resolução institucional. Nenhum vínculo foi movido.",
  IDEMPOTENCY_CONFLICT: "Esta operação já foi registrada com outros dados. Consulte o resultado antes de continuar.",
  CONCURRENT_IDENTITY_CONFLICT: "Outra operação alterou esta identidade. Consulte novamente antes de continuar.",
  ROLE_CREATION_UNAVAILABLE_THIS_PHASE: "A criação deste papel não está disponível nesta etapa.",
  PERIOD_CONFLICT: "Já existe vínculo com período conflitante. Consulte os vínculos existentes.",
  CONTEXT_PERIOD_CONFLICT: "Já existe contexto assistencial com período sobreposto nesta instituição.",
  CONTEXT_LINE_DUPLICATE: "A linha Saúde Mental já existe neste contexto. Nenhuma ativação foi realizada.",
  CONTEXT_NOT_OPEN: "O contexto está encerrado ou inativo e não aceita novas linhas.",
  LINK_PERIOD_OR_STATE_CONFLICT: "O período deve estar contido em um vínculo institucional ativo.",
  EXPLICIT_PERSON_REQUIRED: "O papel assistencial precisa estar associado explicitamente à Pessoa.",
};
function errorText(e) {
  const status = e?.response?.status;
  return messages[e?.response?.data?.detail?.code] || ({401: "Sessão expirada. Entre novamente.", 403: "Operação exclusiva do ADMIN global.", 400: "Operação inválida. Revise os dados informados.", 404: "Cadastro não encontrado. Atualize a consulta.", 409: "Conflito de domínio. Revise os dados antes de continuar.", 422: "Confira os campos, CPF, datas e motivo informados."}[status]) || "Não foi possível confirmar a operação. Consulte o estado antes de repetir.";
}
function Fields({ form, setForm }) {
  return <div style={grid}>{Object.entries(fields).map(([key, label]) => <label key={key}>{label}{key === "nome_completo" ? " *" : ""}<input style={input} required={key === "nome_completo"} type={key === "data_nascimento" ? "date" : key === "email" ? "email" : "text"} maxLength={["sexo", "telefone"].includes(key) ? 32 : undefined} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}</div>;
}
function Period({ value, onChange, prefix }) {
  return <div style={grid}><label>{prefix} — início *<input style={input} type="date" required value={value.data_inicio} onChange={e => onChange({ ...value, data_inicio: e.target.value })} /></label><label>{prefix} — término<input style={input} type="date" min={value.data_inicio} value={value.data_fim} onChange={e => onChange({ ...value, data_fim: e.target.value })} /></label></div>;
}
export default function Pessoas() {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Carregando...</p>;
  if (user?.perfil !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return <Administracao />;
}
function Administracao() {
  const [offset, setOffset] = useState(0), [revision, refresh] = useState(0);
  const [result, setResult] = useState(null);
  const key = `${offset}:${revision}`;
  const list = result?.key === key ? result.rows : null;
  const error = result?.key === key ? result.error : "";
  const [selection, select] = useState(null);
  useEffect(() => {
    let current = true;
    api.listarPessoas(offset, 20).then(rows => { if (current) setResult({ key, rows, error: "" }); }).catch(e => { if (current) setResult({ key, rows: null, error: errorText(e) }); });
    return () => { current = false; };
  }, [offset, key]);
  return <PageLayout><div className="pessoas-admin"><h1>Pessoas</h1><p className="pessoas-intro">Consulte cadastros e organize papéis, vínculos e acesso à plataforma.</p>
    {selection !== null ? <Editor key={selection} id={selection} close={() => { select(null); refresh(n => n + 1); }} /> : <>
      <Button onClick={() => select("new")}>Cadastrar Pessoa</Button> <Link to="/admin/instituicoes">Administrar Instituições</Link>
      {error ? <p role="alert">{error} <Button onClick={() => refresh(n => n + 1)}>Tentar consulta novamente</Button></p> : !list ? <p role="status">Carregando pessoas...</p> : <>
        {!list.length ? <p>Nenhuma pessoa nesta página.</p> : <div style={{ overflowX: "auto", ...panel }}><table className="pessoas-table"><thead><tr>{["Pessoa", "CPF", "Situação cadastral", "Ação"].map(h => <th key={h} style={cell}>{h}</th>)}</tr></thead><tbody>{list.map(p => <tr key={p.id}><td style={cell}><strong>{p.nome_completo}</strong>{p.nome_social && <small>{p.nome_social}</small>}</td><td style={cell}>{maskedCpf(p.cpf)}</td><td style={cell}><span className="pessoa-status">{p.ativo ? "Cadastro ativo" : "Cadastro inativo"}</span></td><td style={cell}><Button variant="secondary" onClick={() => select(p.id)}>Consultar</Button></td></tr>)}</tbody></table></div>}
        <p>Página {offset / 20 + 1}</p><Button variant="secondary" disabled={!offset} onClick={() => setOffset(n => n - 20)}>Anterior</Button> <Button variant="secondary" disabled={list.length < 20} onClick={() => setOffset(n => n + 20)}>Próxima</Button>
      </>}
    </>}
  </div></PageLayout>;
}
function Editor({ id, close }) {
  const [person, setPerson] = useState(null), [form, setForm] = useState(formOf());
  const [cpf, setCpf] = useState(""), [lookup, setLookup] = useState(null), [personReason, setPersonReason] = useState("");
  const [roleReason, setRoleReason] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(id !== "new");
  const [editing, setEditing] = useState(false), [readRevision, reread] = useState(0);
  const drafts = useRef(new Map());
  const onDirty = useCallback((key, dirty) => { drafts.current.set(key, dirty); }, []);
  const dirty = useCallback(() => [...drafts.current.values()].some(Boolean), []);
  const canLeave = useCallback(() => !dirty() || window.confirm("Descartar alterações não salvas desta Pessoa?"), [dirty]);
  useEffect(() => {
    onDirty("cadastro", person ? JSON.stringify(form) !== JSON.stringify(formOf(person)) : !!(cpf || personReason || Object.values(form).some(Boolean)));
    onDirty("paciente", !!roleReason);
  }, [person, form, cpf, personReason, roleReason, onDirty]);
  const [patient, setPatient] = useState(null);
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false), keys = useRef(new Map());
  useEffect(() => {
    if (id === "new") return;
    let current = true;
    api.obterPessoa(id).then(p => { if (current) { setPerson(p); setForm(formOf(p)); } }).catch(e => { if (current) setError(errorText(e)); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [id, readRevision]);
  async function run(fn, write = false) {
    if (lock.current) return; lock.current = true; setBusy(true); setError(""); setSuccess("");
    try { await fn(); } catch (e) { setError(errorText(e)); if (write && (!e.response || e.response.status >= 500)) setUncertain(true); } finally { lock.current = false; setBusy(false); }
  }
  async function identity(role) {
    const data = role ? { ...personal(formOf(person)), cpf: person.cpf, ativo: person.ativo } : { ...personal(form), cpf };
    const payload = { pessoa: data, motivo: role ? roleReason : personReason, ...(role ? { papel: "PACIENTE" } : {}) };
    const fingerprint = JSON.stringify(payload);
    if (!keys.current.has(fingerprint)) keys.current.set(fingerprint, crypto.randomUUID());
    const result = await api.comandoIdentidade(role, { ...payload, chave_idempotencia: keys.current.get(fingerprint) });
    if (role) { setRoleReason(""); setPatient(result.paciente_id); setSuccess("Papel assistencial preparado. Nenhum acesso foi concedido."); }
    else {
      setPersonReason("");
      const p = await api.obterPessoa(result.pessoa_id); setPerson(p); setForm(formOf(p));
      setSuccess(result.resultado === "PESSOA_CRIADA" ? "Pessoa criada. Nenhum vínculo foi criado por esta operação." : "Pessoa reutilizada.");
    }
  }
  return <div><PessoaNavigationGuard dirty={dirty} /><Button variant="secondary" disabled={busy} onClick={() => { if (canLeave()) close(); }}>Voltar à lista</Button>
    <p>Cadastro, vínculo e contexto não concedem acesso clínico. ADMIN não recebe autorização clínica automaticamente.</p>
    {error && <p role="alert">{error}</p>}{success && <p role="status">{success}</p>}{loading && <p role="status">Carregando cadastro...</p>}{!person && id !== "new" && !loading && <Button onClick={() => { setError(""); setLoading(true); reread(n => n + 1); }}>Tentar consultar cadastro novamente</Button>}
    {uncertain && <p role="alert">Resultado de escrita não confirmado. Novas escritas estão bloqueadas nesta preparação; solicite conferência administrativa antes de retomar.</p>}
    <fieldset disabled={busy || loading || uncertain} style={{ border: 0, padding: 0, minWidth: 0 }}>
    {!person && id === "new" && <section style={panel}><h2>Localizar Pessoa</h2><form onSubmit={e => { e.preventDefault(); run(async () => { const r = await api.localizarPessoa(cpf); setLookup(r); }); }}><label>CPF *<input style={input} required value={cpf} onChange={e => { setCpf(e.target.value); setLookup(null); }} /></label><Button type="submit">Localizar</Button></form>
      {lookup?.encontrada && <><p>Pessoa encontrada: {lookup.pessoa.nome_completo}</p><Button onClick={() => run(async () => { const p = await api.obterPessoa(lookup.pessoa.id); setPerson(p); setForm(formOf(p)); setSuccess("Pessoa existente selecionada, sem duplicação."); })}>Reutilizar Pessoa</Button></>}
      {lookup?.encontrada === false && <form onSubmit={e => { e.preventDefault(); run(() => identity(false), true); }}><p>CPF não encontrado. Preencha o cadastro.</p><Fields form={form} setForm={setForm} /><label>Motivo do cadastro *<textarea aria-label="Motivo do cadastro *" style={input} required maxLength={1000} value={personReason} onChange={e => setPersonReason(e.target.value)} /></label><Button type="submit">Criar Pessoa</Button></form>}
    </section>}
    {person && <><header className="pessoa-heading"><h2>{person.nome_completo}</h2>{person.nome_social && <p>{person.nome_social}</p>}<p>Pessoa #{person.id} · <span className="pessoa-status">{person.ativo ? "Cadastro ativo" : "Cadastro inativo"}</span></p><p>CPF: {maskedCpf(person.cpf)} — não editável</p></header>
      <PessoaArea title="Identificação e dados cadastrais" summary="Consulte os dados de identificação e contato. Editar o cadastro não altera papéis ou permissões.">
        <div hidden={editing}><dl className="pessoa-data">{Object.entries(fields).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{person[key] || "Não informado"}</dd></div>)}</dl><Button onClick={() => setEditing(true)}>Editar dados</Button></div>
        <form hidden={!editing} onSubmit={e => { e.preventDefault(); run(async () => { const next = personal(form), original = personal(formOf(person)); const patch = Object.fromEntries(Object.entries(next).filter(([k,v]) => v !== original[k])); if (!Object.keys(patch).length) { setSuccess("Nenhuma alteração cadastral."); setEditing(false); return; } const p = await api.atualizarPessoa(person.id, patch); setPerson(p); setForm(formOf(p)); setEditing(false); setSuccess("Cadastro atualizado."); }, true); }}><Fields form={form} setForm={setForm} /><div className="pessoas-actions"><Button type="submit">Salvar alterações</Button><Button type="button" variant="secondary" onClick={() => { if (JSON.stringify(form) === JSON.stringify(formOf(person)) || window.confirm("Descartar alterações cadastrais não salvas?")) { setForm(formOf(person)); setEditing(false); } }}>Cancelar edição</Button></div></form>
      </PessoaArea>
      <VinculosPessoa key={person.id} person={person} preparedPatient={patient} onBusy={setBusy} onUncertain={() => setUncertain(true)} onDirty={onDirty}><section><p>Vínculos representam a relação assistencial/institucional da Pessoa com a Instituição. Possuir acesso à plataforma não cria automaticamente este vínculo e não exige papel assistencial. Prepare o papel de Paciente somente para quem participará da jornada assistencial. Um papel já associado será reutilizado; esta ação não cria conta ou autorização.</p>{!person.cpf ? <p>O cadastro legado não possui CPF. A preparação exige regularização explícita; nenhum CPF será fabricado.</p> : <form onSubmit={e => { e.preventDefault(); run(() => identity(true), true); }}><label>Motivo da preparação *<textarea aria-label="Motivo da preparação *" style={input} required maxLength={1000} value={roleReason} onChange={e => setRoleReason(e.target.value)} /></label><Button type="submit">Preparar papel de Paciente</Button></form>}</section></VinculosPessoa>
      <HabilitarAcesso key={person.id} person={person} onDirty={onDirty} onBusy={setBusy} />
    </>}
    </fieldset>{busy && <p role="status">Processando...</p>}
  </div>;
}
function VinculosPessoa({ person, preparedPatient, onBusy, onUncertain, onDirty, children }) {
  const [data, setData] = useState(null), [error, setError] = useState("");
  const [patientSummary, setPatientSummary] = useState("Consultando…");
  const [revision, refresh] = useState(0), [adding, setAdding] = useState(false), [started, setStarted] = useState(false);
  useEffect(() => {
    let current = true;
    api.obterVinculosPessoa(person.id).then(value => {
      if (value.pessoa_id !== person.id || !Array.isArray(value.pacientes) || !Array.isArray(value.profissionais)) throw Error("Invalid links response");
      if (current) { setData(value); setError(""); }
    }).catch(() => { if (current) setError("Não foi possível consultar vínculos persistidos. Nenhuma ausência de vínculo foi confirmada."); });
    return () => { current = false; };
  }, [person.id, preparedPatient, revision]);
  const rows = data ? [...data.pacientes.map(l => ({ ...l, papel: "Paciente", tipo: types[l.tipo_vinculo] || l.tipo_vinculo })), ...data.profissionais.map(l => ({ ...l, papel: "Profissional", tipo: `Ocupação #${l.ocupacao_id}` }))] : [];
  const reload = async () => {
    const next = await api.obterVinculosPessoa(person.id);
    if (next.pessoa_id !== person.id || !Array.isArray(next.pacientes) || !Array.isArray(next.profissionais)) throw Error("Invalid links response");
    setData(next); setError(""); return next;
  };
  const professional = data && !error ? data : { profissional_id: undefined, profissional_ativo: undefined };
  return <ProfissionalPessoa person={person} data={professional} onBusy={onBusy} onUncertain={onUncertain} onReload={reload} onDirty={onDirty}>
    {({ role, link, summary }) => <>
      <PessoaArea title="Papéis e atuação" summary={`Paciente: ${patientSummary} · Profissional: ${summary}. Papéis não concedem acesso clínico.`}>
        <PapelPaciente person={person} preparedPatient={preparedPatient} revision={revision} onSummary={setPatientSummary} onBusy={onBusy}>{children}</PapelPaciente>
        {role}
      </PessoaArea>
      <PessoaArea title="Instituições vinculadas" summary={error ? "Não foi possível confirmar os vínculos." : !data ? "Consultando vínculos…" : rows.length ? `${rows.length} vínculo(s) institucional(is), incluindo histórico.` : "Nenhum vínculo institucional registrado."}>
        <p>Vínculos e acesso à plataforma são independentes. Esta consulta não cria papel, vínculo ou autorização.</p>
        <Button variant="secondary" onClick={() => refresh(n => n + 1)}>Atualizar vínculos da Pessoa</Button>
        {error ? <p role="alert">{error}</p> : !data ? <p role="status">Consultando vínculos persistidos...</p> : !rows.length ? <p>Nenhum vínculo institucional registrado.</p> : <div style={{ overflowX: "auto" }}><table className="pessoas-table">
          <thead><tr>{["Instituição", "Papel", "Tipo / Ocupação", "Período", "Registro"].map(h => <th key={h} style={cell}>{h}</th>)}</tr></thead>
          <tbody>{rows.map(l => <tr key={`${l.papel}:${l.id}`}><td style={cell}>{l.instituicao_nome}{!l.instituicao_ativa && " (inativa)"}</td><td style={cell}>{l.papel}</td><td style={cell}>{l.tipo}</td><td style={cell}>{date(l.data_inicio)} → {date(l.data_fim)}</td><td style={cell}>{l.ativo ? "Válido" : "Invalidado"}</td></tr>)}</tbody>
        </table></div>}
        {link}
        {Number.isInteger(data?.paciente_id) && data.paciente_id > 0 && <fieldset disabled={!!error} style={{ border: 0, padding: 0 }}>
          <Button variant="secondary" aria-expanded={adding} aria-controls="pessoa-contexto" onClick={() => { setStarted(true); setAdding(v => !v); }}>{adding ? "Fechar preparação de vínculo" : "Adicionar vínculo institucional / preparar contexto"}</Button>
          <div id="pessoa-contexto" hidden={!adding}><Institutional patient={data.paciente_id} enabled={started} onBusy={onBusy} onUncertain={onUncertain} onDirty={onDirty} onCreated={() => refresh(n => n + 1)} /></div>
        </fieldset>}
      </PessoaArea>
    </>}
  </ProfissionalPessoa>;
}

const patientStateValid = data => data && (
  (data.paciente_id === null && data.paciente_ativo === null) ||
  (Number.isInteger(data.paciente_id) && data.paciente_id > 0 && typeof data.paciente_ativo === "boolean")
);
const patientUnknown = "Não foi possível confirmar o estado do papel de Paciente";
function PapelPaciente({ person, preparedPatient, revision, onSummary, onBusy, children }) {
  const [data, setData] = useState(null), [message, setMessage] = useState("");
  const [reading, setReading] = useState(true), [writing, setWriting] = useState(false);
  const sequence = useRef(0), mounted = useRef(false), lock = useRef(false);
  const reload = useCallback(async () => {
    const request = ++sequence.current;
    setData(null); setReading(true);
    try {
      const next = await api.obterVinculosPessoa(person.id);
      if (!mounted.current || request !== sequence.current) return false;
      if (next.pessoa_id !== person.id || !patientStateValid(next)) throw Error("Patient state unavailable");
      setData(next);
      return true;
    } catch {
      if (mounted.current && request === sequence.current) setData(null);
      return false;
    } finally {
      if (mounted.current && request === sequence.current) setReading(false);
    }
  }, [person.id]);
  useEffect(() => {
    mounted.current = true;
    void reload();
    return () => { mounted.current = false; sequence.current += 1; };
  }, [reload, preparedPatient, revision]);
  async function consult() {
    if (lock.current) return;
    setMessage("");
    await reload();
  }
  async function activate() {
    if (lock.current || reading || !patientStateValid(data) || data.paciente_ativo !== false) return;
    if (!window.confirm("Ativar o papel de Paciente desta Pessoa? Esta ação não cria conta, vínculo, acompanhamento ou permissão clínica.")) return;
    lock.current = true; setWriting(true); setMessage(""); setData(null); sequence.current += 1;
    let confirmed = false;
    try {
      await api.ativarPacientePessoa(person.id);
      confirmed = true;
      if (!mounted.current) return;
      const read = await reload();
      if (mounted.current) setMessage(read ? "Escrita confirmada. Estado persistido consultado; nenhuma permissão clínica foi concedida." : "Escrita confirmada, mas o estado persistido não pôde ser consultado. Atualize o estado; não repita a ativação.");
    } catch (e) {
      if (!mounted.current) return;
      const status = e?.response?.status;
      setMessage(confirmed ? "Escrita confirmada, mas o estado persistido não pôde ser consultado. Atualize o estado; não repita a ativação." :
        e?.response?.data?.detail?.code === "LEGACY_PATIENT_NOT_SUPPORTED" ? "Este papel não pode ser ativado pelo fluxo canônico. Nenhuma adaptação do legado foi realizada." :
        ({401: "Sessão expirada. Entre novamente.", 403: "Sem autorização para ativar o papel de Paciente. Operação exclusiva do ADMIN.",
          404: "Pessoa ou papel não encontrado, ou operação indisponível. Atualize a consulta.",
          409: "Conflito na ativação. Consulte o estado antes de continuar.", 422: "Requisição de ativação inválida. Confira a Pessoa selecionada."}[status] ||
          "Resultado da ativação incerto. Consulte o estado persistido antes de repetir."));
    } finally {
      lock.current = false;
      if (mounted.current) setWriting(false);
    }
  }
  const known = patientStateValid(data);
  const summary = writing ? "Processando…" : reading ? "Consultando…" : !known ? "Não confirmado" : data.paciente_id === null ? "Não preparado" : data.paciente_ativo ? "Ativo" : "Inativo";
  useEffect(() => { onSummary(summary); }, [summary, onSummary]);
  useEffect(() => { onBusy(writing); }, [writing, onBusy]);
  return <section aria-label="Papel de Paciente" style={{ borderTop: "1px solid #e5e7eb", marginTop: 20, paddingTop: 16 }}>
    <h3>Papel de Paciente</h3>
    <p>O estado do papel é independente da Pessoa, dos vínculos e das permissões clínicas.</p>
    <Button variant="secondary" disabled={writing} onClick={consult}>Atualizar estado do Paciente</Button>
    {message && <p role="status">{message}</p>}
    {writing ? <p role="status">Processando ativação...</p> : reading ? <p role="status">Consultando estado do papel de Paciente...</p> : !known ?
      <p role="alert">{patientUnknown}</p> : <>
        <p>Estado do papel: <strong>{data.paciente_id === null ? "Não preparado" : data.paciente_ativo ? "Ativo" : "Inativo"}</strong></p>
        {data.paciente_id === null ? children : data.paciente_ativo === false && <Button onClick={activate}>Ativar papel de Paciente</Button>}
      </>}
  </section>;
}

function Institutional({ patient, enabled, onBusy, onUncertain, onCreated, onDirty }) {
  const [institutions, setInstitutions] = useState(null), [institution, setInstitution] = useState("");
  const [links, setLinks] = useState(null), [selected, setSelected] = useState(null), [creating, setCreating] = useState(false);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [unknown, setUnknown] = useState(false);
  const [reason, setReason] = useState(""), [type, setType] = useState("");
  const [period, setPeriod] = useState({ data_inicio: "", data_fim: "" });
  const [contextPeriod, setContextPeriod] = useState({ data_inicio: "", data_fim: "" });
  const [context, setContext] = useState(null), [line, setLine] = useState(null), [refresh, setRefresh] = useState(0);
  const lock = useRef(false);
  const markLinkSaved = usePessoaDraft("vinculo-paciente", [reason, type, period], onDirty);
  const markContextSaved = usePessoaDraft("contexto", contextPeriod, onDirty);
  useEffect(() => { if (!enabled) return; let current = true; listarInstituicoes().then(r => { if (current) setInstitutions(r); }).catch(e => { if (current) setError(errorText(e)); }); return () => { current = false; }; }, [refresh, enabled]);
  useEffect(() => {
    let current = true; setLinks(null); setSelected(null); setCreating(false); setContext(null); setLine(null); setError("");
    if (institution) api.listarVinculosPessoa(Number(institution)).then(r => { if (current) setLinks(r.filter(l => l.paciente_id === patient)); }).catch(e => { if (current) setError(errorText(e)); });
    return () => { current = false; };
  }, [institution, patient, refresh]);
  async function write(fn) {
    if (lock.current || unknown) return; lock.current = true; setBusy(true); onBusy(true); setError("");
    try { await fn(); } catch (e) { setError(errorText(e)); if (!e.response || e.response.status >= 500) { setUnknown(true); onUncertain(); } } finally { lock.current = false; setBusy(false); onBusy(false); }
  }
  return <section style={panel}><h2>Vínculos institucionais</h2><p>Relação assistencial/institucional da Pessoa com a Instituição, independente do acesso à plataforma. Possuir acesso não cria automaticamente este vínculo.</p>
    {error && <p role="alert">{error}</p>}{unknown && <p role="alert">Resultado da escrita não confirmado. Interrompa a preparação e solicite conferência administrativa antes de repetir.</p>}
    <fieldset disabled={busy || unknown} style={{ border: 0, padding: 0, minWidth: 0 }}>
    <label>Instituição *<select aria-label="Instituição *" style={input} value={institution} onChange={e => setInstitution(e.target.value)}><option value="">Selecione explicitamente</option>{institutions?.map(i => <option key={i.id} value={i.id} disabled={!i.ativo}>{labelInstitution(i)}{!i.ativo ? " (inativa)" : ""}</option>)}</select></label>
    {!institutions && !error && <p role="status">Carregando instituições...</p>}
    <p><Link to="/admin/instituicoes">Administrar Instituições</Link></p>
    <Button variant="secondary" onClick={() => setRefresh(n => n + 1)}>Atualizar consultas</Button>
    {institution && !links && !error && <p role="status">Consultando vínculos...</p>}
    {links && <><p>{links.length ? "Vínculos desta Pessoa na instituição selecionada:" : "Nenhum vínculo encontrado nesta instituição."}</p>{links.map(l => <div key={l.id}><span>{types[l.tipo_vinculo] || l.tipo_vinculo} · {date(l.data_inicio)} → {date(l.data_fim)} · {l.ativo ? "Ativo" : "Inativo"} </span><Button variant="secondary" disabled={!l.ativo} onClick={() => { setSelected(l); setContext(null); setLine(null); setContextPeriod({ data_inicio: "", data_fim: "" }); }}>Usar vínculo</Button></div>)}
    {!selected && links.length > 0 && !creating && <Button variant="secondary" onClick={() => setCreating(true)}>Adicionar vínculo nesta instituição</Button>}
    {!selected && (!links.length || creating) && <form onSubmit={e => { e.preventDefault(); write(async () => { const l = await api.criarVinculoPessoa({ paciente_id: patient, instituicao_id: Number(institution), tipo_vinculo: type, data_inicio: period.data_inicio, data_fim: period.data_fim || null, motivo: reason }); setLinks(rows => [...rows.filter(r => r.id !== l.id), l]); setSelected(l); setReason(""); markLinkSaved(["", type, period]); onCreated(); }); }}><h3>Novo vínculo institucional</h3><label>Tipo de vínculo *<select aria-label="Tipo de vínculo *" style={input} required value={type} onChange={e => setType(e.target.value)}><option value="">Selecione</option>{Object.entries(types).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label><Period prefix="Vínculo" value={period} onChange={setPeriod} /><label>Motivo do vínculo *<textarea aria-label="Motivo do vínculo *" style={input} required value={reason} onChange={e => setReason(e.target.value)} /></label><Button type="submit">Criar vínculo</Button></form>}
    </>}
    {selected && <><h2>Contexto assistencial</h2><p>Vínculo selecionado: {types[selected.tipo_vinculo]} · {date(selected.data_inicio)} → {date(selected.data_fim)}</p><p>Esta visualização apresenta o contexto preparado nesta operação. Contextos anteriores não são listados aqui; períodos sobrepostos serão rejeitados.</p>
    {!context ? <form onSubmit={e => { e.preventDefault(); write(async () => { setContext(await api.criarContextoPessoa({ paciente_instituicao_id: selected.id, data_inicio: contextPeriod.data_inicio, data_fim: contextPeriod.data_fim || null })); markContextSaved(); }); }}><Period prefix="Contexto" value={contextPeriod} onChange={setContextPeriod} /><Button type="submit">Criar contexto</Button></form> : <><Button variant="secondary" onClick={async () => { if (lock.current) return; lock.current = true; setBusy(true); onBusy(true); setError(""); try { setContext(await api.obterContextoPessoa(context.id, Number(institution))); } catch (e) { setError(errorText(e)); } finally { lock.current = false; setBusy(false); onBusy(false); } }}>Consultar contexto</Button><Link to={`/operacao-assistencial?instituicao_id=${institution}&contexto_id=${context.id}`}>Operar linha e autorizações deste contexto</Link><p role="status">Contexto confirmado: {date(context.data_inicio)} → {date(context.data_fim)}. Nenhuma autorização concedida.</p>{line ? <p role="status">Saúde Mental adicionada — {line.ativo ? "ativa" : "inativa"}. A autorização contextual é tratada separadamente.</p> : <><p>A linha Saúde Mental será adicionada inativa. Contextos encerrados não aceitam novas linhas.</p><Button disabled={!context.ativo || !!context.data_fim} onClick={() => write(async () => setLine(await api.adicionarSaudeMental(context.id, Number(institution))))}>Adicionar Saúde Mental</Button></>}</>}
    </>}
    </fieldset>{busy && <p role="status">Processando preparação...</p>}
  </section>;
}
