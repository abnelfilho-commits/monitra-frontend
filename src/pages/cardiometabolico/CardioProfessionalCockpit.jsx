import PageLayout from '../../components/layouts/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import WidgetGrid from '../../components/layouts/WidgetGrid';
import StatCard from '../../components/ui/StatCard';
import CardWidget from '../../components/ui/CardWidget';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import './CardioProfessionalCockpit.css';

const risks = { critico: 'Crítico', alto: 'Alto', moderado: 'Moderado', baixo: 'Baixo' };
const continuity = { REGULAR: 'Regular', ATENCAO: 'Atenção', CRITICA: 'Crítica', NAO_INICIADA: 'Não iniciada' };
const reasons = {
  RISCO_CLINICO_CRITICO: 'Risco clínico crítico', RISCO_CLINICO_ALTO: 'Risco clínico alto',
  CONTINUIDADE_CRITICA: 'Continuidade crítica', RISCO_CLINICO_MODERADO: 'Risco clínico moderado',
  CONTINUIDADE_ATENCAO: 'Continuidade em atenção',
};
const counts = [['Crítico', 'critico'], ['Alto', 'alto_risco'], ['Moderado', 'moderado'], ['Baixo', 'baixo'], ['Sem leitura', 'indisponivel']];
const number = value => typeof value === 'number' && Number.isFinite(value)
  ? value.toLocaleString('pt-BR') : 'Não disponível';
function clinicalDate(value) {
  if (value == null || value === '') return 'Não iniciado';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : 'Data indisponível';
}
function validComposition(data) {
  // Validate structure, never invent counters or clinical classifications.
  return data && ['total_pacientes', ...counts.map(([, key]) => key)].every(key => Number.isFinite(data.indicadores?.[key]))
    && Object.keys(continuity).every(key => Number.isFinite(data.continuidade?.[key]))
    && ['com_registro', 'sem_registro'].every(key => Number.isFinite(data.evolution?.[key]))
    && Array.isArray(data.pacientes_criticos) && Array.isArray(data.recent_activity)
    && ['offset', 'limit', 'total'].every(key => Number.isFinite(data.pagination?.[key]))
    && data.capabilities && data.pacientes_criticos.every(patient => patient && Array.isArray(patient.sinais));
}

