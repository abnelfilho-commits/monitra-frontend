import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageLayout from "../components/layouts/PageLayout";
import PageHeader from "../components/ui/PageHeader";
import CardWidget from "../components/ui/CardWidget";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import { listarInstituicoes } from "../services/instituicoes";
import * as api from "../services/economia";
import "./ServicosEconomicos.css";
import "./TabelasPrecos.css";

const base = "/admin/economia/tabelas";
const date = value => value ? value.split("-").reverse().join("/") : "—";
const money = value => value == null ? "Preço não cadastrado" : `R$ ${String(value).split(".")[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${(String(value).split(".")[1] || "").padEnd(2, "0")}`;
const decimal = value => {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(normalized)) throw new Error("Informe um valor válido com até duas casas decimais. Vazio não é zero.");
  return normalized;
};
const messages = {
  TABLE_CODE_EXISTS: "Este código já existe para a instituição selecionada.",
  VERSION_NUMBER_EXISTS: "Este número de versão já existe nesta tabela.",
  VERSION_DATE_EXISTS: "Já existe uma versão publicada com esta vigência.",
  SERVICE_PRICE_EXISTS: "Este serviço já possui preço nesta versão. Atualize a consulta.",
  EXTERNAL_CODE_EXISTS: "Este código externo já existe nesta versão.",
  PUBLISHED_IMMUTABLE: "Esta versão já foi publicada e não pode ser alterada. Atualize a consulta.",
  RETROACTIVE_PUBLICATION: "A vigência não pode ser anterior à data UTC atual na publicação.",
  REFERENCE_NOT_FOUND: "Uma referência não foi encontrada. Atualize a consulta.",
  CONCURRENT_CONFIGURATION_CHANGE: "A configuração mudou durante a operação. Atualize a consulta.",
  NOT_FOUND: "Tabela, versão ou preço não encontrado.",
};
function errorText(error) {
  const status = error?.response?.status;
  if (status === 401) return "Sessão expirada. Entre novamente.";
  if (status === 403) return "Esta operação é exclusiva do ADMIN global.";
  return messages[error?.response?.data?.detail?.code] || (status === 422 ? "Confira os campos informados." : error?.response ? "Não foi possível concluir a operação. Tente novamente." : error.message || "Não foi possível carregar os dados.");
}
function Admin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Carregando...</p>;
  return user?.perfil === "ADMIN" ? children : <Navigate to="/dashboard" replace />;
}
function Modal({ title, children, close, busy }) {
  const ref = useRef(null);
  useEffect(() => {
    const opener = document.activeElement;
    ref.current.showModal();
    return () => opener?.focus();
  }, []);
  return <dialog ref={ref} className="economic-dialog price-dialog" aria-label={title} onCancel={e => { e.preventDefault(); if (!busy) close(); }}>
    <h2>{title}</h2>{children}<Button variant="secondary" disabled={busy} onClick={close}>Cancelar</Button>
  </dialog>;
}
function Feedback({ value }) {
  return <>{value.error && <p role="alert">{value.error}</p>}{value.success && <p role="status">{value.success}</p>}</>;
}
// One persisted reload after each command. Route-keyed mounts prevent cross-table stale state.
function useData(load) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ revision: -1 });
  const loader = useRef(load);
  useEffect(() => {
    let current = true;
    loader.current().then(data => { if (current) setState({ revision, data }); })
      .catch(error => { if (current) setState({ revision, error: errorText(error) }); });
    return () => { current = false; };
  }, [revision]);
  return { ...state, loading: state.revision !== revision, reload: () => setRevision(x => x + 1) };
}
function useCommand(reload) {
  const [busy, setBusy] = useState(false), [feedback, setFeedback] = useState({});
  const sending = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function run(operation, done = () => {}) {
    if (sending.current) return;
    sending.current = true; setBusy(true); setFeedback({});
    try {
      const result = await operation();
      if (mounted.current) { done(result); reload(); setFeedback({ success: "Operação concluída. Estado persistido atualizado." }); }
    } catch (error) { if (mounted.current) setFeedback({ error: errorText(error) }); }
    finally { sending.current = false; if (mounted.current) setBusy(false); }
  }
  return { busy, feedback, run };
}
function State({ state }) {
  return state.loading ? <p role="status">Carregando...</p> : state.error ? <p role="alert">{state.error}</p> : null;
}
function TableIdentity({ table }) {
  return <p className="price-identity"><strong>{table.nome}</strong> · {table.codigo}<br />Proprietário: {table.proprietario_nome} · Moeda: {table.moeda}</p>;
}
function VersionFields({ form, setForm }) {
  return <div className="economic-fields">
    <label>Número da versão *<input type="number" min="1" step="1" required value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} /></label>
    <label>Vigente desde *<input type="date" required value={form.vigente_desde} onChange={e => setForm({ ...form, vigente_desde: e.target.value })} /></label>
  </div>;
}
function PriceFields({ form, setForm }) {
  return <div className="economic-fields">
    <label>Valor-base (R$) *<input inputMode="decimal" required value={form.valor_base} onChange={e => setForm({ ...form, valor_base: e.target.value })} placeholder="150,00" /></label>
    <label>Código externo<input maxLength={128} value={form.codigo_externo} onChange={e => setForm({ ...form, codigo_externo: e.target.value })} /></label>
  </div>;
}
const pricePayload = form => ({ valor_base: decimal(form.valor_base), codigo_externo: form.codigo_externo.trim() || null });
const versionPayload = form => ({ numero: Number(form.numero), vigente_desde: form.vigente_desde });

