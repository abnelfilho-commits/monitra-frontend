import { useEffect, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useAuth } from "../context/AuthContext";
import ConsolidacaoMensalResultado from "../components/ConsolidacaoMensalResultado";
import { listarInstituicoes } from "../services/instituicoes";
import { listarOcupacoesProfissionais } from "../services/atividadesTerapeuticas";
import { consultarConsolidacaoMensal } from "../services/consolidacaoMensal";
import { obterContextoFinanceiroInstitucional, gerarPreviewFinanceiroInstitucional } from "../services/financeiroInstitucional";
import "./Dimensionamento.css";

const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(210px, 100%), 1fr))", gap: 16 };
const numero = valor => valor == null ? "Não disponível" : Number(valor).toLocaleString("pt-BR");
const moeda = valor => valor == null ? "Não precificado" : Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const nome = item => item.nome_fantasia?.trim() || item.razao_social;
const erro = error => ({
  401: "Sessão expirada. Entre novamente para continuar.",
  403: "Você não tem autorização para consultar este contexto.",
  404: "Contexto não encontrado.",
  409: "Contexto indisponível para esta consulta.",
  422: "Revise os filtros: o contexto informado não foi aceito.",
  500: "Não foi possível concluir a consulta.",
  503: "Serviço temporariamente indisponível.",
}[error?.response?.status] || "Falha de comunicação. Tente novamente.");

// Each block owns its request. Unmount, filter edits and identity changes invalidate it.
function useConsulta() {
  const [consulta, setConsulta] = useState({ estado: "inicial" });
  const execucao = useRef(0);
  const pendente = useRef(false);
  useEffect(() => () => { execucao.current += 1; }, []);
  function limpar() {
    execucao.current += 1; pendente.current = false; setConsulta({ estado: "inicial" });
  }
  async function executar(obter, filtros) {
    if (pendente.current) return;
    pendente.current = true;
    const atual = ++execucao.current;
    setConsulta({ estado: "carregando" });
    try {
      const dados = await obter();
      if (atual === execucao.current) setConsulta({ estado: "sucesso", dados, filtros });
    } catch (error) {
      if (atual === execucao.current) setConsulta({ estado: "erro", mensagem: erro(error) });
    } finally {
      if (atual === execucao.current) pendente.current = false;
    }
  }
  return { consulta, executar, limpar };
}
function Estado({ consulta }) {
  return <div aria-live="polite" aria-busy={consulta.estado === "carregando"}>
    {consulta.estado === "inicial" && <p>Selecione os filtros e clique em Atualizar.</p>}
    {consulta.estado === "carregando" && <p role="status">Consultando…</p>}
    {consulta.estado === "erro" && <p role="alert">{consulta.mensagem}</p>}
  </div>;
}
function Assistencial({ instituicao }) {
  const [mes, setMes] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; });
  const [ocupacao, setOcupacao] = useState("");
  const [ocupacoes, setOcupacoes] = useState([]);
  const [falhaCatalogo, setFalhaCatalogo] = useState(false);
  const { consulta, executar, limpar } = useConsulta();
  useEffect(() => {
    let vigente = true;
    listarOcupacoesProfissionais().then(rows => { if (vigente) setOcupacoes(rows); }).catch(() => { if (vigente) setFalhaCatalogo(true); });
    return () => { vigente = false; };
  }, []);
  return <section aria-labelledby="cockpit-assistencial">
    <h2 id="cockpit-assistencial">Assistencial — consolidação institucional</h2>
    <p>Recorte de toda a instituição, sem filtro por linha assistencial ou contrato. Não é exclusivo de Neurodesenvolvimento.</p>
    <form className="dimensionamento-mensal-filtros" onSubmit={event => {
      event.preventDefault();
      executar(() => consultarConsolidacaoMensal({ instituicao_id: instituicao.id, mes_referencia: mes, ocupacao_id: ocupacao }), { mes, ocupacao: ocupacoes.find(o => String(o.id) === ocupacao)?.nome || "Todas as ocupações" });
    }}>
      <label>Competência assistencial<input required type="month" value={mes} onChange={e => { limpar(); setMes(e.target.value); }} /></label>
      <label>Ocupação<select aria-label="Ocupação" value={ocupacao} onChange={e => { limpar(); setOcupacao(e.target.value); }}><option value="">Todas as ocupações</option>{ocupacoes.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}</select></label>
      <button disabled={consulta.estado === "carregando"}>Atualizar assistencial</button>
    </form>
    {falhaCatalogo && <p role="status">Não foi possível carregar ocupações. A consulta sem filtro permanece disponível.</p>}
    <Estado consulta={consulta} />
    {consulta.estado === "sucesso" && <p>Consulta assistencial: {nome(instituicao)} · {consulta.filtros.mes} · {consulta.filtros.ocupacao}.</p>}
    <ConsolidacaoMensalResultado consulta={consulta} ocupacoes={ocupacoes} />
  </section>;
}

