import Button from "../../components/ui/Button";
import LongitudinalBemEstar from "./LongitudinalBemEstar";
import { useNavigate } from "react-router-dom";
import { wellbeingEvents, displayTimestamp, wellbeingDimensions, valueLabels } from "./bemEstarPresentation";
import "./ProntuarioSaudeMental.css";

const comparisonLabels = { MELHORA_OBSERVACIONAL: "Melhora observacional", PIORA_OBSERVACIONAL: "Piora observacional", ESTABILIDADE_OBSERVACIONAL: "Estável", OSCILACAO: "Oscilação", INSUFICIENTE: "Dados insuficientes para comparação" };
const readingTones = { MOMENTO_OBSERVADO: "observed", LEITURA_DESCRITIVA: "longitudinal" };
const comparisonTones = { MELHORA_OBSERVACIONAL: "improvement", PIORA_OBSERVACIONAL: "worsening", ESTABILIDADE_OBSERVACIONAL: "stable", OSCILACAO: "oscillation" };
// Presentation of existing ordinal categories only, never a score or risk assessment.
function dimensionTone(key, categories, observation) {
  if (observation?.reported_value === "NAO_SE_APLICA") return "neutral";
  const position = categories.indexOf(observation?.value);
  if (position < 0) return "neutral";
  const tones = ["emphasis", "emphasis", "midpoint", "soft", "soft"];
  return tones[["ansiedade", "estresse"].includes(key) ? categories.length - 1 - position : position];
}
const contextLabels = { ABERTO: "Aberto", ENCERRADO: "Encerrado", PROGRAMADO: "Programado" };
const lineLabels = { ATIVA: "Ativa", INATIVA: "Inativa", AUSENTE: "Não vinculada" };
const cardStyle = { border: "1px solid #ddd", borderRadius: 12, padding: 16, background: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.04)" };
const labelStyle = { fontSize: 13, opacity: 0.75 };

