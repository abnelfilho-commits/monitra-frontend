import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import TimelineBemEstar from "./TimelineBemEstar";
import { wellbeingDimensions, wellbeingOverview, wellbeingSeries, wellbeingEvents, diagnosisEvents, interventionEvents, valueLabels, displayTimestamp } from "./bemEstarPresentation";

const dimensionColors = ["#356b9b", "#8765a5", "#b2793d", "#438c89", "#64749a", "#a56283", "#79803f"];
function OverviewTooltip({ active, payload, hidden }) {
  const row = payload?.[0]?.payload;
  if (!active || !row?.answers) return null;
  return <div className="mental-evolution-tooltip">
    <strong>{displayTimestamp(row.timestamp)}</strong>
    <ul>{wellbeingDimensions.map((dimension, index) => !hidden.includes(dimension.key) && <li key={dimension.key}>
      <span style={{ color: dimensionColors[index] }}>{dimension.label}:</span>{" "}{row.answers[dimension.key]}
    </li>)}</ul>
  </div>;
}

export default function LongitudinalBemEstar({ jornada }) {
  const [dimensionKey, setDimensionKey] = useState("all");
  const [hidden, setHidden] = useState([]);
  const toggleSeries = key => setHidden(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key]);
  const records = jornada.bem_estar?.checkins;
  const dimension = wellbeingDimensions.find(item => item.key === dimensionKey);
  const all = dimensionKey === "all";
  const series = all ? wellbeingOverview(records || []) : wellbeingSeries(records || [], dimension);
  const events = [...wellbeingEvents(records || [], jornada.nome_social || jornada.nome_completo, jornada.pessoa_id),
    ...diagnosisEvents(jornada.diagnosticos?.itens || []), ...interventionEvents(jornada.intervencoes?.itens || [])].sort((a, b) => {
      const left = Date.parse(a.created_at), right = Date.parse(b.created_at);
      return (Number.isFinite(right) ? right : -Infinity) - (Number.isFinite(left) ? left : -Infinity) || Number(b.id.split(":")[1]) - Number(a.id.split(":")[1]);
    });
  const hasValues = series.some(item => all ? wellbeingDimensions.some(d => item[d.key] !== null) : item.value !== null);
  return <>
    <section className="mental-record__actions" aria-labelledby="mental-evolution-title">
      <h2 id="mental-evolution-title">Evolução Clínica</h2>
      <p>Cada linha representa uma dimensão do Bem-Estar. As categorias ordenadas facilitam a comparação ao longo do tempo; não representam score ou classificação de risco.</p>
      {!Array.isArray(records) ? <p>Histórico de Check-ins não disponível nesta consulta.</p>
        : !records.length ? <p>Nenhum Check-in registrado neste contexto.</p> : <>
          {records.length === 1 && <p>Um Check-in registrado. Ainda não há registros suficientes para observar evolução ao longo do tempo.</p>}
          <label htmlFor="wellbeing-dimension">Dimensão</label>{" "}
          <select id="wellbeing-dimension" value={dimensionKey} onChange={e => setDimensionKey(e.target.value)}>
            <option value="all">Todas as dimensões</option>
            {wellbeingDimensions.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
          <p>{all ? "Na visão geral, posições superiores representam categorias mais favoráveis em cada dimensão. " : ""}“Não se aplica” e respostas ausentes permanecem como lacunas.</p>
          {hasValues ? <div className={`mental-record__chart${all ? " mental-record__chart--overview" : ""}`} role={all ? "group" : "img"} aria-label={all ? "Histórico de todas as dimensões; categorias reais no tooltip" : `Histórico de ${dimension.label}; valores detalhados na tabela abaixo`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 16, right: 24, bottom: 24, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" type="number" domain={["dataMin", "dataMax"]} tickFormatter={value => new Date(value).toLocaleDateString("pt-BR")} />
                <YAxis type="number" domain={[0, 4]} ticks={all ? [0, 2, 4] : dimension.categories.map((_, index) => index)} tickFormatter={value => all ? ({ 0: "Menos favorável", 2: "Intermediário", 4: "Mais favorável" }[value] || "") : valueLabels[dimension.categories[value]] || ""} width={100} tick={{ fontSize: 11 }} />
                {all ? <Tooltip content={<OverviewTooltip hidden={hidden} />} /> : <Tooltip labelFormatter={value => displayTimestamp(value)} formatter={(_, __, entry) => [entry.payload.answer, dimension.label]} />}
                {all && <Legend content={<div className="mental-evolution-legend" role="group" aria-label="Séries visíveis">
                  {wellbeingDimensions.map((item, index) => <button type="button" className="mental-evolution-legend__button recharts-legend-item" key={item.key} aria-pressed={!hidden.includes(item.key)} onClick={() => toggleSeries(item.key)}>
                    <span aria-hidden="true" style={{ color: dimensionColors[index] }}>━</span> {item.label}
                  </button>)}
                </div>} />}
                {all ? wellbeingDimensions.map((item, index) => <Line key={item.key} hide={hidden.includes(item.key)} type="linear" dataKey={item.key} name={item.label} stroke={dimensionColors[index]} strokeWidth={2} dot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />)
                  : <Line type="linear" dataKey="position" name={dimension.label} stroke="#0f766e" strokeWidth={2} dot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />}
              </LineChart>
            </ResponsiveContainer>
          </div> : <p>{all ? "Sem respostas ordinais disponíveis nestes Check-ins." : "Sem respostas ordinais disponíveis para esta dimensão."}</p>}
          {!all && <div className="mental-record__series-table"><table><caption>Respostas de {dimension.label}</caption>
            <thead><tr><th>Data/hora do registro</th><th>Resposta</th></tr></thead>
            <tbody>{series.map(item => <tr key={item.id}><td>{displayTimestamp(item.timestamp)}</td><td>{item.answer}</td></tr>)}</tbody>
          </table></div>}
          {series.length < records.length && <p>Há registros sem data/hora válida; eles não foram posicionados no gráfico.</p>}
        </>}
    </section>
    <TimelineBemEstar events={events} available={Array.isArray(records)} />
  </>;
}
