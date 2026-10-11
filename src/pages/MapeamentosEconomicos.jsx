import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageLayout from "../components/layouts/PageLayout";
import PageHeader from "../components/ui/PageHeader";
import CardWidget from "../components/ui/CardWidget";
import Button from "../components/ui/Button";
import { listarMapeamentos, listarServicos, criarMapeamento, alterarMapeamento } from "../services/economia";
import "./ServicosEconomicos.css";

function errorMessage(error) {
  const status = error?.response?.status;
  if (status === 401) return "Sessão expirada. Entre novamente.";
  if (status === 403) return "Esta operação é exclusiva do ADMIN global.";
  const code = error?.response?.data?.detail?.code;
  if (code === "MAPPING_CONFLICT") return "Este planejamento já foi mapeado. Feche o formulário, atualize a lista e use Alterar.";
  if (code === "INACTIVE_SERVICE") return "O serviço foi inativado. Reabra o formulário e escolha um serviço ativo.";
  if (status === 404) return "Planejamento ou serviço não encontrado. Atualize a lista.";
  if (status === 422) return "Confira o serviço selecionado.";
  return "Não foi possível concluir a operação. Tente novamente.";
}
const serviceLabel = row => `${row.servico_codigo} — ${row.servico_descricao}${row.servico_ativo === false ? " — INATIVO" : ""}`;
const period = row => `${row.data_inicio} → ${row.data_fim || "Sem término"}`;

