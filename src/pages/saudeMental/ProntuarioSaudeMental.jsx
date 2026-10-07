import { useRef, useState } from "react";
import Button from "../../components/ui/Button";
import StatCard from "../../components/ui/StatCard/StatCard";
import LongitudinalBemEstar from "./LongitudinalBemEstar";
import CheckinBemEstar from "./CheckinBemEstar";
import "./ProntuarioSaudeMental.css";

const contextLabels = { ABERTO: "Aberto", ENCERRADO: "Encerrado", PROGRAMADO: "Programado" };
const lineLabels = { ATIVA: "Ativa", INATIVA: "Inativa", AUSENTE: "Não vinculada" };
const date = value => value ? value.split("-").reverse().join("/") : "Sem data de encerramento";

export default function ProntuarioSaudeMental({ jornada, onSaved, onRefresh }) {
  const [checkinOpen, setCheckinOpen] = useState(false);
  const checkinSection = useRef(null);
  const name = jornada.nome_social || jornada.nome_completo;
  const wellbeing = jornada.bem_estar;
  const records = wellbeing?.checkins;
  // Mirrors the existing initial check-in availability, never a global profile.
  const initialAvailable = wellbeing?.pode_registrar === true
    && wellbeing.formulario?.campos?.length > 0 && records?.length === 0;
  const initialRecorded = Array.isArray(records) && records.length > 0;

  return <div className="mental-record">
    <section className="mental-record__identity" aria-labelledby="mental-person-name">
      <div className="mental-record__person">
        <span className="mental-record__avatar" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
        <div><p className="mental-record__eyebrow">Pessoa · Saúde Mental</p>
          <h2 id="mental-person-name">{name}</h2>
          <p className="mental-record__reference">Pessoa #{jornada.pessoa_id} · Contexto #{jornada.contexto_assistencial_id}</p>
        </div>
      </div>
      <dl className="mental-record__context">
        <div><dt>Instituição</dt><dd>{jornada.instituicao_nome}</dd></div>
        <div><dt>Contexto assistencial</dt><dd>{contextLabels[jornada.contexto_estado]}</dd>
          <dd className="mental-record__period">{date(jornada.data_inicio)} — {date(jornada.data_fim)}</dd></div>
        <div><dt>Linha de cuidado</dt><dd>Saúde Mental <span className="mental-record__badge">{lineLabels[jornada.linha_estado]}</span></dd></div>
      </dl>
      <div className="mental-record__toolbar" role="group" aria-label="Ações clínicas">
        <Button disabled={!initialAvailable || checkinOpen} onClick={() => {
          setCheckinOpen(true);
          requestAnimationFrame(() => checkinSection.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
        }}>Check-in de Bem-Estar</Button>
        {["Registrar Diagnóstico", "PHQ-9", "GAD-7", "CBI", "PTS", "Intervenção", "Gerar relatório"].map(action =>
          <span key={action} title="Em implementação"><Button variant="secondary" disabled title="Em implementação">{action}</Button></span>
        )}
        <Button variant="secondary" disabled={checkinOpen} title={checkinOpen ? "Conclua ou cancele o Check-in antes de atualizar" : "Consultar novamente esta jornada"} onClick={onRefresh}>Atualizar</Button>
      </div>
      <p className="mental-record__planned-note">Ações planejadas aparecem desabilitadas: em implementação.</p>
    </section>

    <section aria-labelledby="mental-overview-title">
      <h2 id="mental-overview-title">Visão Geral</h2>
      <div className="mental-record__summary">
        <StatCard title="Contexto assistencial" value={contextLabels[jornada.contexto_estado]}
          description="Estado do período assistencial selecionado." />
        <StatCard title="Linha Saúde Mental" value={lineLabels[jornada.linha_estado]}
          description="Estado da linha neste contexto." />
        <StatCard title="Check-in inicial" value={initialRecorded ? "Registrado" : initialAvailable ? "Disponível" : "Indisponível"}
          description={initialRecorded ? "Consulte o registro de Bem-Estar abaixo." : initialAvailable ? "Registro assistido disponível nesta jornada." : "Registro não disponível nesta consulta."} />
      </div>
      <p className="mental-record__line-note">{jornada.linha_estado === "ATIVA"
        ? "Linha Saúde Mental ativa neste contexto."
        : jornada.linha_estado === "AUSENTE"
          ? "A linha Saúde Mental ainda não foi vinculada a este contexto."
          : "A linha Saúde Mental está inativa neste contexto."}</p>
    </section>

    <section ref={checkinSection} className="mental-record__actions" aria-labelledby="mental-actions-title">
      <header><p className="mental-record__eyebrow">Atendimento</p>
        <h2 id="mental-actions-title">Ações clínicas</h2>
        <p>Registro assistido e acompanhamento de Bem-Estar nesta jornada.</p>
      </header>
      <CheckinBemEstar jornada={jornada} onSaved={onSaved} open={checkinOpen} setOpen={setCheckinOpen} showHistory={false} />
    </section>
    <LongitudinalBemEstar jornada={jornada} />
  </div>;
}