export default function ProntuarioSaudeMental({ jornada, onRefresh }) {
  const navigate = useNavigate();
  const name = jornada.nome_social || jornada.nome_completo;
  const wellbeing = jornada.bem_estar;
  const reading = jornada.clinical_reading;
  const records = wellbeing?.checkins;
  const checkinAvailable = wellbeing?.pode_registrar === true
    && wellbeing.formulario?.campos?.length > 0;
  const latest = wellbeingEvents(records || [], name, jornada.pessoa_id)[0];
  const latestRecord = records?.find(item => `CHECKIN:${item.id}` === latest?.id);
  const description = latestRecord?.respostas?.evento_descricao?.trim();

  return <div className="mental-record">
    <div className="mental-record__header" style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div className="mental-record__identity" style={{ flex: "1 1 420px", minWidth: 320 }}>
        <h2 style={{ margin: 0 }}>Pessoa: {name}</h2>
        <p style={{ marginTop: 6, color: "#111827" }}><b>Instituição:</b> {jornada.instituicao_nome}</p>
        <p style={{ marginTop: 6, color: "#111827" }}><b>Contexto assistencial:</b> {contextLabels[jornada.contexto_estado]}{ " | " }<b>Linha:</b> Saúde Mental ({lineLabels[jornada.linha_estado]})</p>
        {jornada.data_inicio && <p style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>Início: {jornada.data_inicio.split("-").reverse().join("/")}{jornada.data_fim ? ` · Encerramento: ${jornada.data_fim.split("-").reverse().join("/")}` : ""}</p>}
      </div>
      <div className="mental-record__toolbar" role="group" aria-label="Ações clínicas" style={{ flex: "1 1 420px", minWidth: 320, display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "flex-end" }}>
        <Button disabled={!checkinAvailable} title={!checkinAvailable ? "Registro indisponível nesta consulta" : undefined} onClick={() => navigate(`/saude-mental/pessoas/${jornada.pessoa_id}/contextos/${jornada.contexto_assistencial_id}/check-ins/novo?instituicao_id=${jornada.instituicao_id}`)}>Check-in de Bem-Estar</Button>
        <Button variant="secondary" disabled={jornada.diagnosticos?.pode_registrar !== true} onClick={() => navigate(`/saude-mental/pessoas/${jornada.pessoa_id}/contextos/${jornada.contexto_assistencial_id}/diagnosticos/novo?instituicao_id=${jornada.instituicao_id}`)}>Registrar Diagnóstico</Button>
        <Button variant="secondary" disabled={jornada.phq9?.pode_registrar !== true} onClick={() => navigate(`/saude-mental/pessoas/${jornada.pessoa_id}/contextos/${jornada.contexto_assistencial_id}/phq9?instituicao_id=${jornada.instituicao_id}`)}>PHQ-9</Button>
        <Button variant="secondary" disabled={jornada.gad7?.pode_registrar !== true} onClick={() => navigate(`/saude-mental/pessoas/${jornada.pessoa_id}/contextos/${jornada.contexto_assistencial_id}/gad7?instituicao_id=${jornada.instituicao_id}`)}>GAD-7</Button>
        <Button variant="secondary" disabled={jornada.cbi?.pode_registrar !== true} onClick={() => navigate(`/saude-mental/pessoas/${jornada.pessoa_id}/contextos/${jornada.contexto_assistencial_id}/cbi?instituicao_id=${jornada.instituicao_id}`)}>CBI</Button>
        <Button variant="secondary" disabled={jornada.linha_estado !== "ATIVA"} onClick={() => navigate(`/saude-mental/pessoas/${jornada.pessoa_id}/contextos/${jornada.contexto_assistencial_id}/pts?instituicao_id=${jornada.instituicao_id}`)}>PTS</Button>
        {["Gerar relatório"].map(action =>
          <span key={action} title="Em implementação"><Button variant="secondary" disabled title="Em implementação">{action}</Button></span>
        )}
        <Button variant="secondary" disabled={jornada.intervencoes?.pode_registrar !== true} title={jornada.intervencoes?.pode_registrar !== true ? "Registro indisponível nesta consulta" : undefined} onClick={() => navigate(`/saude-mental/pessoas/${jornada.pessoa_id}/contextos/${jornada.contexto_assistencial_id}/intervencoes/nova?instituicao_id=${jornada.instituicao_id}`)}>Intervenção</Button>
        <Button variant="secondary" title="Consultar novamente esta jornada" onClick={onRefresh}>Atualizar</Button>
      </div>
    </div>
    <div className="mental-record__summary" style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
      <div style={cardStyle}><div style={labelStyle}>Intervenções</div><div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{jornada.intervencoes?.total ?? "-"}</div></div>
      <div style={cardStyle}><div style={labelStyle}>Check-ins de Bem-Estar</div><div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{Array.isArray(records) ? records.length : "-"}</div></div>
      <div style={cardStyle}><div style={labelStyle}>Último evento</div><div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>{latest ? "Check-in de Bem-Estar" : "-"}</div><div style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>{latest ? displayTimestamp(latest.created_at) : "-"}</div></div>
      <div style={cardStyle}><div style={labelStyle}>Resumo recente</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 6, overflowWrap: "anywhere" }}>{description ? description.length > 70 ? `${description.slice(0, 70)}...` : description : "-"}</div></div>
    </div>
    <section aria-label="Resumo clínico automático" className={`mental-reading mental-reading--${readingTones[reading?.clinical_state?.status] || "neutral"}${reading?.alerts?.length > 0 ? " mental-reading--attention" : ""}`}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div className="mental-reading__eyebrow">Inteligência clínica</div>
          <h3 style={{ marginTop: 6, marginBottom: 6 }}>Resumo clínico automático</h3>
          {reading?.clinical_state?.titulo && <div className="mental-reading__state">{reading.clinical_state.titulo}</div>}
          {reading?.clinical_state?.descricao && <div style={{ marginTop: 6, color: "#4b5563", maxWidth: 760 }}>{reading.clinical_state.descricao}</div>}
        </div>
        <div style={{ padding: "8px 12px", borderRadius: 999, background: "#ffffff", border: "1px solid #e5e7eb", fontSize: 12, fontWeight: 700, color: "#374151" }}>
          Base: {reading?.metadata?.total_registros === 0 ? "Sem dados" : Number.isInteger(reading?.metadata?.total_registros) ? `${reading.metadata.total_registros} registro(s)` : "Indisponível"}
        </div>
      </div>
      <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.85)", border: "1px solid #e5e7eb" }}>
        <p style={{ margin: 0, lineHeight: 1.7, fontSize: 15, color: "#1f2937" }}>{reading?.summary || "Leitura clínica indisponível nesta consulta."}</p>
      </div>
    </section>
    <section aria-label="Painel Clínico Inteligente" className="mental-panel">
      <h3 style={{ marginTop: 0 }}>Painel Clínico Inteligente</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 12 }}>
        {wellbeingDimensions.map(({ key, label, categories }) => {
          const dimension = reading?.evidence?.dimensions?.[key];
          // The provider returns observations chronologically; never fall back to an older value.
          const observation = dimension?.observations?.at(-1);
          const value = observation?.reported_value === "NAO_SE_APLICA" ? "Não se aplica" : valueLabels[observation?.value] || "Sem dados";
          const auxiliary = reading?.metadata?.total_registros === 1 ? "Estado no Check-in mais recente"
            : reading?.metadata?.total_registros > 1 ? comparisonLabels[dimension?.state] || "Comparação indisponível" : "Sem observações nesta leitura";
          return <div key={key} className={`mental-dimension mental-dimension--${dimensionTone(key, categories, observation)}`}>
            <div style={labelStyle}>{label}</div>
            <div className="mental-dimension__value">{value}</div>
            <div className={`mental-comparison mental-comparison--${reading?.metadata?.total_registros > 1 ? comparisonTones[dimension?.state] || "neutral" : "neutral"}`}>{auxiliary}</div>
          </div>;
        })}
        <div className="mental-dimension mental-dimension--neutral">
          <div style={labelStyle}>Base clínica</div>
          <div className="mental-dimension__value">{reading?.metadata?.total_registros === 0 ? "Sem dados" : Number.isInteger(reading?.metadata?.total_registros) ? `${reading.metadata.total_registros} ${reading.metadata.total_registros === 1 ? "registro" : "registros"}` : "Indisponível"}</div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>Check-ins considerados nesta leitura</div>
        </div>
      </div>
      {reading?.alerts?.length > 0 && <div className="mental-panel__attention">
        <h4 style={{ marginTop: 0 }}>Atenção assistencial</h4>
        <ul style={{ marginBottom: 0 }}>{reading.alerts.map((alert, index) => <li key={index}>{alert}</li>)}</ul>
      </div>}
    </section>
    <LongitudinalBemEstar jornada={jornada} />
  </div>;
}
