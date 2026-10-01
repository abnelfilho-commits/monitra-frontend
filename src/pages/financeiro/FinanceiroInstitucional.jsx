import { useEffect, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Button from "../../components/ui/Button";
import PageLayout from "../../components/layouts/PageLayout";
import PageHeader from "../../components/ui/PageHeader";
import CardWidget from "../../components/ui/CardWidget";
import StatCard from "../../components/ui/StatCard";
import EmptyState from "../../components/ui/EmptyState";
import { obterContextoFinanceiroInstitucional, gerarPreviewFinanceiroInstitucional } from "../../services/financeiroInstitucional";

const pendencias = {
  NO_PRICE: "Preço não cadastrado",
  NO_CONTRACT: "Sem cobertura contratual aplicável",
  NO_ECONOMIC_SERVICE_MAPPING: "Agenda sem serviço econômico vinculado",
  INCOMPATIBLE_ECONOMIC_SERVICE_MAPPING: "Serviço incompatível com o planejamento",
  NO_APPLICABLE_PRICE_TABLE_VERSION: "Sem versão de tabela vigente",
};
const moeda = (valor) => valor == null ? "Não precificado" : Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numero = (valor) => valor == null ? "Não disponível" : Number(valor).toLocaleString("pt-BR");
const data = (valor) => valor ? valor.split("-").reverse().join("/") : "Não informado";
const referencia = (tipo, id) => id == null ? "Não informado" : `${tipo} #${id}`;
const motivo = (codigo) => codigo ? pendencias[codigo] || `Pendência: ${codigo}` : "—";
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 };
const campo = { width: "100%", padding: 10, marginTop: 6, boxSizing: "border-box" };
const celula = { padding: "12px 10px", textAlign: "left", borderBottom: "1px solid #e5e7eb" };

function mensagemErro(error) {
  switch (error?.response?.status) {
    case 401: return "Sessão expirada ou inválida. Entre novamente para continuar.";
    case 403: return "Você não tem autorização para consultar esta instituição.";
    case 422: return "Não foi possível gerar a projeção com este contexto. Confira instituição, contrato, linha e período.";
    default: return "Não foi possível concluir a solicitação. Tente novamente.";
  }
}

