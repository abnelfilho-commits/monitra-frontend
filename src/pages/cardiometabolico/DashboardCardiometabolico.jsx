import useCareLineNavigate from "../../hooks/useCareLineNavigate";
import { obterCockpitProfissional } from "../../services/cockpit";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from 'react';

import { obterDashboardAnalytics } from '../../services/cardiometabolico';
import Button from '../../components/ui/Button';
import { TimelineEvents } from './TimelineCardiometabolico';

import PageLayout from '../../components/layouts/PageLayout';
import WidgetGrid from '../../components/layouts/WidgetGrid';
import PageHeader from '../../components/ui/PageHeader';
import CardWidget from '../../components/ui/CardWidget';
import StatCard from '../../components/ui/StatCard';
import './DashboardCardiometabolico.css';

function clinicalDate(value) {
  if (value == null || value === '') return 'Não iniciado';
  // Display the clinical calendar date without timezone conversion.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : 'Data indisponível';
}

const reasons = {
  RISCO_CLINICO_CRITICO: 'Risco clínico crítico', RISCO_CLINICO_ALTO: 'Risco clínico alto',
  CONTINUIDADE_CRITICA: 'Continuidade crítica', RISCO_CLINICO_MODERADO: 'Risco clínico moderado',
  CONTINUIDADE_ATENCAO: 'Continuidade em atenção',
};
export default function DashboardCardiometabolico({ professional = false }) {
  const { user } = useAuth();
  const professionalMode = professional || user?.perfil === "PROFISSIONAL";
  const navigate = useCareLineNavigate();
  const [loaded, setData] = useState(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(null);
  const data = loaded?.offset === offset ? loaded.result : null;
  useEffect(() => {
    let active = true;
    const request = professionalMode
      ? obterCockpitProfissional(2, offset, 20).then(result => result.composition)
      : obterDashboardAnalytics(offset);
    request.then(result => { if (active) setData({offset, result}); })
      .catch(() => { if (active) setError(offset); });
    return () => { active = false; };
  }, [offset, professionalMode]);
  const has = capability => data.capabilities[capability] === 'ACTIVE';
  return <PageLayout>
    <PageHeader title="Bem-vindo ao Cockpit Cardiometabólico"
      description="Acompanhamento da população na Linha Cardiometabólica." />
    {error === offset ? <p role="alert">Não foi possível carregar o Cockpit.</p> : !data ?
      <p role="status">Carregando Cockpit...</p> : <>
    <WidgetGrid columns={3}>
      {[['Total de pacientes', 'total_pacientes'], ['Risco crítico','critico'], ['Risco alto','alto_risco'],
        ['Risco moderado','moderado'], ['Risco baixo','baixo'], ['Risco indisponível','indisponivel']]
        .map(([label,key]) => <StatCard key={key} title={label} value={data.indicadores[key] ?? "Indisponível"} />)}
    </WidgetGrid>
    <CardWidget title="Ações rápidas"><div className="cardio-actions">
      <Button onClick={() => navigate('/cardiometabolico/pacientes')}>Pacientes Cardio</Button>
      <Button onClick={() => navigate('/pacientes/novo?modulo=cardiometabolico')}>Novo paciente</Button>
      {has('daily_record') && <Button onClick={() => navigate('/cardiometabolico/pacientes')}>Registro Diário</Button>}
      {has('interventions') && <Button onClick={() => navigate('/cardiometabolico/pacientes')}>Intervenções</Button>}
    </div></CardWidget>
    <CardWidget title="Prioridade do dia">
      <p>Prioridade operacional. Risco clínico e continuidade são sinais independentes.</p>
      {!data.pacientes_criticos.length && <p>Nenhum paciente prioritário nesta página.</p>}
      {data.pacientes_criticos.map(patient => <article key={patient.id} className="cardio-priority">
        <h3>{patient.nome}</h3><strong>{reasons[patient.motivo_principal]}</strong>
        <ul>{patient.sinais.map(signal => <li key={signal}>{reasons[signal]}</li>)}</ul>
        <p>Risco clínico: {patient.risco ?? 'Indisponível'} · Continuidade: {patient.continuidade.classification}</p>
        <p>{patient.resumo ?? 'Leitura clínica indisponível.'}</p>
        <p>Último registro clínico: {clinicalDate(patient.ultima_atualizacao)}</p>
        <p>Tendência: indisponível</p>
        <Button onClick={() => navigate(`/cardiometabolico/pacientes/${patient.id}`)}>Abrir prontuário</Button>
      </article>)}
      <nav className="cardio-pagination" aria-label="Páginas de prioridade"><Button disabled={offset===0} onClick={() => setOffset(Math.max(0,offset-20))}>Anterior</Button>
      <span> {data.pagination.total} pacientes prioritários </span>
      <Button disabled={offset+20>=data.pagination.total} onClick={() => setOffset(offset+20)}>Próxima</Button></nav>
    </CardWidget>
    {has('timeline') && <CardWidget title="Atividade recente"><TimelineEvents events={data.recent_activity} /></CardWidget>}
    <CardWidget title="Evolução do acompanhamento">
      <p>Com Registro Diário: {data.evolution.com_registro} · Sem Registro Diário: {data.evolution.sem_registro}</p>
      <p>Continuidade regular: {data.continuidade.REGULAR} · Em atenção: {data.continuidade.ATENCAO} · Crítica: {data.continuidade.CRITICA}</p>
      <p>Consulte o prontuário para a trajetória clínica individual.</p>
    </CardWidget>
    </>}
  </PageLayout>;
}
