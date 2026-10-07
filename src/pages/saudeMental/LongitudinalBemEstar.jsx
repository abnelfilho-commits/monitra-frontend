import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TimelineEvents } from "../cardiometabolico/TimelineCardiometabolico";
import { wellbeingDimensions, wellbeingSeries, wellbeingEvents, valueLabels, displayTimestamp } from "./bemEstarPresentation";

export default function LongitudinalBemEstar({ jornada }) {
  const [dimensionKey, setDimensionKey] = useState("humor");
  const records = jornada.bem_estar?.checkins;
  const dimension = wellbeingDimensions.find(item => item.key === dimensionKey);
  const series = wellbeingSeries(records || [], dimension);
  const events = wellbeingEvents(records || [], jornada.nome_social || jornada.nome_completo, jornada.pessoa_id);
  const hasValues = series.some(item => item.value !== null);
  return <>
    <section className="mental-record__actions" aria-labelledby="mental-evolution-title">
      <h2 id="mental-evolution-title">Evolução Clínica</h2>
      <p>Respostas de Bem-Estar ao longo do tempo, neste contexto assistencial. Cada dimensão é apresentada separadamente, sem score ou interpretação automática.</p>
      {!Array.isArray(records) ? <p>Histórico de Check-ins não disponível nesta consulta.</p>
        : !records.length ? <p>Nenhum Check-in registrado neste contexto.</p> : <>
          {records.length === 1 && <p>Um Check-in registrado. Ainda não há registros suficientes para observar evolução ao longo do tempo.</p>}
          <label htmlFor="wellbeing-dimension">Dimensão</label>{" "}
          <select id="wellbeing-dimension" value={dimensionKey} onChange={e => setDimensionKey(e.target.value)}>
            {wellbeingDimensions.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
          <p>As posições representam categorias ordenadas, não uma escala numérica. “Não se aplica” e respostas ausentes não são ligadas no gráfico.</p>
          {hasValues ? <div className="mental-record__chart" role="img" aria-label={`Histórico de ${dimension.label}; valores detalhados na tabela abaixo`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 16, right: 24, bottom: 24, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" type="number" domain={["dataMin", "dataMax"]} tickFormatter={value => new Date(value).toLocaleDateString("pt-BR")} />
                <YAxis type="number" domain={[0, dimension.categories.length - 1]} ticks={dimension.categories.map((_, index) => index)} tickFormatter={value => valueLabels[dimension.categories[value]] || ""} width={85} />
                <Tooltip labelFormatter={value => displayTimestamp(value)} formatter={(_, __, entry) => [entry.payload.answer, dimension.label]} />
                <Line type="linear" dataKey="position" name={dimension.label} stroke="#0f766e" strokeWidth={2} dot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div> : <p>Sem respostas ordinais disponíveis para esta dimensão.</p>}
          <div className="mental-record__series-table"><table><caption>Respostas de {dimension.label}</caption>
            <thead><tr><th>Data/hora do registro</th><th>Resposta</th></tr></thead>
            <tbody>{series.map(item => <tr key={item.id}><td>{displayTimestamp(item.timestamp)}</td><td>{item.answer}</td></tr>)}</tbody>
          </table></div>
          {series.length < records.length && <p>Há registros sem data/hora válida; eles não foram posicionados no gráfico.</p>}
        </>}
    </section>
    <section className="mental-record__actions mental-record__timeline" aria-labelledby="mental-timeline-title">
      <h2 id="mental-timeline-title">Timeline Clínica</h2>
      <p>Check-ins deste contexto, do mais recente para o mais antigo.</p>
      {!Array.isArray(records) ? <p>Histórico de Check-ins não disponível nesta consulta.</p> : <TimelineEvents events={events} />}
    </section>
  </>;
}
