import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listarDiagnosticos } from "../../services/diagnosticos";

import {
  buscarPacienteCardiometabolico,

} from "../../services/cardiometabolico";

import GraficosCardiometabolico from './GraficosCardiometabolico';
import TimelineCardiometabolico from './TimelineCardiometabolico';

export default function PacienteCardiometabolico() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [diagnosticos, setDiagnosticos] = useState([]);
  const [paciente, setPaciente] = useState(null);
  const [erro, setErro] = useState(null);
  useEffect(() => {
    let active = true;
    Promise.all([buscarPacienteCardiometabolico(id), listarDiagnosticos(id, 'CARDIO')])
      .then(([patient, diagnoses]) => { if (active) { setPaciente(patient); setDiagnosticos(diagnoses); } })
      .catch(() => { if (active) setErro(id); });
    return () => { active = false; };
  }, [id]);
  if (erro === id) return <p role="alert">Não foi possível carregar o prontuário.</p>;
  if (!paciente || String(paciente.id) !== id) {
    return (
      <div style={{ padding: 24 }}>
        Carregando paciente...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >

      {/* HEADER */}
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: 24,
          border: "1px solid #e2e8f0",
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 24,
            flexWrap: "wrap",
          }}
        >

          <div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >

              <h1
                style={{
                  margin: 0,
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {paciente.nome}
              </h1>

              <div
                style={{
                  background:
                    paciente.risco === "critico"
                      ? "#fee2e2"
                      : paciente.risco === "alto"
                      ? "#fee2e2"
                      : paciente.risco === "moderado"
                      ? "#fef3c7"
                      : paciente.risco === "baixo" ? "#dcfce7" : "#f1f5f9",

                  color:
                    paciente.risco === "critico"
                      ? "#991b1b"
                      : paciente.risco === "alto"
                      ? "#b91c1c"
                      : paciente.risco === "moderado"
                      ? "#92400e"
                      : paciente.risco === "baixo" ? "#166534" : "#475569",

                  padding: "6px 12px",
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {paciente.risco ?? "Indisponível"}
              </div>

            </div>

            <div
              style={{
                marginTop: 10,
                color: "#64748b",
                fontSize: 15,
              }}
            >
              Monitoramento longitudinal cardiometabólico
            </div>

          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >

            <button
              onClick={() =>
                navigate("/cardiometabolico/pacientes")
              }
            >
              ← Voltar
            </button>

            <button
              onClick={() =>
                navigate(
                  `/cardiometabolico/pacientes/${id}/registro-diario`
                )
              }
            >
              + Registro diário
            </button>

            <button
              onClick={() => navigate(`/pacientes/${id}/diagnosticos/novo?care_line=CARDIO`)}
            >
              + Diagnóstico
            </button>

            <button
              onClick={() =>
                navigate(
                  `/cardiometabolico/pacientes/${id}/intervencao`
                )
              }
            >
              + Nova intervenção
            </button>            

          </div>

        </div>

      </div>

      <section>
        <h2>Diagnósticos</h2>
        {diagnosticos.length === 0 && <p>Nenhum diagnóstico registrado.</p>}
        {diagnosticos.map((diagnostico) => (
          <button key={diagnostico.id} onClick={() => navigate(`/diagnosticos/${diagnostico.id}?care_line=CARDIO`)}>
            {diagnostico.descricao_clinica} — {diagnostico.status}
          </button>
        ))}
      </section>

      {/* STATUS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
        }}
      >

        <CardStatus
          titulo="Score clínico"
          valor={paciente.score_clinico ?? "Indisponível"}
        />

        <CardStatus
          titulo="Tendência"
          valor={
            {
              estavel: "Estável",
              melhora: "Melhora Clínica",
              piora: "Piora Clínica",
              "alto risco persistente": "Alto Risco Persistente",
              "monitoramento inicial": "Indisponível",
            }[paciente.tendencia] ||
            paciente.tendencia ||
            "Indisponível"
          }
        />

        <CardStatus
          titulo="Protocolo"
          valor={
            {
              preventivo: "Preventivo",

              acompanhamento_clinico:
                "Acompanhamento Clínico",

              intensivo_cardiometabolico:
                "Intensivo Cardiometabólico",

              busca_ativa:
                "Busca Ativa",

              monitoramento_preventivo:
        "Monitoramento Preventivo",
            }[paciente.protocolo]
            ?? paciente.protocolo
            ?? "Indisponível"
          }
        />

        <CardStatus
          titulo="Risco"
          valor={paciente.risco ?? "Indisponível"}
        />

      </div>

      {/* INDICADORES */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
       <CardIndicador
         titulo="Pressão arterial"
         valor={
          paciente.pressao ?? "Indisponível"
         }
       />

       <CardIndicador
         titulo="Glicemia"
          valor={
            paciente.glicemia ?? "Indisponível"
          }
       />

        <CardIndicador
          titulo="IMC"
          valor={paciente.imc ?? "Indisponível"}
        />

        <CardIndicador
          titulo="Peso"
          valor={
            paciente.peso != null
              ? `${paciente.peso} kg`
              : "--"
          }
        />

      </div>

      {/* LEITURA CLÍNICA */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >

        <Box>
          <h2>Inteligência Clínica</h2>

          <p>
            Score clínico:{" "}
            <strong>
              {paciente.score_clinico ?? "Indisponível"}
            </strong>
          </p>

          <p>
            Tendência:{" "}
            <strong>
              {
                {
                  estavel: "Estável",
                  melhora: "Melhora Clínica",
                  piora: "Piora Clínica",
                  "alto risco persistente": "Alto Risco Persistente",
                  "monitoramento inicial": "Indisponível",
                }[paciente.tendencia] ||
                paciente.tendencia ||
                "Indisponível"
              }
            </strong>
          </p>

          <p>
            Risco:{" "}
            <strong>
              {paciente.risco ?? "Indisponível"}
            </strong>
          </p>

        </Box>

        <Box>
          <h2>Leitura Automatizada</h2>

          <p>
            {paciente.leitura_clinica ||
              "Leitura clínica indisponível."}
          </p>
        </Box>

      </div>

      <Box><h2>Continuidade assistencial</h2>
        <p>{paciente.continuidade?.classification ?? 'Indisponível'}</p>
        <p>Independente do risco clínico.</p>
      </Box>
      <GraficosCardiometabolico pacienteId={id} />
      <TimelineCardiometabolico pacienteId={id} />

    </div>
  );
}

function Box({ children }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 20,
        padding: 24,
        border: "1px solid #e2e8f0",
      }}
    >
      {children}
    </div>
  );
}

function CardIndicador({
  titulo,
  valor,
}) {
  return (
    <Box>
      <div
        style={{
          fontSize: 14,
          color: "#64748b",
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 36,
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        {valor}
      </div>
    </Box>
  );
}

function CardStatus({
  titulo,
  valor,
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 18,
        padding: 18,
        border: "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "#64748b",
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 22,
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        {valor}
      </div>
    </div>
  );
}
