import { useState } from "react";
import Button from "../../components/ui/Button";
import { displayTimestamp } from "./bemEstarPresentation";

const eventPresentation = {
  "GAD-7": { filter: "gad7", className: "mental-timeline-event--assessment" },
  "PHQ-9": { filter: "phq9", className: "mental-timeline-event--assessment" },
  "Intervenção": { filter: "interventions", className: "mental-timeline-event--intervention" },
  "Diagnóstico": { filter: "diagnoses", className: "mental-timeline-event--diagnosis" },
  "Check-in de Bem-Estar": { filter: "checkins", className: "mental-timeline-event--checkin" },
};

export default function TimelineBemEstar({ events, available }) {
  const [filter, setFilter] = useState("all");
  const visible = filter === "all" ? events : events.filter(event => eventPresentation[event.tipo]?.filter === filter);
  return <section className="mental-record__actions mental-record__timeline" aria-labelledby="mental-timeline-title">
    <div className="mental-timeline__header">
      <h2 id="mental-timeline-title">Timeline Clínica</h2>
      <div className="mental-timeline__filters" role="group" aria-label="Filtrar eventos">
        {[["all", "Todos"], ["checkins", "Check-ins"], ["diagnoses", "Diagnósticos"], ["interventions", "Intervenções"], ["phq9", "PHQ-9"], ["gad7", "GAD-7"]].map(([value, label]) =>
          <Button key={value} variant="secondary" style={filter === value ? { background: "#eaf2f9", borderColor: "#8baac5", color: "#294e70" } : undefined} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</Button>)}
      </div>
    </div>
    <p>Eventos deste contexto, do mais recente para o mais antigo.</p>
    {!available ? <p>Histórico de Check-ins não disponível nesta consulta.</p>
      : !visible.length ? <p className="mental-timeline__empty">{filter === "all" ? "Nenhum evento encontrado." : filter === "gad7" ? "Nenhuma avaliação GAD-7 encontrada para este filtro." : filter === "phq9" ? "Nenhuma avaliação PHQ-9 encontrada para este filtro." : filter === "checkins" ? "Nenhum Check-in encontrado para este filtro." : filter === "interventions" ? "Nenhuma intervenção encontrada para este filtro." : "Nenhum diagnóstico encontrado para este filtro."}</p>
        : <div className="mental-timeline__events">{visible.map(event => <article key={event.id} className={`mental-timeline-event ${eventPresentation[event.tipo]?.className || ""}`}>
          <div className="mental-timeline-event__header">
            <div>
              <h3>{event.tipo}</h3>
              {event.nome && <span className={`mental-timeline__badge${event.tipo === "Check-in de Bem-Estar" ? " mental-timeline__badge--baseline" : ""}`}>{event.nome}</span>}
            </div>
            <div className="mental-timeline-event__dates">
              <div>{event.data_hora ? `Data clínica: ${displayTimestamp(event.data_hora)}` : event.data ? `Data clínica: ${event.data.split("-").reverse().join("/")}` : "Data clínica não informada"}</div>
              {event.created_at && <div>Registrado em: <time dateTime={event.created_at}>{displayTimestamp(event.created_at)}</time></div>}
            </div>
          </div>
          <div className="mental-timeline-event__provenance">
            {event.origem && <span className="mental-timeline__badge">Canal: {event.origem}</span>}
            {event.modalidade && <span className="mental-timeline__badge">Modalidade: {event.modalidade}</span>}
          </div>
          {event.respondente && <p className="mental-timeline-event__respondent">Respondente: {event.respondente}</p>}
          {["Diagnóstico", "Intervenção"].includes(event.tipo) && <p style={{ whiteSpace: "pre-wrap" }}>{event.descricao}</p>}
          {event.resultado && <div><p><strong>Pontuação: {event.resultado.score} / {event.resultado.score_max ?? 27}</strong> · Intensidade de sintomas: {event.resultado.classificacao}</p><p>{event.resultado.interpretacao}</p>{event.resultado.alertas?.map(alert => <p key={alert} role="alert">{alert}</p>)}</div>}
          {event.metadata?.answers?.length > 0 && <details className="mental-timeline-event__details">
            <summary>Detalhes do registro</summary>
            <ul>{event.metadata.answers.map((answer, index) => <li key={`${answer.field_id}:${index}`}>
              {answer.name}: {Object.values(answer.values).map(value => typeof value === "object" ? JSON.stringify(value) : String(value)).join(", ")}
            </li>)}</ul>
          </details>}
        </article>)}</div>}
  </section>;
}