export function TabelasPrecos() { return <Admin><Tables /></Admin>; }
function Tables() {
  const state = useData(() => Promise.all([api.listarTabelas(), listarInstituicoes()]).then(([tables, institutions]) => ({ tables, institutions })));
  const [form, setForm] = useState(null);
  const { busy, feedback, run } = useCommand(state.reload);
  const navigate = useNavigate();
  return <PageLayout>
    <Link to="/admin/economia">Voltar à Administração Econômica</Link>
    <PageHeader title="Tabelas de Preços" description="Configure preços por instituição, versão e serviço econômico." actions={<Button disabled={busy || state.loading || !!state.error} onClick={() => setForm({ proprietario_instituicao_id: "", codigo: "", nome: "" })}>Nova Tabela</Button>} />
    {!form && <Feedback value={feedback} />}<Button variant="secondary" disabled={busy} onClick={state.reload}>Atualizar</Button><State state={state} />
    {!state.loading && !state.error && <CardWidget title="Tabelas cadastradas">
      {!state.data.tables.length ? <EmptyState title="Nenhuma tabela cadastrada" description="Crie uma tabela e depois sua primeira versão." /> : <div className="price-table"><table><thead><tr><th>Proprietário</th><th>Código</th><th>Nome</th><th>Moeda</th><th>Ação</th></tr></thead><tbody>{state.data.tables.map(row => <tr key={row.id}><td>{row.proprietario_nome}</td><td>{row.codigo}</td><td>{row.nome}</td><td>{row.moeda}</td><td><Link to={`${base}/${row.id}`}>Abrir</Link></td></tr>)}</tbody></table></div>}
    </CardWidget>}
    {form && <Modal title="Nova Tabela" busy={busy} close={() => setForm(null)}><Feedback value={feedback} /><form onSubmit={e => { e.preventDefault(); run(() => api.criarTabela({ ...form, proprietario_instituicao_id: Number(form.proprietario_instituicao_id), moeda: "BRL" }), row => navigate(`${base}/${row.id}`)); }}>
      <fieldset disabled={busy}><div className="economic-fields">
        <label>Instituição proprietária *<select required value={form.proprietario_instituicao_id} onChange={e => setForm({ ...form, proprietario_instituicao_id: e.target.value })}><option value="">Selecione</option>{state.data.institutions.map(row => <option key={row.id} value={row.id}>{row.nome_fantasia || row.razao_social}{row.ativo ? "" : " — Inativa"}</option>)}</select></label>
        <label>Código *<input required maxLength={64} value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} /></label>
        <label>Nome *<input required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></label>
      </div><p>Moeda: BRL. Após criar, os dados da tabela serão somente leitura nesta administração.</p><Button type="submit">Criar tabela</Button></fieldset>
    </form></Modal>}
  </PageLayout>;
}

