import ConsolidacaoMensalResultado from "./ConsolidacaoMensalResultado";
import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { listarInstituicoes } from "../services/instituicoes";
import { listarOcupacoesProfissionais } from "../services/atividadesTerapeuticas";
import { consultarConsolidacaoMensal, parametrosConsolidacao } from "../services/consolidacaoMensal";

const nomeInstituicao = (item) => item.nome_fantasia?.trim() || item.razao_social;
const mensagemErro = (error) => ({
  401: "Sessão expirada. Autentique-se novamente.",
  403: "Sua conta não tem autorização para esta consulta.",
  404: "Instituição não encontrada.",
  409: "A instituição não está disponível para esta consulta.",
  422: "Os filtros não foram aceitos. Revise os valores informados.",
  500: "Não foi possível concluir a consulta. Tente novamente mais tarde.",
  503: "Serviço temporariamente indisponível. Tente novamente mais tarde.",
}[error?.response?.status] || "Falha de comunicação. Verifique sua conexão e tente novamente.");
const qualidades = { CONCLUSIVO: "Conclusivo", ESTIMADO: "Estimado", INCOMPLETO: "Incompleto", INCONSISTENTE: "Inconsistente" };
function mesLocal() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

export default function ConsolidacaoMensal() {
  const { user, loading } = useAuth();
  const id = useId();
  const autorizado = !loading && user?.perfil === "ADMIN";
  const identidade = autorizado ? user.id : null;
  const [filtros, setFiltros] = useState(() => ({ instituicao_id: "", mes_referencia: mesLocal(), ocupacao_id: "" }));
  const [instituicoes, setInstituicoes] = useState([]);
  const [ocupacoes, setOcupacoes] = useState([]);
  const [catalogos, setCatalogos] = useState({ instituicoes: "carregando", ocupacoes: "carregando" });
  const [consulta, setConsulta] = useState({ estado: "inicial" });
  const execucao = useRef(0);
  const requisicao = useRef(null);
  const identidadeAtual = useRef(identidade);
  identidadeAtual.current = identidade;

  useEffect(() => {
    let vigente = true;
    setConsulta({ estado: "inicial" });
    setInstituicoes([]); setOcupacoes([]);
    setFiltros({ instituicao_id: "", mes_referencia: mesLocal(), ocupacao_id: "" });
    setCatalogos({ instituicoes: "carregando", ocupacoes: "carregando" });
    if (identidade != null) {
      listarInstituicoes().then((dados) => {
        if (!vigente) return;
        if (!Array.isArray(dados)) throw new Error("Catálogo inválido");
        setInstituicoes(dados); setCatalogos((anterior) => ({ ...anterior, instituicoes: "pronto" }));
      }).catch(() => { if (vigente) setCatalogos((anterior) => ({ ...anterior, instituicoes: "erro" })); });
      listarOcupacoesProfissionais().then((dados) => {
        if (!vigente) return;
        if (!Array.isArray(dados)) throw new Error("Catálogo inválido");
        setOcupacoes(dados); setCatalogos((anterior) => ({ ...anterior, ocupacoes: "pronto" }));
      }).catch(() => { if (vigente) setCatalogos((anterior) => ({ ...anterior, ocupacoes: "erro" })); });
    }
    return () => {
      vigente = false;
      execucao.current += 1;
      requisicao.current?.abort();
      requisicao.current = null;
    };
  }, [identidade]);

  async function atualizar(event) {
    event.preventDefault();
    if (!autorizado || requisicao.current) return;
    let params;
    try {
      params = parametrosConsolidacao(filtros);
      if (!instituicoes.some((item) => item.id === params.instituicao_id)) throw new Error("Selecione uma instituição disponível no catálogo.");
      if (params.ocupacao_id && !ocupacoes.some((item) => item.id === params.ocupacao_id)) throw new Error("Selecione uma ocupação disponível no catálogo.");
    } catch (error) {
      setConsulta({ estado: "erro", mensagem: error.message });
      return;
    }
    const controller = new AbortController();
    requisicao.current = controller;
    const numero = ++execucao.current;
    const vigente = () => numero === execucao.current && identidadeAtual.current === identidade && !controller.signal.aborted;
    const consultados = {
      ...params,
      instituicao_nome: nomeInstituicao(instituicoes.find((item) => item.id === params.instituicao_id)),
      ocupacao_nome: ocupacoes.find((item) => item.id === params.ocupacao_id)?.nome,
    };
    setConsulta({ estado: "carregando" });
    try {
      const dados = await consultarConsolidacaoMensal(params, { signal: controller.signal });
      if (vigente()) setConsulta({ estado: "sucesso", dados, filtros: consultados });
    } catch (error) {
      if (vigente() && error?.code !== "ERR_CANCELED" && error?.name !== "AbortError") {
        setConsulta({ estado: "erro", mensagem: mensagemErro(error) });
      }
    } finally {
      if (numero === execucao.current) requisicao.current = null;
    }
  }

  if (!autorizado) return null;
  const alterar = (campo) => (event) => setFiltros((anterior) => ({ ...anterior, [campo]: event.target.value }));
  return <div className="dimensionamento-mensal-provisorio">
    <h2>Consolidação Mensal</h2>
    <p>Demanda, capacidade e utilização assistencial por competência.</p>
    <form className="dimensionamento-mensal-filtros" onSubmit={atualizar} noValidate>
      <label><span id={`${id}-instituicao`}>Instituição</span>
        <select aria-labelledby={`${id}-instituicao`} value={filtros.instituicao_id} onChange={alterar("instituicao_id")} disabled={catalogos.instituicoes !== "pronto"} aria-required="true">
          <option value="">Selecione uma instituição</option>
          {instituicoes.map((item) => <option key={item.id} value={item.id}>{nomeInstituicao(item)}</option>)}
        </select>
      </label>
      <label>Competência
        <input type="month" value={filtros.mes_referencia} onChange={alterar("mes_referencia")} aria-required="true" />
      </label>
      <label><span id={`${id}-ocupacao`}>Ocupação</span>
        <select aria-labelledby={`${id}-ocupacao`} value={filtros.ocupacao_id} onChange={alterar("ocupacao_id")} disabled={catalogos.ocupacoes !== "pronto"}>
          <option value="">Todas as ocupações</option>
          {ocupacoes.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
        </select>
      </label>
      <button type="submit" disabled={consulta.estado === "carregando" || catalogos.instituicoes !== "pronto"}>Atualizar</button>
    </form>
    {catalogos.instituicoes === "carregando" && <p role="status">Carregando instituições…</p>}
    {catalogos.instituicoes === "erro" && <p role="alert">Não foi possível carregar as instituições. Recarregue a página para tentar novamente.</p>}
    {catalogos.instituicoes === "pronto" && instituicoes.length === 0 && <p>Nenhuma instituição disponível no catálogo.</p>}
    {catalogos.ocupacoes === "erro" && <p role="status">Não foi possível carregar as ocupações. Você pode consultar todas as ocupações, sem filtro.</p>}
    <div aria-live="polite" aria-busy={consulta.estado === "carregando"}>
      {consulta.estado === "inicial" && <p>Selecione os filtros e clique em Atualizar para consultar.</p>}
      {consulta.estado === "carregando" && <p>Consultando consolidação mensal…</p>}
      {consulta.estado === "erro" && <p role="alert">{consulta.mensagem}</p>}
      {consulta.estado === "sucesso" && <div>
        <p>Consulta concluída.{consulta.dados?.ocupacoes?.length === 0 ? " Nenhuma ocupação retornada para este recorte." : ""}</p>
        <dl className="dimensionamento-mensal-resumo">
          <dt>Instituição consultada</dt><dd>{consulta.filtros.instituicao_nome}</dd>
          <dt>Competência consultada</dt><dd>{consulta.filtros.mes_referencia}</dd>
          <dt>Ocupação consultada</dt><dd>{consulta.filtros.ocupacao_nome || "Todas as ocupações"}</dd>
          <dt>Estado geral</dt><dd>{qualidades[consulta.dados?.qualidade] || "Não informado pela API"}</dd>
        </dl>
      </div>}
    </div>
    <ConsolidacaoMensalResultado consulta={consulta} ocupacoes={ocupacoes} />
  </div>;
}
