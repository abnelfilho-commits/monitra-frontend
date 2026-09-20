import { obterCockpitProfissional } from "../../services/cockpit";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { obterDashboardAnalytics } from '../../services/cardiometabolico';
import Button from '../../components/ui/Button';
import { TimelineEvents } from './TimelineCardiometabolico';

function CardIndicador({
  titulo,
  valor,
  subtitulo,
  background = "white",
  corValor = "#111827",
}) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 14,
        padding: 16,
        background,
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.75 }}>
        {titulo}
      </div>

      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          marginTop: 6,
          color: corValor,
        }}
      >
        {valor}
      </div>

      {subtitulo ? (
        <div
          style={{
            fontSize: 12,
            color: "#6b7280",
            marginTop: 6,
          }}
        >
          {subtitulo}
        </div>
      ) : null}
    </div>
  );
}

function TituloSecao({ children }) {
  return (
    <h3
      style={{
        marginTop: 0,
        marginBottom: 14,
        fontSize: 22,
      }}
    >
      {children}
    </h3>
  );
}


const reasons = {
  RISCO_CLINICO_CRITICO: 'Risco clínico crítico', RISCO_CLINICO_ALTO: 'Risco clínico alto',
  CONTINUIDADE_CRITICA: 'Continuidade crítica', RISCO_CLINICO_MODERADO: 'Risco clínico moderado',
  CONTINUIDADE_ATENCAO: 'Continuidade em atenção',
};
export default function DashboardCardiometabolico({ professional = false }) {
  const { user } = useAuth();
  const professionalMode = professional || user?.perfil === "PROFISSIONAL";
  const navigate = useNavigate();
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
  if (error === offset) return <p role="alert">Não foi possível carregar o Cockpit.</p>;
  if (!data) return <p>Carregando Cockpit...</p>;
  const has = capability => data.capabilities[capability] === 'ACTIVE';
  return <div style={{padding:24, maxWidth:1220, margin:'0 auto'}}>
    <h1>Bem-vindo ao Cockpit Cardiometabólico</h1>
    <p>Acompanhamento da população na Linha Cardiometabólica.</p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:16}}>
      {[['Total de pacientes', 'total_pacientes'], ['Risco crítico','critico'], ['Risco alto','alto_risco'],
        ['Risco moderado','moderado'], ['Risco baixo','baixo'], ['Risco indisponível','indisponivel']]
        .map(([label,key]) => <CardIndicador key={key} titulo={label} valor={data.indicadores[key]} />)}
    </div>
    <section style={{marginTop:24}}><TituloSecao>Ações rápidas</TituloSecao>
      <Button onClick={() => navigate('/cardiometabolico/pacientes')}>Pacientes Cardio</Button>
      <Button onClick={() => navigate('/pacientes/novo?modulo=cardiometabolico')}>Novo paciente</Button>
      {has('daily_record') && <Button onClick={() => navigate('/cardiometabolico/pacientes')}>Registro Diário</Button>}
      {has('interventions') && <Button onClick={() => navigate('/cardiometabolico/pacientes')}>Intervenções</Button>}
    </section>
    <section style={{marginTop:24}}><TituloSecao>Prioridade do dia</TituloSecao>
      <p>Prioridade operacional. Risco clínico e continuidade são sinais independentes.</p>
      {!data.pacientes_criticos.length && <p>Nenhum paciente prioritário nesta página.</p>}
      {data.pacientes_criticos.map(patient => <article key={patient.id} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:18,padding:20,marginBottom:16}}>
        <h3>{patient.nome}</h3><strong>{reasons[patient.motivo_principal]}</strong>
        <ul>{patient.sinais.map(signal => <li key={signal}>{reasons[signal]}</li>)}</ul>
        <p>Risco clínico: {patient.risco ?? 'Indisponível'} · Continuidade: {patient.continuidade.classification}</p>
        <p>{patient.resumo ?? 'Leitura clínica indisponível.'}</p>
        <p>Último registro clínico: {patient.ultima_atualizacao ?? 'Não iniciado'}</p>
        <p>Tendência: indisponível</p>
        <Button onClick={() => navigate(`/cardiometabolico/pacientes/${patient.id}`)}>Abrir prontuário</Button>
      </article>)}
      <Button disabled={offset===0} onClick={() => setOffset(Math.max(0,offset-20))}>Anterior</Button>
      <span> {data.pagination.total} pacientes prioritários </span>
      <Button disabled={offset+20>=data.pagination.total} onClick={() => setOffset(offset+20)}>Próxima</Button>
    </section>
    {has('timeline') && <section style={{marginTop:24}}><TituloSecao>Atividade recente</TituloSecao><TimelineEvents events={data.recent_activity} /></section>}
    <section style={{marginTop:24}}><TituloSecao>Evolução do acompanhamento</TituloSecao>
      <p>Com Registro Diário: {data.evolution.com_registro} · Sem Registro Diário: {data.evolution.sem_registro}</p>
      <p>Continuidade regular: {data.continuidade.REGULAR} · Em atenção: {data.continuidade.ATENCAO} · Crítica: {data.continuidade.CRITICA}</p>
      <p>Consulte o prontuário para a trajetória clínica individual.</p>
    </section>
  </div>;
}