export default function FinanceiroInstitucional() {
  const [contexto, setContexto] = useState(null);
  const [filtros, setFiltros] = useState({ instituicao_id: "", contrato_id: "", modulo_id: "", data_inicio: "", data_fim: "" });
  const [preview, setPreview] = useState(null);
  const [loadingContexto, setLoadingContexto] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [selecao, setSelecao] = useState(null);
  const requisicao = useRef(0);
  const detalheRef = useRef(null);

  useEffect(() => {
    let ativo = true;
    obterContextoFinanceiroInstitucional().then((result) => {
      if (ativo) setContexto(result);
    }).catch((error) => {
      if (ativo) setErro(mensagemErro(error));
    }).finally(() => {
      if (ativo) setLoadingContexto(false);
    });
    return () => { ativo = false; requisicao.current += 1; };
  }, [tentativa]);

  const contratos = (contexto?.contratos || []).filter((c) => String(c.instituicao_id) === filtros.instituicao_id);
  function alterar(nome, valor) {
    requisicao.current += 1;
    setLoadingPreview(false);
    setPreview(null);
    setSelecao(null);
    setErro("");
    setFiltros((atual) => ({ ...atual, [nome]: valor, ...(nome === "instituicao_id" ? { contrato_id: "" } : {}) }));
  }
  async function gerar(event) {
    event.preventDefault();
    if (loadingPreview) return;
    if (Object.values(filtros).some((v) => !v) || filtros.data_inicio > filtros.data_fim) {
      setErro("Selecione todos os campos e informe um período válido.");
      return;
    }
    const id = ++requisicao.current;
    setErro(""); setPreview(null); setSelecao(null); setLoadingPreview(true);
    try {
      const resultado = await gerarPreviewFinanceiroInstitucional({ ...filtros,
        instituicao_id: Number(filtros.instituicao_id), contrato_id: Number(filtros.contrato_id), modulo_id: Number(filtros.modulo_id) });
      if (id === requisicao.current) setPreview(resultado);
    } catch (error) {
      if (id === requisicao.current) setErro(mensagemErro(error));
    } finally {
      if (id === requisicao.current) setLoadingPreview(false);
    }
  }
  function abrir(titulo, chave, valor) {
    setSelecao({ titulo, chave, valor });
    requestAnimationFrame(() => { detalheRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); detalheRef.current?.focus({ preventScroll: true }); });
  }
  const detalhes = (preview?.detalhes || []).filter((d) => {
    if (!selecao?.chave) return true;
    if (selecao.chave === "paciente_id") return d.paciente_id === selecao.valor;
    if (selecao.chave === "mes") return d.item.data_economica?.slice(0, 7) === selecao.valor;
    return d.item[selecao.chave] === selecao.valor;
  });
  const resumo = preview?.resumo;
  const servico = (id) => {
    const codigo = preview?.detalhes?.find((d) => d.item.servico_id === id)?.item.servico_codigo;
    return codigo || referencia("Serviço", id);
  };
  function tabela(linhas, tituloColuna, rotulo, chave, identidade) {
    if (!linhas?.length) return <EmptyState compact title="Sem itens nesta dimensão" />;
    return <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
      <caption style={{ textAlign: "left", padding: "8px 10px" }}>Selecione um item para consultar sua origem.</caption>
      <thead><tr>{[tituloColuna, "Consideradas", "Precificadas", "Pendentes", "Subtotal precificado"].map((h) => <th scope="col" style={celula} key={h}>{h}</th>)}</tr></thead>
      <tbody>{linhas.map((r) => <tr key={r[identidade]}>
        <th scope="row" style={celula}><Button onClick={() => abrir(rotulo(r), chave, r[identidade])}>{rotulo(r)}</Button></th>
        <td style={celula}>{numero(r.quantidade_considerada)}</td><td style={celula}>{numero(r.quantidade_precificada)}</td>
        <td style={celula}>{numero(r.quantidade_pendente)}</td><td style={celula}>{moeda(r.subtotal_precificado)}</td>
      </tr>)}</tbody></table></div>;
  }

  return <PageLayout size="wide"><PageHeader title="Financeiro Institucional" description="Projeção financeiro-assistencial por instituição, contrato, linha e período." />
    <div style={{ display: "grid", gap: 24, minWidth: 0 }}>
      <CardWidget title="Contexto da projeção" description="Selecione explicitamente o contexto. Cada execução gera uma nova projeção.">
        {loadingContexto ? <p role="status">Carregando contexto financeiro...</p> : contexto && !contexto.instituicoes?.length ?
          <EmptyState title="Nenhuma instituição disponível" description="Não há instituição ativa disponível para sua conta." /> : contexto ?
          <form onSubmit={gerar}>
            <div style={grid}>
              <label>Instituição<select required style={campo} value={filtros.instituicao_id} onChange={(e) => alterar("instituicao_id", e.target.value)}><option value="">Selecione</option>{contexto.instituicoes.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}</select></label>
              <label>Contrato<select required disabled={!filtros.instituicao_id} style={campo} value={filtros.contrato_id} onChange={(e) => alterar("contrato_id", e.target.value)}><option value="">Selecione</option>{contratos.map((c) => <option key={c.id} value={c.id}>{c.codigo} — edição {c.edicao}</option>)}</select></label>
              <label>Linha assistencial<select required style={campo} value={filtros.modulo_id} onChange={(e) => alterar("modulo_id", e.target.value)}><option value="">Selecione</option><option value="1">Neurodesenvolvimento</option></select></label>
              <label>Data inicial<input required type="date" style={campo} value={filtros.data_inicio} onChange={(e) => alterar("data_inicio", e.target.value)} /></label>
              <label>Data final<input required type="date" min={filtros.data_inicio || undefined} style={campo} value={filtros.data_fim} onChange={(e) => alterar("data_fim", e.target.value)} /></label>
            </div>
            {filtros.instituicao_id && !contratos.length && <p>Não há contratos publicados disponíveis para esta instituição.</p>}
            <div style={{ marginTop: 16 }}><Button type="submit" disabled={loadingPreview || !contratos.length}>{loadingPreview ? "Gerando projeção..." : "Gerar projeção"}</Button></div>
          </form> : <Button onClick={() => { setErro(""); setLoadingContexto(true); setTentativa((v) => v + 1); }}>Tentar carregar contexto novamente</Button>}
        {erro && <p role="alert" style={{ color: "#991b1b" }}>{erro}</p>}
      </CardWidget>
      {loadingPreview && <p role="status">Consultando planejamento e preços. Aguarde a projeção completa.</p>}
      {!preview && !loadingPreview && !loadingContexto && !erro && <EmptyState title="Prepare sua projeção" description="Escolha o contexto e clique em Gerar projeção para visualizar os resultados." />}
      {preview && <>
        <p role="status">Período: {data(preview.data_inicio)} a {data(preview.data_fim)}. Os detalhes pertencem a esta execução.</p>
        {resumo.completude === "COM_PENDENCIAS" && <CardWidget title="Resultado com pendências" description="O subtotal inclui somente os itens precificados e não representa o custo total do planejamento." />}
        <div style={grid}>
          <StatCard title="Subtotal precificado" value={moeda(resumo.subtotal_precificado)} />
          <StatCard title="Sessões consideradas" value={numero(resumo.quantidade_considerada)} onClick={() => abrir("Todas as sessões")} />
          <StatCard title="Sessões precificadas" value={numero(resumo.quantidade_precificada)} onClick={() => abrir("Sessões precificadas", "estado", "CALCULADO")} />
          <StatCard title="Pendências" value={numero(resumo.quantidade_pendente)} onClick={() => abrir("Sessões pendentes", "estado", "PENDENTE")} />
          <StatCard title="Pacientes econômicos" value={numero(resumo.pacientes_economicos)} />
          <StatCard title="Cobertura" value={resumo.cobertura_percentual == null ? "Não aplicável" : `${numero(resumo.cobertura_percentual)}%`} description="Percentual de sessões precificadas, não de valor financeiro." />
        </div>
        {resumo.quantidade_considerada === 0 && <EmptyState title={resumo.pacientes_economicos === 0 ? "Sem população econômica no período" : "Sem sessões elegíveis no período"} description="Não há valor projetado disponível para este resultado." />}
        <CardWidget title="Evolução mensal" description="Subtotal precificado por mês. Valores ausentes não representam zero.">
          {!!preview.totais_por_mes?.length && <div style={{ height: 260, minWidth: 0 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={preview.totais_por_mes.map((m) => ({ ...m, valor: m.subtotal_precificado == null ? null : Number(m.subtotal_precificado) }))}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" /><YAxis /><Tooltip formatter={(v) => moeda(v)} /><Bar dataKey="valor" name="Subtotal precificado" fill="#2563eb" />
          </BarChart></ResponsiveContainer></div>}
          {tabela(preview.totais_por_mes, "Mês", (r) => r.mes, "mes", "mes")}
        </CardWidget>
        <CardWidget title="Por serviço">{tabela(preview.totais_por_servico, "Serviço", (r) => servico(r.servico_id), "servico_id", "servico_id")}</CardWidget>
        <CardWidget title="Por paciente" description="Identificadores retornados pela projeção, sem consulta ao prontuário.">{tabela(preview.pacientes, "Paciente", (r) => referencia("Paciente", r.paciente_id), "paciente_id", "paciente_id")}</CardWidget>
        <CardWidget title="Pendências de precificação">{preview.pendencias?.length ? tabela(preview.pendencias, "Motivo", (r) => motivo(r.codigo), "pendencia", "codigo") : <EmptyState compact title="Nenhuma pendência retornada" />}</CardWidget>
        <div ref={detalheRef} tabIndex={-1}>
          <CardWidget title={selecao ? `Detalhes — ${selecao.titulo}` : "Origem dos valores"} description="Selecione um agregado para consultar as sessões que o compõem." action={selecao && <Button onClick={() => setSelecao(null)}>Fechar detalhes</Button>}>
            {selecao && (detalhes.length ? detalhes.map((d) => {
              const i = d.item;
              const campos = [
                ["Data econômica", data(i.data_economica)], ["Duração", i.duracao_minutos == null ? "Não informada" : `${i.duracao_minutos} min`],
                ["Agenda", referencia("Agenda", i.agenda_id)], ["PTS", referencia("PTS", i.pts_id)], ["Objetivo", referencia("Objetivo", i.objetivo_id)],
                ["Atividade", referencia("Atividade", i.atividade_id)], ["Ocupação", referencia("Ocupação", i.ocupacao_id)], ["Profissional", referencia("Profissional", i.profissional_id)],
                ["Serviço", i.servico_codigo || referencia("Serviço", i.servico_id)], ["Tabela", referencia("Tabela", i.tabela_id)],
                ["Versão", i.versao_id == null ? "Não informada" : `Versão ${i.versao_numero ?? "—"} (#${i.versao_id})`], ["Vigente desde", data(i.vigente_desde)],
                ["Preço aplicado", moeda(i.preco_unitario)], ["Subtotal", moeda(i.subtotal)], ["Estado", i.estado === "CALCULADO" ? "Precificado" : i.estado === "PENDENTE" ? "Pendente" : "Não informado"], ["Pendência", motivo(i.pendencia)],
              ];
              return <details key={`${d.paciente_id}-${i.sessao_id}`} style={{ borderBottom: "1px solid #e5e7eb", padding: "14px 0" }}><summary style={{ cursor: "pointer" }}>{referencia("Paciente", d.paciente_id)} · {referencia("Sessão", i.sessao_id)} · {data(i.data_economica)} · {moeda(i.subtotal)}</summary><dl style={{ ...grid, marginTop: 16 }}>{campos.map(([nome, valor]) => <div key={nome}><dt style={{ color: "#4b5563" }}>{nome}</dt><dd style={{ margin: "4px 0", overflowWrap: "anywhere" }}>{valor}</dd></div>)}</dl></details>;
            }) : <EmptyState compact title="Nenhuma sessão neste recorte" />)}
          </CardWidget>
        </div>
      </>}
    </div>
  </PageLayout>;
}