export function DetalheTabelaPreco() {
  const { tabelaId } = useParams();
  return <Admin><Table key={tabelaId} id={tabelaId} /></Admin>;
}
function Table({ id }) {
  const state = useData(() => Promise.all([api.obterTabela(id), api.listarVersoes(id)]).then(([table, versions]) => ({ table, versions })));
  const [form, setForm] = useState(null);
  const { busy, feedback, run } = useCommand(state.reload);
  const navigate = useNavigate();
  return <PageLayout>
    <Link to={base}>Voltar às Tabelas de Preços</Link><PageHeader title="Detalhe da Tabela" />
    {!form && <Feedback value={feedback} />}<Button variant="secondary" disabled={busy} onClick={state.reload}>Atualizar</Button><State state={state} />
    {!state.loading && !state.error && <><TableIdentity table={state.data.table} /><CardWidget title="Versões">
      <Button disabled={busy} onClick={() => setForm({ numero: "", vigente_desde: "" })}>Nova Versão</Button>
      {!state.data.versions.length ? <EmptyState title="Nenhuma versão cadastrada" description="A nova versão começa vazia, sem copiar preços." /> : <div className="price-table"><table><thead><tr><th>Versão</th><th>Vigente desde</th><th>Estado</th><th>Publicado em</th><th>Ação</th></tr></thead><tbody>{state.data.versions.map(row => <tr key={row.id}><td>{row.numero}</td><td>{date(row.vigente_desde)}</td><td>{row.estado === "DRAFT" ? "RASCUNHO" : "PUBLICADA"}</td><td>{row.publicado_em ? new Date(row.publicado_em).toLocaleString("pt-BR") : "—"}</td><td><Link to={`${base}/${id}/versoes/${row.id}`}>Abrir Versão</Link></td></tr>)}</tbody></table></div>}
    </CardWidget></>}
    {form && <Modal title="Nova Versão" busy={busy} close={() => setForm(null)}><Feedback value={feedback} /><form onSubmit={e => { e.preventDefault(); run(() => api.criarVersao(id, versionPayload(form)), row => navigate(`${base}/${id}/versoes/${row.id}`)); }}><fieldset disabled={busy}><VersionFields form={form} setForm={setForm} /><p>Esta versão nasce vazia. Nenhum preço será copiado.</p><Button type="submit">Criar versão</Button></fieldset></form></Modal>}
  </PageLayout>;
}

