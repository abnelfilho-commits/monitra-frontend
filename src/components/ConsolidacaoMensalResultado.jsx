const qualidades = { CONCLUSIVO: "Conclusivo", ESTIMADO: "Estimado", INCOMPLETO: "Incompleto", INCONSISTENTE: "Inconsistente" };
const mensagens = {
  DEMANDA_NAO_CALCULAVEL: "Demanda não calculável.",
  CAPACIDADE_NAO_CONCLUSIVA: "Capacidade não conclusiva.",
  CAPACIDADE_ZERO: "Capacidade igual a zero; utilização não calculável.",
  DIAS_SEM_DECLARACAO: "Há dias sem declaração de capacidade.",
  DECLARACOES_SOBREPOSTAS: "Há declarações de capacidade com períodos sobrepostos.",
  DECLARACAO_DUPLICADA: "Há declaração de capacidade duplicada.",
  DECLARACAO_INCONSISTENTE: "Há declaração de capacidade inconsistente.",
  IDENTIDADE_INCONSISTENTE: "Há inconsistência nas associações cadastrais.",
  VIGENCIA_VINCULO_INVALIDA: "Há vigência inválida de vínculo institucional.",
  VINCULO_FORA_DO_RECORTE: "Há vínculo fora do período considerado.",
  ANCESTRALIDADE_INCONSISTENTE: "Há inconsistência nas associações do planejamento.",
  SESSAO_ANCESTRALIDADE_INCONSISTENTE: "Há inconsistência nas associações das sessões.",
  VIGENCIA_INCOMPLETA: "Há vigência de planejamento incompleta.",
  VIGENCIA_INVALIDA: "Há vigência de planejamento inválida.",
  PLANEJAMENTO_QUANTITATIVO_INVALIDO: "Há quantitativos de planejamento inválidos ou ausentes.",
  OCORRENCIA_MULTIPLICADA: "Há ocorrências repetidas no cronograma.",
  CRONOGRAMA_INCOMPLETO_OU_CONTRADITORIO: "Há cronograma incompleto ou contraditório.",
  ESTADO_DESCONHECIDO: "Há estado de sessão não reconhecido.",
  DATA_OU_DURACAO_INCONSISTENTE: "Há data ou duração de sessão inconsistente.",
  HORARIO_INCONSISTENTE: "Há horário de sessão inconsistente.",
  SUBSTITUICAO_NAO_COMPROVADA: "Há substituição de sessão não comprovada.",
  SUBSTITUICAO_AMBIGUA: "Há substituição de sessão ambígua.",
  SEQUENCIA_TEMPORAL_INCONSISTENTE: "Há sequência temporal inconsistente.",
  OCORRENCIA_FORA_DA_VIGENCIA: "Há ocorrência fora da vigência.",
  POSSIVEL_DUPLICIDADE_SEMANTICA: "Há possível duplicidade de planejamento.",
  ESTIMATIVA_PRECISAO_NUMERICA_INSUFICIENTE: "Não foi possível estimar a demanda com precisão suficiente.",
  ESTIMATIVA_LIMITE_DE_DATAS: "A estimativa excede o intervalo de datas suportado.",
  ESTIMATIVA_DADOS_NAO_REPRESENTAVEIS: "Há dados que impedem a geração segura da estimativa.",
};
const indicadores = [
  ["demanda_mensal_projetada", "Demanda mensal", "minutos mensais"],
  ["capacidade_mensal_equivalente", "Capacidade mensal", "minutos mensais"],
  ["saldo_mensal", "Saldo assistencial", "minutos mensais"],
  ["utilizacao_percentual", "Utilização", "%"],
];
const qualidade = (valor) => qualidades[valor] || "Não informado";
// Formatação textual: não converte strings decimais para ponto flutuante.
const valor = (numero) => numero == null ? "Não calculável" : String(numero).replace(".", ",");
const mensagem = (codigo) => Object.hasOwn(mensagens, codigo) ? mensagens[codigo] : "Pendência informada pela API sem descrição disponível. Solicite avaliação administrativa.";
function Motivos({ dados, campo }) {
  const motivos = [...(dados.motivos_nao_calculaveis?.[campo] || [])];
  if (campo === "utilizacao_percentual" && dados.motivo_utilizacao_nula && !motivos.includes(dados.motivo_utilizacao_nula)) motivos.push(dados.motivo_utilizacao_nula);
  return motivos.length > 0 && <ul className="mensal-motivos">{motivos.map((codigo, i) => <li key={i}>{mensagem(codigo)}</li>)}</ul>;
}
function Transparencia({ dados }) {
  return <div className="mensal-transparencia">
    <p>Qualidade da demanda: {qualidade(dados.qualidade_demanda)}. Qualidade da capacidade: {qualidade(dados.qualidade_capacidade)}.</p>
    <p>Resultado conclusivo: {dados.conclusivo === true ? "Sim" : dados.conclusivo === false ? "Não" : "Não informado"}.</p>
    <dl>
      {dados.demanda_persistida_conhecida != null && <><dt>Demanda persistida conhecida</dt><dd>{valor(dados.demanda_persistida_conhecida)} minutos mensais</dd></>}
      {dados.demanda_estimada_conhecida != null && <><dt>Demanda estimada conhecida</dt><dd>{valor(dados.demanda_estimada_conhecida)} minutos mensais</dd></>}
      {dados.capacidade_mensal_conhecida != null && <><dt>Capacidade conhecida</dt><dd>{valor(dados.capacidade_mensal_conhecida)} minutos mensais</dd></>}
    </dl>
    {typeof dados.demanda_subtotal_parcial === "boolean" && <p>Subtotal de demanda: {dados.demanda_subtotal_parcial ? "parcial; não substitui o total projetado." : "não parcial, conforme a API."}</p>}
    {typeof dados.capacidade_subtotal_parcial === "boolean" && <p>Subtotal de capacidade: {dados.capacidade_subtotal_parcial ? "parcial; não substitui a capacidade mensal conclusiva." : "não parcial, conforme a API."}</p>}
    {dados.pendencias?.length > 0 && <><h4>Pendências</h4><ul>{dados.pendencias.map((item, i) => <li key={i}>
      {item.origem === "DEMANDA" ? "Demanda" : item.origem === "CAPACIDADE" ? "Capacidade" : "Consolidação"}: {mensagem(item.codigo)} Quantidade: {item.quantidade}.
    </li>)}</ul></>}
  </div>;
}

