import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageLayout from "../components/layouts/PageLayout";
import PageHeader from "../components/ui/PageHeader";
import CardWidget from "../components/ui/CardWidget";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import { listarOcupacoesProfissionais } from "../services/atividadesTerapeuticas";
import { listarServicos, obterServico, criarServico, atualizarServico, alterarEstadoServico } from "../services/economia";
import "./ServicosEconomicos.css";

const blank = { codigo: "", descricao: "", ocupacao_id: "", duracao_minutos: "", unidade: "SESSAO", tipo_atendimento: "INDIVIDUAL", ativo: true };
const messages = {
  SERVICE_IN_USE: "O serviço está em uso. Reabra a edição para atualizar os campos permitidos.",
  SERVICE_CODE_EXISTS: "Este código já está cadastrado.",
  OCCUPATION_NOT_FOUND: "A ocupação não foi encontrada. Reabra o formulário.",
  NOT_FOUND: "Serviço não encontrado. Atualize o catálogo.",
};
function errorMessage(error) {
  const status = error?.response?.status;
  if (status === 401) return "Sessão expirada. Entre novamente.";
  if (status === 403) return "Esta operação é exclusiva do ADMIN global.";
  if (status === 422) return messages[error?.response?.data?.detail?.code] || "Confira os campos obrigatórios e a duração em minutos inteiros positivos.";
  return messages[error?.response?.data?.detail?.code] || "Não foi possível concluir a operação. Tente novamente.";
}