export default function MapeamentosEconomicos() {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Carregando...</p>;
  if (user?.perfil !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return <Mapeamentos />;
}

function Mapeamentos() {
  const [revision, setRevision] = useState(0);
  const [list, setList] = useState({ revision: -1, rows: [], error: "" });
  const [filters, setFilters] = useState({ line: "", situation: "TODOS", search: "" });
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const dialog = useRef(null), opener = useRef(null), sending = useRef(false), generation = useRef(0);
  useEffect(() => {
    let current = true;
    listarMapeamentos().then(rows => { if (current) setList({ revision, rows, error: "" }); })
      .catch(error => { if (current) setList({ revision, rows: [], error: errorMessage(error) }); });
    return () => { current = false; };
  }, [revision]);
  useEffect(() => () => { generation.current++; }, []);
  useEffect(() => { if (editor && !dialog.current?.open) dialog.current?.showModal(); }, [editor]);
  async function open(row) {
    opener.current = document.activeElement;
    const call = ++generation.current;
    setSuccess(""); setEditor({ row, loading: true, selected: "" });
    try {
      const services = await listarServicos();
      if (call === generation.current) setEditor({ row, services: services.filter(s => s.ativo), selected: "" });
    } catch (error) { if (call === generation.current) setEditor({ row, error: errorMessage(error) }); }
  }
  function close() {
    if (sending.current) return;
    generation.current++; dialog.current?.close(); setEditor(null); opener.current?.focus();
  }
  async function save(event) {
    event.preventDefault();
    if (sending.current || !editor.selected) return;
    sending.current = true; setBusy(true);
    const call = generation.current;
    setEditor(current => ({ ...current, error: "" }));
    try {
      if (editor.row.mapeamento_id != null) await alterarMapeamento(editor.row.mapeamento_id, Number(editor.selected));
      else await criarMapeamento({ agenda_cuidado_id: editor.row.agenda_cuidado_id, servico_id: Number(editor.selected) });
      if (call === generation.current) {
        dialog.current?.close(); setEditor(null); opener.current?.focus();
        setSuccess("Mapeamento salvo com sucesso."); setRevision(value => value + 1);
      }
    } catch (error) { if (call === generation.current) setEditor(current => ({ ...current, error: errorMessage(error) })); }
    finally { sending.current = false; if (call === generation.current) setBusy(false); }
  }
  const lines = [...new Map(list.rows.filter(r => r.modulo_id != null).map(r => [r.modulo_id, r.modulo_nome])).entries()];
  const rows = list.rows.filter(r => (!filters.line || String(r.modulo_id) === filters.line)
    && (filters.situation === "TODOS" || (filters.situation === "MAPEADOS" ? r.mapeamento_id != null : r.mapeamento_id == null))
    && `${r.paciente_nome} ${r.atividade_nome}`.toLocaleLowerCase().includes(filters.search.trim().toLocaleLowerCase()));
  const filter = (key, value) => setFilters(current => ({ ...current, [key]: value }));
  return <PageLayout>
    <Link to="/admin/economia">Voltar à Administração Econômica</Link>
    <PageHeader title="Mapeamentos Econômicos" description="Associe cada planejamento individual a um serviço econômico. Preços e contratos são administrados separadamente." />
    {success && <p role="status">{success}</p>}
    <CardWidget title="Planejamentos assistenciais">
      <div className="economic-fields">
        <label>Linha<select value={filters.line} onChange={e => filter("line", e.target.value)}><option value="">Todas</option>{lines.map(([id, name]) => <option key={id} value={id}>{name || `Linha #${id}`}</option>)}</select></label>
        <label>Situação<select value={filters.situation} onChange={e => filter("situation", e.target.value)}><option value="TODOS">Todos</option><option value="MAPEADOS">Mapeados</option><option value="NAO_MAPEADOS">Não mapeados</option></select></label>
        <label>Paciente ou atividade<input value={filters.search} onChange={e => filter("search", e.target.value)} /></label>
      </div>
      <Button onClick={() => setRevision(value => value + 1)} disabled={busy}>Atualizar</Button>
      {list.revision !== revision ? <p role="status">Carregando planejamentos...</p> : list.error ? <p role="alert">{list.error}</p> : !rows.length ? <p>Nenhum planejamento encontrado.</p> : <div className="economic-table"><table>
        <thead><tr>{["Paciente / Agenda", "Atividade", "Ocupação", "Duração", "Linha / Período", "Serviço Econômico", "Situação", "Ação"].map(label => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.agenda_cuidado_id}>
          <th scope="row">{row.paciente_nome}<small> · Agenda #{row.agenda_cuidado_id}</small></th>
          <td>{row.atividade_nome}</td><td>{row.ocupacao_nome}</td><td>{row.duracao_minutos} min</td>
          <td>{row.modulo_nome || "Sem linha informada"}<br />{period(row)}<br />{row.status}{row.contexto_assistencial_id != null && <small> · Contexto #{row.contexto_assistencial_id}</small>}</td>
          <td>{row.mapeamento_id != null ? serviceLabel(row) : "—"}</td><td>{row.mapeamento_id != null ? "MAPEADO" : "NÃO MAPEADO"}</td>
          <td><Button onClick={() => open(row)} disabled={busy}>{row.mapeamento_id != null ? "Alterar" : "Mapear"}</Button></td>
        </tr>)}</tbody>
      </table></div>}
    </CardWidget>
    {editor && <dialog ref={dialog} className="economic-dialog" aria-labelledby="mapping-title" onCancel={e => { e.preventDefault(); close(); }}>
      <h2 id="mapping-title">{editor.row.mapeamento_id != null ? "Alterar mapeamento" : "Mapear planejamento"}</h2>
      <p>{editor.row.paciente_nome} · Agenda #{editor.row.agenda_cuidado_id}</p>
      <p>{editor.row.atividade_nome} · {editor.row.ocupacao_nome} · {editor.row.duracao_minutos} min · {editor.row.modulo_nome || "Sem linha informada"}</p>
      <p>{period(editor.row)} · {editor.row.status}</p>
      {editor.row.mapeamento_id != null && <p>Serviço atual: {serviceLabel(editor.row)}</p>}
      {editor.error && <p role="alert">{editor.error}</p>}
      {editor.loading ? <p role="status">Carregando serviços...</p> : editor.services && <form onSubmit={save}>
        <fieldset disabled={busy} className="economic-fields"><label>Serviço Econômico *<select required value={editor.selected} onChange={e => setEditor(current => ({ ...current, selected: e.target.value }))}>
          <option value="">Selecione um serviço ativo</option>{editor.services.map(s => <option key={s.id} value={s.id}>{s.codigo} — {s.descricao} — {s.ocupacao_nome} — {s.duracao_minutos} min</option>)}
        </select></label></fieldset>
        {!editor.services.length && <p>Nenhum serviço ativo disponível. Cadastre ou ative um serviço no catálogo.</p>}
        <Button type="submit" disabled={busy || !editor.selected}>{busy ? "Salvando..." : editor.row.mapeamento_id != null ? "Confirmar alteração" : "Salvar mapeamento"}</Button>
      </form>}
      <Button type="button" onClick={close} disabled={busy}>Cancelar</Button>
    </dialog>}
  </PageLayout>;
}