function Financeiro({ instituicao }) {
  const [contexto, setContexto] = useState(null);
  const [erroContexto, setErroContexto] = useState("");
  const [contrato, setContrato] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const { consulta, executar, limpar } = useConsulta();
  useEffect(() => {
    let vigente = true;
    obterContextoFinanceiroInstitucional().then(data => { if (vigente) setContexto(data); }).catch(error => { if (vigente) setErroContexto(erro(error)); });
    return () => { vigente = false; };
  }, []);
  const autorizado = contexto?.instituicoes?.some(i => i.id === instituicao.id);
  const contratos = autorizado ? (contexto.contratos || []).filter(c => c.instituicao_id === instituicao.id) : [];
  const resumo = consulta.dados?.resumo;
  return <section aria-labelledby="cockpit-financeiro">
    <h2 id="cockpit-financeiro">Econômico — Neurodesenvolvimento</h2>
    <p>Projeção do contrato e período selecionados. Não representa o custo da demanda institucional do bloco assistencial.</p>
    {!contexto && !erroContexto && <p role="status">Carregando contexto financeiro…</p>}
    {erroContexto && <p role="alert">{erroContexto}</p>}
    {contexto && !autorizado && <p role="alert">Instituição não disponível no seu contexto financeiro autorizado.</p>}
    {autorizado && <>
      {contratos.length === 0 && <p>Nenhum contrato disponível para esta instituição.</p>}
      <form className="dimensionamento-mensal-filtros" onSubmit={event => {
        event.preventDefault();
        const selecionado = contratos.find(c => String(c.id) === contrato);
        if (!selecionado || !inicio || !fim || inicio > fim) return;
        executar(async () => {
          const data = await gerarPreviewFinanceiroInstitucional({ instituicao_id: instituicao.id, contrato_id: selecionado.id, modulo_id: 1, data_inicio: inicio, data_fim: fim });
          // Retain aggregate fields only; never render patient or session details.
          return { resumo: data.resumo, totais_por_mes: (data.totais_por_mes || []).map(m => ({ mes: m.mes, subtotal_precificado: m.subtotal_precificado })), pendencias: (data.pendencias || []).map(p => ({ codigo: p.codigo, quantidade_pendente: p.quantidade_pendente })) };
        }, { inicio, fim, contrato: `${selecionado.codigo} — edição ${selecionado.edicao}` });
      }}>
        <label>Contrato<select aria-label="Contrato" required value={contrato} onChange={e => { limpar(); setContrato(e.target.value); }}><option value="">Selecione um contrato</option>{contratos.map(c => <option key={c.id} value={c.id}>{c.codigo} — edição {c.edicao}</option>)}</select></label>
        <label>Módulo<select aria-label="Módulo" value="1" disabled><option value="1">Neurodesenvolvimento</option></select></label>
        <label>Data inicial<input required type="date" value={inicio} max={fim || undefined} onChange={e => { limpar(); setInicio(e.target.value); }} /></label>
        <label>Data final<input required type="date" value={fim} min={inicio || undefined} onChange={e => { limpar(); setFim(e.target.value); }} /></label>
        <button disabled={consulta.estado === "carregando" || !contratos.length}>Atualizar econômico</button>
      </form>
      <Estado consulta={consulta} />
      {consulta.estado === "sucesso" && <>
        <p>Consulta econômica: {nome(instituicao)} · Neurodesenvolvimento · {consulta.filtros.contrato} · {consulta.filtros.inicio} a {consulta.filtros.fim}.</p>
        <p>Completude: {resumo?.completude === "COM_PENDENCIAS" ? "Com pendências" : resumo?.completude || "Não informada"}. O subtotal inclui somente itens precificados e não representa o custo total do planejamento.</p>
        <dl style={grid} className="dimensionamento-mensal-resumo">
          <div className="mensal-indicador"><dt>Subtotal precificado</dt><dd>{moeda(resumo?.subtotal_precificado)}</dd></div>
          <div className="mensal-indicador"><dt>Sessões consideradas</dt><dd>{numero(resumo?.quantidade_considerada)}</dd></div>
          <div className="mensal-indicador"><dt>Cobertura de precificação</dt><dd>{resumo?.cobertura_percentual == null ? "Não disponível" : `${numero(resumo.cobertura_percentual)}%`}</dd></div>
          <div className="mensal-indicador"><dt>Sessões pendentes de precificação</dt><dd>{numero(resumo?.quantidade_pendente)}</dd></div>
        </dl>
        {resumo?.quantidade_considerada === 0 && <p>Sem sessões consideradas no período consultado.</p>}
        <p>A cobertura é o percentual de sessões precificadas, não de valor financeiro.</p>
        <h3>Evolução econômica mensal</h3>
        {consulta.dados.totais_por_mes.length ? <>
          <div style={{ height: 240 }} aria-hidden="true"><ResponsiveContainer width="100%" height="100%"><BarChart data={consulta.dados.totais_por_mes.map(m => ({ ...m, valor: m.subtotal_precificado == null ? null : Number(m.subtotal_precificado) }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" /><YAxis /><Tooltip formatter={moeda} /><Bar dataKey="valor" fill="#2563eb" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
          <ul aria-label="Valores da evolução mensal">{consulta.dados.totais_por_mes.map(m => <li key={m.mes}>{m.mes}: {moeda(m.subtotal_precificado)}</li>)}</ul>
        </> : <p>Sem evolução mensal retornada neste recorte.</p>}
        <h3>Pendências econômicas agregadas</h3>
        {consulta.dados.pendencias.length ? <ul>{consulta.dados.pendencias.map((p, i) => <li key={i}>{p.codigo}: {numero(p.quantidade_pendente)}</li>)}</ul> : <p>Nenhuma pendência retornada.</p>}
      </>}
    </>}
  </section>;
}
function Cockpit() {
  const [instituicoes, setInstituicoes] = useState(null);
  const [falha, setFalha] = useState("");
  const [selecionada, setSelecionada] = useState("");
  useEffect(() => {
    let vigente = true;
    listarInstituicoes().then(rows => { if (vigente) setInstituicoes(rows); }).catch(error => { if (vigente) setFalha(erro(error)); });
    return () => { vigente = false; };
  }, []);
  const instituicao = instituicoes?.find(i => String(i.id) === selecionada);
  return <div className="dimensionamento-mensal-provisorio" style={{ minWidth: 0, overflowWrap: "anywhere" }}>
    <h1>Visão Econômico-Assistencial</h1>
    <p>Consultas independentes: assistencial institucional e econômico de Neurodesenvolvimento. Não há comparação ou cálculo cruzado entre os blocos.</p>
    <div className="dimensionamento-mensal-filtros"><label>Instituição comum<select aria-label="Instituição comum" value={selecionada} disabled={!instituicoes} onChange={e => setSelecionada(e.target.value)}><option value="">Selecione uma instituição</option>{instituicoes?.map(i => <option key={i.id} value={i.id}>{nome(i)}</option>)}</select></label></div>
    {falha && <p role="alert">{falha}</p>}
    {!instituicoes && !falha && <p role="status">Carregando instituições…</p>}
    {instituicoes?.length === 0 && <p>Nenhuma instituição disponível.</p>}
    {instituicao && <div key={instituicao.id}><Assistencial instituicao={instituicao} /><hr /><Financeiro instituicao={instituicao} /></div>}
  </div>;
}
export default function VisaoEconomicoAssistencial() {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Validando identidade…</p>;
  if (user?.perfil !== "ADMIN") return <p role="alert">Acesso exclusivo para ADMIN.</p>;
  return <Cockpit key={user.id} />;
}
