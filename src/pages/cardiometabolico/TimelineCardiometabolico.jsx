import { useEffect, useState } from 'react';
import { buscarTimelineCardiometabolica } from '../../services/cardiometabolico/timeline';

export function TimelineEvents({ events }) {
  return events.length ? <div className="space-y-4">{events.map(event => <article key={event.id} className="cardio-timeline-card">
    <h3>{event.tipo}{event.nome ? ` — ${event.nome}` : ''}</h3>
    <p>{event.data ? `Data clínica: ${event.data.split('-').reverse().join('/')}` : 'Data clínica não informada'}
      {event.created_at ? ` · Registrado em: ${new Date(event.created_at).toLocaleString('pt-BR')}` : ''}</p>
    {event.origem && <p>Canal: {event.origem}</p>}
    {event.actor && <p>Autoria: {event.actor.name ?? `${event.actor.namespace} #${event.actor.id}`}</p>}
    {event.descricao && <p style={{whiteSpace:'pre-wrap'}}>{event.descricao}</p>}
    {event.metadata?.cid && <p>CID: {event.metadata.cid}</p>}
    {event.metadata?.observacoes != null && <p style={{whiteSpace:'pre-wrap'}}>Observações: {event.metadata.observacoes}</p>}
    {event.metadata?.answers?.length > 0 && <details><summary>Detalhes do registro</summary>
      <ul>{event.metadata.answers.map((answer, index) => <li key={`${answer.field_id}:${index}`}>
        {answer.name}: {Object.values(answer.values).map(value => typeof value === 'object' ? JSON.stringify(value) : String(value)).join(', ')}
      </li>)}</ul></details>}
  </article>)}</div> : <p>Nenhum evento encontrado.</p>;
}
export default function TimelineCardiometabolico({ pacienteId }) {
  const [loaded, setEvents] = useState(null);
  const events = loaded?.id === pacienteId ? loaded.data : null;
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    buscarTimelineCardiometabolica(pacienteId).then(data => { if (active) setEvents({id: pacienteId, data}); })
      .catch(() => { if (active) setError(pacienteId); });
    return () => { active = false; };
  }, [pacienteId]);
  return <section className="bg-white rounded-2xl shadow p-4"><h2>Timeline clínica</h2>
    {error === pacienteId ? <p role="alert">Não foi possível carregar a Timeline.</p> : events ? <TimelineEvents events={events} /> : <p>Carregando Timeline...</p>}
  </section>;
}