export function VersaoTabelaPreco() {
  const { tabelaId, versaoId } = useParams();
  return <Admin><Version key={`${tabelaId}/${versaoId}`} tableId={tabelaId} id={versaoId} /></Admin>;
}
function Version({ tableId, id }) {
  const state = useData(async () => {
    const [table, version, grid, services] = await Promise.all([api.obterTabela(tableId), api.obterVersao(id), api.listarPrecos(id), api.listarServicos()]);
    if (String(version.tabela_id) !== tableId) throw new Error("Esta versão não pertence à tabela informada.");
    return { table, version, grid, services };
  });
  const [editor, setEditor] = useState(null), [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState(""), [active, setActive] = useState(""), [confirmed, setConfirmed] = useState(false);
  const { busy, feedback, run } = useCommand(state.reload);
  const ready = !state.loading && !state.error;
  const { table, version, grid, services } = state.data || {};
  const draft = ready && version.estado === "DRAFT";
  const rows = ready ? grid.precos.filter(row => `${row.servico_codigo} ${row.servico_descricao}`.toLocaleLowerCase().includes(filter.toLocaleLowerCase()) && (active === "" || String(row.servico_ativo) === active)) : [];
  const available = ready ? services.filter(s => s.ativo && !grid.precos.some(p => p.servico_id === s.id)) : [];
  const updateForm = form => setEditor(value => ({ ...value, form }));
  function openPublish() { setConfirmed(false); setEditor({ type: "publish" }); }
  function refresh() { setEditing(null); setEditor(null); state.reload(); }
  return <PageLayout>
    <Link to={`${base}/${tableId}`}>Voltar à Tabela</Link><PageHeader title="Versão / Preços" />
    {!editor && <Feedback value={feedback} />}<Button variant="secondary" disabled={busy || !!editing || !!editor} onClick={refresh}>Atualizar</Button><State state={state} />
    {ready && <><TableIdentity table={table} /><CardWidget title={`Versão ${version.numero} — ${draft ? "RASCUNHO" : "PUBLICADA"}`}>
      <p>Vigente desde: {date(version.vigente_desde)}</p>
      {version.publicado_em && <p>Publicado em: {new Date(version.publicado_em).toLocaleString("pt-BR")}. Versão e preços somente leitura.</p>}
      <p>{grid.quantidade_precos} preços cadastrados · {grid.servicos_ativos} serviços ativos · {grid.servicos_inativos} inativos.</p>
      <p>{grid.versao_anterior_id == null ? "Não há versão publicada anterior por vigência para comparação." : `${grid.servicos_anteriores_sem_preco} serviços da versão anterior ainda sem preço nesta versão.`}</p>
      {draft && <div className="economic-actions"><Button variant="secondary" disabled={busy || !!editing} onClick={() => setEditor({ type: "version", form: { numero: String(version.numero), vigente_desde: version.vigente_desde } })}>Editar versão</Button><Button disabled={busy || !!editing} onClick={openPublish}>Publicar versão</Button></div>}
    </CardWidget><CardWidget title="Preços cadastrados">
      <div className="economic-fields"><label>Filtrar serviço<input value={filter} onChange={e => setFilter(e.target.value)} /></label><label>Estado do serviço<select value={active} onChange={e => setActive(e.target.value)}><option value="">Todos</option><option value="true">Ativos</option><option value="false">Inativos</option></select></label></div>
      {draft && <Button disabled={busy || !!editing} onClick={() => setEditor({ type: "price", form: { servico_id: "", valor_base: "", codigo_externo: "" } })}>Adicionar serviço</Button>}
      {editing && <p>Salve ou cancele a edição da linha antes de publicar ou atualizar.</p>}
      {!grid.precos.length ? <EmptyState title="Nenhum preço cadastrado" description="Preço não cadastrado é diferente de R$ 0,00. Esta versão não herda preços." /> : !rows.length ? <p>Nenhum preço corresponde aos filtros.</p> : <div className="price-table"><table><thead><tr>{["Serviço", "Ocupação", "Duração", "Estado", "Valor-base", "Código externo", "Ações"].map(t => <th key={t}>{t}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id}><th scope="row">{row.servico_codigo} — {row.servico_descricao}</th><td>{row.ocupacao_nome}</td><td>{row.duracao_minutos} min</td><td>{row.servico_ativo ? "ATIVO" : "INATIVO"}</td><td>{money(row.valor_base)}</td><td>{row.codigo_externo || "—"}</td><td>{draft ? <div className="economic-actions"><Button variant="secondary" disabled={busy || !!editing} onClick={() => setEditing({ ...row, valor_base: String(row.valor_base).replace(".", ","), codigo_externo: row.codigo_externo || "" })}>Editar preço</Button><Button variant="danger" disabled={busy || !!editing} onClick={() => setEditor({ type: "remove", row })}>Remover preço</Button></div> : "Somente leitura"}</td></tr>)}</tbody></table></div>}
      {draft && editing && <form className="price-inline" aria-label="Editar preço" onSubmit={e => { e.preventDefault(); run(() => api.atualizarPreco(editing.id, pricePayload(editing)), () => setEditing(null)); }}><h3>{editing.servico_descricao}</h3><fieldset disabled={busy}><PriceFields form={editing} setForm={setEditing} /><div className="economic-actions"><Button type="submit">Salvar preço</Button><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancelar edição</Button></div></fieldset></form>}
      {!!grid.servicos_inativos && <p>Preços de serviços inativos são preservados. Esses serviços podem gerar pendências nas novas projeções.</p>}
    </CardWidget></>}
    {editor && ready && <Modal title={editor.type === "publish" ? "Publicar versão" : editor.type === "version" ? "Editar versão" : editor.type === "remove" ? "Remover preço" : "Adicionar serviço"} busy={busy} close={() => setEditor(null)}>
      <Feedback value={feedback} />
      {editor.type === "version" && <form onSubmit={e => { e.preventDefault(); run(() => api.atualizarVersao(id, versionPayload(editor.form)), () => setEditor(null)); }}><fieldset disabled={busy}><VersionFields form={editor.form} setForm={updateForm} /><p>A publicação exige vigência igual ou posterior à data UTC atual do banco.</p><Button type="submit">Salvar versão</Button></fieldset></form>}
      {editor.type === "price" && <form onSubmit={e => { e.preventDefault(); run(() => api.criarPreco(id, { ...pricePayload(editor.form), servico_id: Number(editor.form.servico_id) }), () => setEditor(null)); }}><fieldset disabled={busy}><div className="economic-fields"><label>Serviço econômico *<select required value={editor.form.servico_id} onChange={e => updateForm({ ...editor.form, servico_id: e.target.value })}><option value="">Selecione um serviço ativo</option>{available.map(s => <option value={s.id} key={s.id}>{s.codigo} — {s.descricao} · {s.ocupacao_nome} · {s.duracao_minutos} min{s.em_uso ? " · Em uso" : ""}</option>)}</select></label></div>{!available.length && <p>Nenhum serviço ativo disponível para adicionar.</p>}<PriceFields form={editor.form} setForm={updateForm} /><p>Informe zero explicitamente para cadastrar R$ 0,00.</p><Button type="submit" disabled={!available.length}>Salvar preço</Button></fieldset></form>}
      {editor.type === "remove" && <><p>Remover o preço de {editor.row.servico_descricao}? O serviço ficará sem preço nesta versão.</p><Button variant="danger" disabled={busy} onClick={() => run(() => api.excluirPreco(editor.row.id), () => setEditor(null))}>Confirmar remoção</Button></>}
      {editor.type === "publish" && <><p>{table.nome} · Versão {version.numero} · Vigente desde {date(version.vigente_desde)}</p><p>{grid.quantidade_precos} preços cadastrados.</p><p>{grid.servicos_anteriores_sem_preco} serviços da versão anterior ainda sem preço nesta versão.</p><div className="price-warning" role="note"><p>Esta versão não herda preços de versões anteriores. Serviços sem preço poderão gerar pendências nas projeções.</p><p>Após publicar, esta versão e seus preços não poderão ser alterados.</p>{(!grid.quantidade_precos || grid.servicos_anteriores_sem_preco > 0) && <strong>Atenção: versão vazia ou com preços ausentes em relação à anterior. A publicação permanece permitida.</strong>}</div><label className="price-confirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} />Entendo os avisos e confirmo a publicação desta versão.</label><Button disabled={busy || !confirmed} onClick={() => run(() => api.publicarVersao(id), () => setEditor(null))}>Confirmar publicação</Button></>}
    </Modal>}
  </PageLayout>;
}