export default function ServicosEconomicos() {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Carregando...</p>;
  if (user?.perfil !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return <Catalogo />;
}

function Catalogo() {
  const [revision, setRevision] = useState(0);
  const [list, setList] = useState({ revision: -1, rows: [], error: "" });
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({});
  const sending = useRef(false);
  const generation = useRef(0);
  const dialog = useRef(null);
  const opener = useRef(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let current = true;
    listarServicos().then(rows => { if (current) setList({ revision, rows, error: "" }); })
      .catch(error => { if (current) setList({ revision, rows: [], error: errorMessage(error) }); });
    return () => { current = false; };
  }, [revision]);
  useEffect(() => {
    if (editor && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [editor]);

  async function open(id = null) {
    if (sending.current) return;
    opener.current = document.activeElement;
    const call = ++generation.current;
    setFeedback({}); setEditor({ id, loading: true });
    try {
      const [row, occupations] = await Promise.all([id == null ? Promise.resolve(blank) : obterServico(id), listarOcupacoesProfissionais()]);
      if (!mounted.current || call !== generation.current) return;
      // Keep the persisted occupation visible even if the canonical active catalogue omits it.
      if (row.ocupacao_id && !occupations.some(o => o.id === row.ocupacao_id)) occupations.push({ id: row.ocupacao_id, nome: row.ocupacao_nome });
      setEditor({ id, used: row.em_uso, occupations, form: Object.fromEntries(Object.keys(blank).map(k => [k, row[k]])) });
    } catch (error) { if (mounted.current && call === generation.current) setEditor({ id, error: errorMessage(error) }); }
  }
  function close() {
    if (sending.current) return;
    generation.current++; dialog.current?.close(); setEditor(null); opener.current?.focus();
  }
  async function save(event) {
    event.preventDefault();
    if (sending.current) return;
    const data = { ...editor.form, codigo: editor.form.codigo.trim(), descricao: editor.form.descricao.trim(), ocupacao_id: Number(editor.form.ocupacao_id), duracao_minutos: Number(editor.form.duracao_minutos) };
    if (!data.codigo || !data.descricao || !Number.isInteger(data.duracao_minutos) || data.duracao_minutos < 1) {
      setEditor(value => ({ ...value, error: "Informe código, descrição e duração válida." })); return;
    }
    sending.current = true; setBusy(true); setEditor(value => ({ ...value, error: "" }));
    try {
      if (editor.id == null) await criarServico(data); else await atualizarServico(editor.id, data);
      if (mounted.current) { dialog.current?.close(); setEditor(null); opener.current?.focus(); setFeedback({ success: "Serviço salvo com sucesso." }); setRevision(value => value + 1); }
    } catch (error) { if (mounted.current) setEditor(value => ({ ...value, error: errorMessage(error) })); }
    finally { sending.current = false; if (mounted.current) setBusy(false); }
  }
  async function toggle(row) {
    if (sending.current) return;
    if (row.ativo && !window.confirm(`Inativar “${row.descricao}”? Este serviço é global e pode estar associado a configurações econômicas existentes. Nenhum preço ou mapeamento será excluído.`)) return;
    sending.current = true; setBusy(true); setFeedback({});
    try {
      await alterarEstadoServico(row.id, !row.ativo);
      if (mounted.current) { setFeedback({ success: row.ativo ? "Serviço inativado." : "Serviço ativado." }); setRevision(value => value + 1); }
    } catch (error) { if (mounted.current) setFeedback({ error: errorMessage(error) }); }
    finally { sending.current = false; if (mounted.current) setBusy(false); }
  }
  const change = (key, value) => setEditor(current => ({ ...current, form: { ...current.form, [key]: value } }));
  return <PageLayout>
    <Link to="/admin/economia">Voltar à Administração Econômica</Link>
    <PageHeader title="Serviços Econômicos" description="Catálogo global, reutilizável entre tabelas. Nenhum preço é cadastrado nesta tela." actions={<Button disabled={busy} onClick={() => open()}>Novo serviço</Button>} />
    {feedback.success && <p role="status">{feedback.success}</p>}
    {feedback.error && <p role="alert">{feedback.error}</p>}
    <CardWidget title="Catálogo de serviços">
      <Button variant="secondary" disabled={busy} onClick={() => setRevision(value => value + 1)}>Atualizar catálogo</Button>
      {list.revision !== revision ? <p role="status">Carregando serviços...</p> : list.error ? <p role="alert">{list.error}</p> : !list.rows.length ? <EmptyState title="Nenhum serviço cadastrado" description="Crie o primeiro serviço econômico." /> :
        <div className="economic-table"><table><thead><tr>{["Código", "Descrição", "Ocupação", "Duração", "Unidade", "Tipo", "Status", "Ações"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{list.rows.map(row => <tr key={row.id}><th scope="row">{row.codigo}</th><td>{row.descricao}</td><td>{row.ocupacao_nome}</td><td>{row.duracao_minutos} min</td><td>Sessão</td><td>Individual</td><td>{row.ativo ? "Ativo" : "Inativo"}</td><td><div className="economic-actions"><Button variant="secondary" disabled={busy} onClick={() => open(row.id)}>Editar</Button><Button variant={row.ativo ? "danger" : "secondary"} disabled={busy} onClick={() => toggle(row)}>{row.ativo ? "Inativar" : "Ativar"}</Button></div></td></tr>)}</tbody>
        </table></div>}
    </CardWidget>
    {editor && <dialog className="economic-dialog" ref={dialog} aria-labelledby="economic-title" onCancel={event => { event.preventDefault(); close(); }}>
      <h2 id="economic-title">{editor.id == null ? "Novo serviço" : "Editar serviço"}</h2>
      {editor.loading && <p role="status">Carregando formulário...</p>}
      {editor.error && <p role="alert">{editor.error}</p>}
      {editor.form && <form onSubmit={save}>
        {editor.used && <p>Os campos estruturais não podem ser alterados porque o serviço já está em uso. Descrição e status continuam editáveis.</p>}
        <fieldset disabled={busy}>
          <div className="economic-fields">
            <label>Código *<input required maxLength={64} disabled={editor.used} value={editor.form.codigo} onChange={e => change("codigo", e.target.value)} /></label>
            <label>Descrição *<textarea aria-label="Descrição *" required value={editor.form.descricao} onChange={e => change("descricao", e.target.value)} /></label>
            <label>Ocupação *<select aria-label="Ocupação *" required disabled={editor.used} value={editor.form.ocupacao_id} onChange={e => change("ocupacao_id", e.target.value)}><option value="">Selecione</option>{editor.occupations.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}</select></label>
            <label>Duração (minutos) *<input type="number" min="1" step="1" required disabled={editor.used} value={editor.form.duracao_minutos} onChange={e => change("duracao_minutos", e.target.value)} /></label>
            <label>Unidade<select disabled={editor.used} value={editor.form.unidade} onChange={e => change("unidade", e.target.value)}><option value="SESSAO">Sessão</option></select></label>
            <label>Tipo de atendimento<select disabled={editor.used} value={editor.form.tipo_atendimento} onChange={e => change("tipo_atendimento", e.target.value)}><option value="INDIVIDUAL">Individual</option></select></label>
          </div>
          <p>Status: {editor.form.ativo ? "Ativo" : "Inativo"}. A ativação/inativação é feita explicitamente no catálogo.</p>
          <Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar serviço"}</Button>
        </fieldset>
      </form>}
      <Button variant="secondary" disabled={busy} onClick={close}>Cancelar</Button>
    </dialog>}
  </PageLayout>;
}