export default function ConsolidacaoMensalResultado({ consulta, ocupacoes }) {
  const dados = consulta.estado === "sucesso" ? consulta.dados : null;
  const linhas = dados?.ocupacoes || [];
  const vazio = { inicial: "Nenhuma consulta executada.", carregando: "Consultando ocupações…", erro: "Consulta não concluída. Revise a mensagem acima.", sucesso: "Não há linhas de ocupação neste resultado." };
  return <div className="mensal-resultado">
    {dados && <>
      <div className="mensal-indicadores">
        {indicadores.map(([campo, titulo, unidade]) => <section key={campo} aria-label={titulo} className="mensal-indicador">
          <h3>{titulo}</h3><p className="mensal-valor">{valor(dados[campo])}</p>
          <p>{unidade}</p>
          {campo === "demanda_mensal_projetada" && <p>Qualidade da demanda: {qualidade(dados.qualidade_demanda)}</p>}
          {campo === "capacidade_mensal_equivalente" && <p>Qualidade da capacidade: {qualidade(dados.qualidade_capacidade)}</p>}
          <Motivos dados={dados} campo={campo} />
        </section>)}
      </div>
      <section aria-label="Subtotais e qualidade"><h3>Subtotais e qualidade</h3><Transparencia dados={dados} /></section>
      {dados.base_historica === "ESTADO_CADASTRAL_ATUAL_SEM_RECONSTRUCAO" && <p className="mensal-aviso">Esta consolidação utiliza o estado cadastral atual e não reconstrói alterações históricas.</p>}
    </>}
    <div className="mensal-tabela-scroll" role="region" aria-label="Detalhamento por ocupação" tabIndex={0}>
      <table className="mensal-tabela">
        <caption>Por ocupação — valores em minutos mensais; utilização em %</caption>
        <thead><tr>{["Ocupação", "Demanda mensal", "Capacidade mensal", "Saldo", "Utilização", "Qualidade"].map(titulo => <th key={titulo} scope="col">{titulo}</th>)}</tr></thead>
        <tbody>{linhas.length === 0 ? <tr><td colSpan={6}>{vazio[consulta.estado] || "Nenhuma consulta disponível."}</td></tr> : linhas.map((item) => <tr key={item.ocupacao_id}>
          <th scope="row">{ocupacoes.find(o => o.id === item.ocupacao_id)?.nome || `Ocupação ID ${item.ocupacao_id}`}</th>
          {indicadores.map(([campo]) => <td key={campo}>{valor(item[campo])}<Motivos dados={item} campo={campo} /></td>)}
          <td>{qualidade(item.qualidade)}<details><summary>Qualidade, subtotais e pendências</summary><Transparencia dados={item} /></details></td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}
