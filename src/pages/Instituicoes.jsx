import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageLayout from "../components/layouts/PageLayout";
import PageHeader from "../components/ui/PageHeader";
import CardWidget from "../components/ui/CardWidget";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import {
  listarInstituicoes, obterInstituicao, criarInstituicao,
  atualizarInstituicao, ativarInstituicao, inativarInstituicao,
} from "../services/instituicoes";

const tipos = {
  CLINICA: "Clínica",
  UNIDADE_SAUDE: "Unidade de Saúde",
  OPERADORA_SAUDE: "Operadora de Saúde",
  GOVERNO_SECRETARIA: "Governo / Secretaria",
  EMPRESA: "Empresa",
  INSTITUTO_ASSOCIACAO: "Instituto / Associação",
  OUTRO: "Outro",
};
const mensagens = {
  INVALID_PAYLOAD: "Confira os campos obrigatórios, o CNPJ e o tipo de instituição.",
  CNPJ_ALREADY_EXISTS: "Este CNPJ já está cadastrado em outra instituição.",
  PARENT_INSTITUTION_NOT_FOUND: "A instituição superior não foi encontrada. Reabra o formulário para atualizar as opções.",
  INSTITUTION_HIERARCHY_CYCLE: "A instituição superior selecionada criaria um ciclo na hierarquia.",
  INSTITUTION_NOT_FOUND: "Instituição não encontrada.",
  ADMIN_REQUIRED: "Esta operação é exclusiva do ADMIN global.",
  CLEAN_SESSION_REQUIRED: "Não foi possível concluir a operação. Tente novamente.",
  INSTITUTION_OPERATION_FAILED: "Não foi possível concluir a operação. Tente novamente.",
};
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 16 };
const campo = { width: "100%", boxSizing: "border-box", padding: 10, marginTop: 6 };
const celula = { textAlign: "left", padding: 12, borderBottom: "1px solid #e5e7eb" };
const nome = (item) => item.nome_fantasia?.trim() || item.razao_social;

function erroApi(error) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg).filter(Boolean).join("; ") || mensagens.INVALID_PAYLOAD;
  if (detail?.code && mensagens[detail.code]) return mensagens[detail.code];
  if (typeof detail?.message === "string") return detail.message;
  if (error?.response?.status === 401) return "Sessão expirada. Entre novamente.";
  if (error?.response?.status === 403) return "Esta operação é exclusiva do ADMIN global.";
  if (error?.response?.status === 422) return mensagens.INVALID_PAYLOAD;
  return "Não foi possível comunicar com o servidor. Tente novamente.";
}

function formulario(item = {}) {
  return {
    razao_social: item.razao_social || "",
    nome_fantasia: item.nome_fantasia || "",
    cnpj: item.cnpj || "",
    tipo_instituicao: item.tipo_instituicao || "",
    instituicao_pai_id: item.instituicao_pai_id == null ? "" : String(item.instituicao_pai_id),
  };
}

function payload(form) {
  return {
    razao_social: form.razao_social.trim(),
    nome_fantasia: form.nome_fantasia.trim() || null,
    cnpj: form.cnpj.trim() || null,
    tipo_instituicao: form.tipo_instituicao,
    instituicao_pai_id: form.instituicao_pai_id ? Number(form.instituicao_pai_id) : null,
  };
}

