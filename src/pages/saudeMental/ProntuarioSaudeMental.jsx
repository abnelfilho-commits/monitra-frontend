import { useRef, useState } from "react";
import Button from "../../components/ui/Button";
import LongitudinalBemEstar from "./LongitudinalBemEstar";
import CheckinBemEstar from "./CheckinBemEstar";
import { wellbeingEvents, displayTimestamp } from "./bemEstarPresentation";
import "./ProntuarioSaudeMental.css";

const contextLabels = { ABERTO: "Aberto", ENCERRADO: "Encerrado", PROGRAMADO: "Programado" };
const lineLabels = { ATIVA: "Ativa", INATIVA: "Inativa", AUSENTE: "Não vinculada" };
const cardStyle = { border: "1px solid #ddd", borderRadius: 12, padding: 16, background: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.04)" };
const labelStyle = { fontSize: 13, opacity: 0.75 };

export default function ProntuarioSaudeMental({ jornada, onSaved, onRefresh }) {
  const [checkinOpen, setCheckinOpen] = useState(false);
  const checkinSection = useRef(null);
  const name = jornada.nome_social || jornada.nome_completo;
  const wellbeing = jornada.bem_estar;
  const records = wellbeing?.checkins;
  const initialAvailable = wellbeing?.pode_registrar === true
    && wellbeing.formulario?.campos?.length > 0 && records?.length === 0;
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
        <Button disabled={!initialAvailable || checkinOpen} title={!initialAvailable ? "Registro indisponível nesta consulta" : undefined} onClick={() => {
          setCheckinOpen(true);
          requestAnimationFrame(() => checkinSection.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
        }}>Check-in de Bem-Estar</Button>
        {["Registrar Diagnóstico", "PHQ-9", "GAD-7", "CBI", "PTS", "Intervenção", "Gerar relatório"].map(action =>
          <span key={action} title="Em implementação"><Button variant="secondary" disabled title="Em implementação">{action}</Button></span>
        )}
        <Button variant="secondary" disabled={checkinOpen} title={checkinOpen ? "Conclua ou cancele o Check-in antes de atualizar" : "Consultar novamente esta jornada"} onClick={onRefresh}>Atualizar</Button>
      </div>
    </div>
    <div className="mental-record__summary" style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
      <div style={cardStyle}><div style={labelStyle}>Intervenções</div><div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>-</div></div>
      <div style={cardStyle}><div style={labelStyle}>Check-ins de Bem-Estar</div><div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{Array.isArray(records) ? records.length : "-"}</div></div>
      <div style={cardStyle}><div style={labelStyle}>Último evento</div><div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>{latest ? "Check-in de Bem-Estar" : "-"}</div><div style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>{latest ? displayTimestamp(latest.created_at) : "-"}</div></div>
      <div style={cardStyle}><div style={labelStyle}>Resumo recente</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 6, overflowWrap: "anywhere" }}>{description ? description.length > 70 ? `${description.slice(0, 70)}...` : description : "-"}</div></div>
    </div>
    <div hidden={!checkinOpen} ref={checkinSection} style={{ ...cardStyle, marginTop: 20 }}>
      <CheckinBemEstar jornada={jornada} onSaved={onSaved} open={checkinOpen} setOpen={setCheckinOpen} showHistory={false} />
    </div>
    <LongitudinalBemEstar jornada={jornada} />
  </div>;
}
