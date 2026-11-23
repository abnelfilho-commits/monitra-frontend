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
const qualidade = value => ({ CONCLUSIVO: 'Dados completos', ESTIMADO: 'Dados estimados', INCOMPLETO: 'Informações incompletas', INCONSISTENTE: 'Dados inconsistentes' }[value] || 'Qualidade não informada');
const numero = value => value == null ? 'Não calculável' : String(value).replace('.', ',');
// Conversão de unidade para apresentação; saldo e utilização permanecem os recebidos.
const horas = value => value == null ? 'Não calculável' : `${(Number(value) / 60).toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} h`;
const percent = value => value == null ? 'Não calculável' : `${numero(value)}%`;
const campos = ['demanda_mensal_projetada', 'capacidade_mensal_equivalente', 'saldo_mensal', 'utilizacao_percentual'];
const motivo = code => Object.hasOwn(mensagens, code) ? mensagens[code] : 'Pendência sem descrição disponível. Solicite avaliação administrativa.';
function Utilizacao({ valor }) {
  return <div className="vg-utilizacao"><span>{percent(valor)}</span>{valor != null && <><div className="vg-track" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, Number(valor)))}%` }} /></div>{Number(valor) > 100 && <small>Acima de 100%; barra limitada visualmente a 100%.</small>}</>}</div>;
}
function Transparencia({ dados }) {
  const motivos = [...new Set([...Object.values(dados.motivos_nao_calculaveis || {}).flat(), ...(dados.motivo_utilizacao_nula ? [dados.motivo_utilizacao_nula] : [])])];
  return <div className="vg-transparencia">
    <p>Demanda: {qualidade(dados.qualidade_demanda)}. Capacidade: {qualidade(dados.qualidade_capacidade)}.</p>
    <dl><div><dt>Demanda registrada</dt><dd>{numero(dados.demanda_persistida_conhecida)} min</dd></div><div><dt>Demanda estimada</dt><dd>{numero(dados.demanda_estimada_conhecida)} min</dd></div><div><dt>Capacidade conhecida</dt><dd>{numero(dados.capacidade_mensal_conhecida)} min</dd></div></dl>
    {dados.demanda_subtotal_parcial && <p>Demanda parcial: o subtotal conhecido não substitui a demanda total.</p>}
    {dados.capacidade_subtotal_parcial && <p>Capacidade parcial: o subtotal conhecido não representa a capacidade total.</p>}
    {motivos.length > 0 && <ul>{motivos.map(code => <li key={code}>{motivo(code)}</li>)}</ul>}
    {dados.pendencias?.length > 0 ? <ul aria-label="Pendências">{dados.pendencias.map((p, i) => <li key={i}>{p.origem === 'DEMANDA' ? 'Demanda' : p.origem === 'CAPACIDADE' ? 'Capacidade' : 'Consolidação'}: {motivo(p.codigo)} Quantidade: {p.quantidade}.</li>)}</ul> : <p>Nenhuma pendência informada neste recorte.</p>}
  </div>;
}
export default function ResumoGerencialAssistencial({ consulta, ocupacoes }) {
  if (consulta.estado !== 'sucesso') return null;
  const dados = consulta.dados;
  if (!dados) return <p role="status">Nenhum resultado disponível neste recorte.</p>;
  const linhas = dados.ocupacoes || [];
  const nome = row => ocupacoes.find(o => o.id === row.ocupacao_id)?.nome || `Ocupação ${row.ocupacao_id}`;
  // Escala comum apenas para desenhar as barras, sem produzir novos indicadores.
  const escala = Math.max(1, ...linhas.flatMap(r => [r.demanda_mensal_projetada, r.capacidade_mensal_equivalente].filter(v => v != null).map(Number)));
  const saldo = dados.saldo_mensal == null ? 'Não calculável' : Number(dados.saldo_mensal) < 0 ? 'Déficit no recorte' : Number(dados.saldo_mensal) === 0 ? 'Equilíbrio no recorte' : 'Saldo positivo no recorte';
  const cartoes = [
    ['Demanda prevista', 'demanda_mensal_projetada', qualidade(dados.qualidade_demanda)],
    ['Capacidade declarada', 'capacidade_mensal_equivalente', qualidade(dados.qualidade_capacidade)],
    ['Utilização da capacidade', 'utilizacao_percentual', qualidade(dados.qualidade)],
    ['Saldo de capacidade', 'saldo_mensal', saldo],
  ];
  return <div className="vg-resultado">
    <p className={`vg-quality vg-quality-${dados.qualidade?.toLowerCase()}`}>{qualidade(dados.qualidade)}</p>
    {(dados.demanda_subtotal_parcial || dados.capacidade_subtotal_parcial) && <p className="vg-warning">Há informações parciais. Consulte os detalhes antes de tomar decisões.</p>}
    <div className="vg-kpis">{cartoes.map(([titulo, campo, legenda]) => <section className={`vg-kpi ${campo === 'saldo_mensal' && Number(dados[campo]) < 0 ? 'vg-deficit' : ''}`} aria-label={titulo} key={campo}>
      <h3>{titulo}</h3>{campo === 'utilizacao_percentual' ? <Utilizacao valor={dados[campo]} /> : <><p className="vg-value">{horas(dados[campo])}</p><p className="vg-minutes">{dados[campo] == null ? 'Valor indisponível' : `${numero(dados[campo])} min`}</p></>}
      <p className="vg-caption">{legenda}</p>
    </section>)}</div>
    <p className="vg-note">Capacidade declarada no período. Saldo positivo não representa disponibilidade efetiva de agenda. Horas arredondadas para leitura; minutos preservam os valores informados.</p>
    <section className="vg-comparison" aria-labelledby="vg-comparison-title"><header><h3 id="vg-comparison-title">Demanda × capacidade por ocupação</h3><p>Compare os volumes mensais no mesmo recorte.</p></header>
      <div className="vg-legend"><span>● Demanda prevista</span><span>● Capacidade declarada</span></div>
      {linhas.length === 0 ? <p>Nenhuma ocupação retornada neste recorte.</p> : <ul className="vg-chart" aria-label="Comparativo por ocupação">{linhas.map(row => <li key={row.ocupacao_id}><h4>{nome(row)}</h4>{[['demanda_mensal_projetada', 'Demanda'], ['capacidade_mensal_equivalente', 'Capacidade']].map(([campo, label]) => <div className={`vg-bar-row vg-${campo}`} key={campo}><span>{label}</span><div className="vg-bar-track" aria-hidden="true">{row[campo] != null && <span style={{ width: `${Math.max(0, Number(row[campo])) / escala * 100}%` }} />}</div><strong>{horas(row[campo])}</strong></div>)}</li>)}</ul>}
      <div className="vg-table-scroll" role="region" aria-label="Tabela por ocupação" tabIndex={0}><table><caption>Resumo por ocupação — horas mensais e utilização</caption><thead><tr>{['Ocupação', 'Demanda', 'Capacidade', 'Saldo', 'Utilização', 'Qualidade'].map(t => <th scope="col" key={t}>{t}</th>)}</tr></thead><tbody>{linhas.length === 0 ? <tr><td colSpan={6}>Sem ocupações neste resultado.</td></tr> : linhas.map(row => <tr key={row.ocupacao_id}><th scope="row">{nome(row)}</th>{campos.map(campo => <td key={campo}>{campo === 'utilizacao_percentual' ? <Utilizacao valor={row[campo]} /> : <>{horas(row[campo])}<small>{row[campo] == null ? 'Valor indisponível' : `${numero(row[campo])} min`}</small></>}</td>)}<td>{qualidade(row.qualidade)}</td></tr>)}</tbody></table></div>
    </section>
    <details className="vg-details"><summary>Qualidade, estimativas e limitações</summary><h3>Transparência do resultado</h3><Transparencia dados={dados} />{linhas.map(row => <details key={row.ocupacao_id}><summary>{nome(row)} — {qualidade(row.qualidade)}</summary><Transparencia dados={row} /></details>)}{dados.base_historica === 'ESTADO_CADASTRAL_ATUAL_SEM_RECONSTRUCAO' && <p>A consolidação utiliza o estado cadastral atual e não reconstrói alterações históricas.</p>}</details>
  </div>;
}