export default function Instituicoes() {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Carregando...</p>;
  if (user?.perfil !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return <AdministracaoInstituicoes />;
}

function AdministracaoInstituicoes() {
  const [status, setStatus] = useState("");
  const [tipo, setTipo] = useState("");
  const [revisao, setRevisao] = useState(0);
  const [lista, setLista] = useState({ chave: null, itens: [], erro: "" });
  const [editor, setEditor] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [feedback, setFeedback] = useState({ erro: "", sucesso: "" });
  const enviando = useRef(false);
  const edicao = useRef(0);
  const montado = useRef(true);
  const tituloForm = useRef(null);
  const chave = JSON.stringify([status, tipo, revisao]);
  const carregando = lista.chave !== chave;

  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; edicao.current += 1; };
  }, []);

  useEffect(() => {
    let atual = true;
    const filtros = {};
    if (status !== "") filtros.ativo = status === "true";
    if (tipo) filtros.tipo_instituicao = tipo;
    listarInstituicoes(filtros).then((itens) => {
      if (atual) setLista({ chave, itens, erro: "" });
    }).catch((error) => {
      if (atual) setLista({ chave, itens: [], erro: erroApi(error) });
    });
    return () => { atual = false; };
  }, [chave, status, tipo]);

  async function abrir(id = null) {
    if (enviando.current) return;
    const chamada = ++edicao.current;
    setEditor({ id, carregando: true, erro: "" });
    setFeedback({ erro: "", sucesso: "" });
    requestAnimationFrame(() => tituloForm.current?.focus());
    try {
      const [instituicao, superiores] = await Promise.all([
        id == null ? Promise.resolve({}) : obterInstituicao(id), listarInstituicoes(),
      ]);
      if (chamada === edicao.current && montado.current) {
        const form = formulario(instituicao);
        setEditor({ id, carregando: false, form, original: payload(form), superiores, erro: "" });
      }
    } catch (error) {
      if (chamada === edicao.current && montado.current) setEditor({ id, carregando: false, erro: erroApi(error) });
    }
  }

  function fechar() {
    if (enviando.current) return;
    edicao.current += 1;
    setEditor(null);
  }

  async function salvar(event) {
    event.preventDefault();
    if (enviando.current || !editor?.form) return;
    const dados = payload(editor.form);
    if (!dados.razao_social || !dados.tipo_instituicao) {
      setEditor((atual) => ({ ...atual, erro: "Informe a razão social e o tipo de instituição." }));
      return;
    }
    const alteracoes = Object.fromEntries(Object.entries(dados).filter(([key, value]) => value !== editor.original[key]));
    if (editor.id != null && !Object.keys(alteracoes).length) {
      setEditor((atual) => ({ ...atual, erro: "Nenhuma alteração para salvar." }));
      return;
    }
    enviando.current = true;
    setOcupado(true);
    setEditor((atual) => ({ ...atual, erro: "" }));
    try {
      if (editor.id == null) await criarInstituicao(dados);
      else await atualizarInstituicao(editor.id, alteracoes);
      if (montado.current) {
        setFeedback({ erro: "", sucesso: editor.id == null ? "Instituição criada com sucesso." : "Instituição atualizada com sucesso." });
        setEditor(null);
        setRevisao((v) => v + 1);
      }
    } catch (error) {
      if (montado.current) setEditor((atual) => ({ ...atual, erro: erroApi(error) }));
    } finally {
      enviando.current = false;
      if (montado.current) setOcupado(false);
    }
  }

  async function mudarStatus(item) {
    if (enviando.current) return;
    const acao = item.ativo ? "Inativar" : "Ativar";
    if (!window.confirm(`${acao} a instituição “${nome(item)}”?`)) return;
    enviando.current = true;
    setOcupado(true);
    setFeedback({ erro: "", sucesso: "" });
    try {
      if (item.ativo) await inativarInstituicao(item.id);
      else await ativarInstituicao(item.id);
      if (montado.current) {
        setFeedback({ erro: "", sucesso: item.ativo ? "Instituição inativada com sucesso." : "Instituição ativada com sucesso." });
        setRevisao((v) => v + 1);
      }
    } catch (error) {
      if (montado.current) setFeedback({ erro: erroApi(error), sucesso: "" });
    } finally {
      enviando.current = false;
      if (montado.current) setOcupado(false);
    }
  }

  const alterar = (key, value) => setEditor((atual) => ({ ...atual, form: { ...atual.form, [key]: value } }));
  return <PageLayout>
    <PageHeader title="Instituições" description="Gestão das organizações que participam da operação institucional e financeira do Integra Care."
      actions={<Button disabled={ocupado} onClick={() => abrir()}>+ Nova instituição</Button>} />
    {feedback.sucesso && <p role="status" style={{ color: "#166534" }}>{feedback.sucesso}</p>}
    {feedback.erro && <p role="alert" style={{ color: "#991b1b" }}>{feedback.erro}</p>}
    {editor && <CardWidget title={editor.id == null ? "Nova instituição" : "Editar instituição"}>
      <div ref={tituloForm} tabIndex={-1} aria-label="Formulário de instituição">
        {editor.carregando ? <p role="status">Carregando formulário...</p> : editor.form &&
          <form onSubmit={salvar} aria-label="Cadastro de instituição">
            <fieldset disabled={ocupado} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
              <div style={grid}>
                <label>Razão social *<input required style={campo} value={editor.form.razao_social} onChange={(e) => alterar("razao_social", e.target.value)} /></label>
                <label>Nome fantasia<input style={campo} value={editor.form.nome_fantasia} onChange={(e) => alterar("nome_fantasia", e.target.value)} /></label>
                <label>CNPJ<input style={campo} value={editor.form.cnpj} onChange={(e) => alterar("cnpj", e.target.value)} placeholder="Opcional" /></label>
                <label>Tipo de instituição *<select aria-label="Tipo de instituição *" required style={campo} value={editor.form.tipo_instituicao} onChange={(e) => alterar("tipo_instituicao", e.target.value)}><option value="">Selecione</option>{Object.entries(tipos).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label>Instituição superior<select aria-label="Instituição superior" style={campo} value={editor.form.instituicao_pai_id} onChange={(e) => alterar("instituicao_pai_id", e.target.value)}><option value="">Nenhuma</option>{editor.superiores.map((item) => <option key={item.id} value={item.id}>{nome(item)}{item.ativo ? "" : " (Inativa)"}</option>)}</select></label>
              </div>
              <div style={{ marginTop: 20 }}><Button type="submit" disabled={ocupado}>{ocupado ? "Salvando..." : "Salvar instituição"}</Button></div>
            </fieldset>
          </form>}
        {editor.erro && <p role="alert" style={{ color: "#991b1b" }}>{editor.erro}</p>}
        {!editor.carregando && !editor.form && <Button variant="secondary" onClick={() => abrir(editor.id)}>Tentar carregar formulário novamente</Button>}
        <Button style={{ marginTop: 12 }} variant="secondary" disabled={ocupado} onClick={fechar}>Cancelar</Button>
      </div>
    </CardWidget>}
    <CardWidget title="Instituições cadastradas">
      <div style={grid}>
        <label>Status<select aria-label="Status" style={campo} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todas</option><option value="true">Ativas</option><option value="false">Inativas</option></select></label>
        <label>Tipo<select aria-label="Tipo" style={campo} value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="">Todos</option>{Object.entries(tipos).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      {carregando ? <p role="status">Carregando instituições...</p> : lista.erro ?
        <div><p role="alert">{lista.erro}</p><Button variant="secondary" onClick={() => setRevisao((v) => v + 1)}>Tentar novamente</Button></div> : !lista.itens.length ?
          <EmptyState compact title="Nenhuma instituição encontrada" description="Não há instituições para os filtros selecionados." /> :
          <div style={{ overflowX: "auto", marginTop: 20 }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
            <caption style={{ textAlign: "left", paddingBottom: 12 }}>Cadastro institucional — {lista.itens.length} resultado(s)</caption>
            <thead><tr>{["Nome", "Tipo", "CNPJ", "Status", "Ações"].map((label) => <th key={label} scope="col" style={celula}>{label}</th>)}</tr></thead>
            <tbody>{lista.itens.map((item) => <tr key={item.id}>
              <th scope="row" style={{ ...celula, overflowWrap: "anywhere" }}>{nome(item)}</th>
              <td style={celula}>{tipos[item.tipo_instituicao] || item.tipo_instituicao}</td><td style={celula}>{item.cnpj || "—"}</td><td style={celula}>{item.ativo ? "Ativa" : "Inativa"}</td>
              <td style={celula}><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Button variant="secondary" disabled={ocupado} onClick={() => abrir(item.id)}>Editar</Button>
                <Button variant={item.ativo ? "danger" : "secondary"} disabled={ocupado || !!editor} onClick={() => mudarStatus(item)}>{item.ativo ? "Inativar" : "Ativar"}</Button>
              </div></td>
            </tr>)}</tbody>
          </table></div>}
      {ocupado && !editor && <p role="status">Atualizando status...</p>}
    </CardWidget>
  </PageLayout>;
}