function RecentActivity({ events }) {
  return events.length ? <div className="cardio-v2-events">{events.map(event => <article key={event.id}>
    <h3>{event.tipo}{event.nome ? ` — ${event.nome}` : ''}</h3>
    <p>{event.data ? `Data clínica: ${clinicalDate(event.data)}` : 'Data clínica não informada'}
      {event.created_at ? ` · Registrado em: ${new Date(event.created_at).toLocaleString('pt-BR')}` : ''}</p>
    {event.origem && <p>Canal: {event.origem}</p>}
    <p>{event.actor ? `Autoria: ${event.actor.name ?? `${event.actor.namespace} #${event.actor.id}`}` : 'Autoria não disponível'}</p>
  </article>)}</div> : <p>Nenhum evento encontrado.</p>;
}

export default function CardioProfessionalCockpit({ data, name, loading, error, offset, onPage, onPatient }) {
  const invalid = !loading && !error && !validComposition(data);
  return <PageLayout><div className="cardio-v2">
    <PageHeader title="Cockpit Assistencial" description="Linha ativa: Cardiometabólico">
      <p className="cardio-v2-greeting">{name ? `Olá, ${name}.` : 'Olá.'}</p>
      <p>Acompanhe sua população cardiometabólica e identifique onde sua atenção é mais necessária.</p>
    </PageHeader>
    {error || invalid ? <div className="cardio-v2-state" role="alert">
      <p>Não foi possível carregar o Cockpit.</p>
      <p>Os dados da população não estão disponíveis neste momento.</p>
      {offset > 0 && <Button variant="secondary" onClick={() => onPage(0)}>Voltar à primeira página</Button>}
    </div> : loading ? <div className="cardio-v2-state" role="status" aria-live="polite">Processando…</div> : <>
      <CardWidget title="Panorama da população" description="Distribuição da leitura clínica atual.">
        <div className="cardio-v2-panorama">
          <StatCard title="Total de pacientes" value={number(data.indicadores.total_pacientes)} description="Ativos na Linha e no seu escopo" />
          <WidgetGrid minItemWidth={130}>
            {counts.map(([label, key]) => <StatCard key={key} title={label} value={number(data.indicadores[key])} />)}
          </WidgetGrid>
        </div>
        <p className="cardio-v2-note">Sem leitura: leitura clínica indisponível; não significa baixo risco.</p>
        {data.indicadores.total_pacientes === 0 && <EmptyState compact icon="—" title="Nenhum paciente ativo nesta Linha no seu escopo" />}
      </CardWidget>
      <CardWidget title="Continuidade do acompanhamento" description="Recência dos registros, independente do risco clínico.">
        <dl className="cardio-v2-continuity">{Object.entries(continuity).map(([key, label]) => <div key={key}>
          <dt>{label}</dt><dd>{number(data.continuidade[key])}</dd>
        </div>)}</dl>
      </CardWidget>
      <CardWidget title="Sua atenção hoje" description="Prioridade operacional. O motivo principal vem dos sinais institucionais de risco e continuidade.">
        {!data.pacientes_criticos.length && <EmptyState compact icon="—" title="Nenhum paciente prioritário nesta página" />}
        <div className="cardio-v2-priorities">{data.pacientes_criticos.map(patient => <article key={patient.id} className="cardio-v2-patient">
          <h3>{patient.nome}</h3>
          <p className="cardio-v2-reason">{reasons[patient.motivo_principal] ?? 'Motivo não disponível'}</p>
          <div className="cardio-v2-signals">
            <span>Risco clínico: <strong>{patient.risco == null ? 'Sem leitura' : (risks[patient.risco] ?? 'Não disponível')}</strong></span>
            <span>Continuidade: <strong>{continuity[patient.continuidade?.classification] ?? 'Não disponível'}</strong></span>
          </div>
          {patient.sinais.some(signal => signal !== patient.motivo_principal) && <ul className="cardio-v2-other-signals" aria-label="Outros sinais institucionais">
            {patient.sinais.filter(signal => signal !== patient.motivo_principal).map(signal => <li key={signal}>{reasons[signal] ?? 'Sinal não disponível'}</li>)}
          </ul>}
          <p className="cardio-v2-note">Último registro clínico: {clinicalDate(patient.ultima_atualizacao)}</p>
          <dl className="cardio-v2-measurements">
            <div><dt>Glicemia em jejum (mg/dL)</dt><dd>{number(patient.glicemia)}</dd></div>
            <div><dt>Pressão arterial (mmHg)</dt><dd>{patient.pressao || 'Não disponível'}</dd></div>
            <div><dt>Peso (kg)</dt><dd>{number(patient.peso)}</dd></div>
            <div><dt>IMC (kg/m²)</dt><dd>{patient.imc_availability === 'available' ? number(patient.imc) : 'Não disponível'}</dd></div>
          </dl>
          <Button variant="secondary" onClick={() => onPatient(patient.id)}>Abrir prontuário</Button>
        </article>)}</div>
        <nav className="cardio-v2-pagination" aria-label="Páginas de prioridade">
          <Button variant="secondary" disabled={offset === 0} onClick={() => onPage(Math.max(0, offset - 20))}>Anterior</Button>
          <span>{number(data.pagination.total)} pacientes prioritários</span>
          <Button variant="secondary" disabled={offset + 20 >= data.pagination.total} onClick={() => onPage(offset + 20)}>Próxima</Button>
        </nav>
      </CardWidget>
      {data.capabilities.timeline === 'ACTIVE' && <CardWidget title="Atividade recente" description="Veja o que aconteceu recentemente com seus pacientes.">
        <RecentActivity events={data.recent_activity} />
      </CardWidget>}
      <CardWidget title="Acompanhamento da população" description="Cobertura de Registro Diário, sem interpretação de evolução clínica.">
        <WidgetGrid minItemWidth={200}>
          <StatCard title="Com Registro Diário" value={number(data.evolution.com_registro)} />
          <StatCard title="Sem Registro Diário" value={number(data.evolution.sem_registro)} />
        </WidgetGrid>
      </CardWidget>
    </>}
  </div></PageLayout>;
}
