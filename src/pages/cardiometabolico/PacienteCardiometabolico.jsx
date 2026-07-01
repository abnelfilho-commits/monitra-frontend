import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  buscarPacienteCardiometabolico,
  listarTimelineCardiometabolico,
} from "../../services/cardiometabolico";

import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function PacienteCardiometabolico() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [paciente, setPaciente] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const ultimoRegistro =
  timeline?.find(
    (item) => item.tipo !== "Intervenção clínica"
  ) || null;

  const registrosClinicos = useMemo(() => {
    return timeline.filter(
      (item) => item.tipo !== "Intervenção clínica"
    );
  }, [timeline]);

  const ultimoRegistroComIMC =
    timeline?.find(
      (item) =>
        item.tipo !== "Intervenção clínica" &&
        item.imc !== undefined &&
        item.imc !== null
    ) || null;

  useEffect(() => {
    carregar();
  }, [id]);

  async function carregar() {
    try {
      const pacienteData =
        await buscarPacienteCardiometabolico(id);

      setPaciente(pacienteData);

      const timelineData =
        await listarTimelineCardiometabolico(id);

      setTimeline(timelineData || []);
    } catch (err) {
      console.error(err);
    }
  }

  const dadosGrafico = useMemo(() => {
    return timeline
      .filter((t) => t.glicemia)
      .map((t) => ({
        data: new Date(t.data).toLocaleDateString("pt-BR"),
        glicemia: t.glicemia,
      }))
      .reverse();
  }, [timeline]);

  const dadosPressao = useMemo(() => {
    return timeline
      .filter(
        (t) =>
          t.pressao_sistolica &&
          t.pressao_diastolica
      )
      .map((t) => ({
        data: new Date(t.data)
          .toLocaleDateString("pt-BR"),

        sistolica:
          t.pressao_sistolica,

        diastolica:
          t.pressao_diastolica,
      }))
      .reverse();
  }, [timeline]);

  const dadosIMC = useMemo(() => {
    return timeline
      .filter((t) => t.imc)
      .map((t) => ({
        data: new Date(t.data)
          .toLocaleDateString("pt-BR"),

        imc: t.imc,
      }))
      .reverse();
  }, [timeline]);

  const dadosScore = useMemo(() => {
    return timeline
      .filter(
        (t) => t.tipo !== "Intervenção clínica"
      )
      .map((t) => ({
        data: new Date(t.data)
          .toLocaleDateString("pt-BR"),

        score: t.score || 0,
      }))
      .reverse();
  }, [timeline]);

  if (!paciente) {
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
                      : "#dcfce7",

                  color:
                    paciente.risco === "critico"
                      ? "#991b1b"
                      : paciente.risco === "alto"
                      ? "#b91c1c"
                      : paciente.risco === "moderado"
                      ? "#92400e"
                      : "#166534",

                  padding: "6px 12px",
                  borderRadius: 999,
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {paciente.risco || "baixo risco"}
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
              onClick={() => navigate(`/cardiometabolico/pacientes/${id}/pts`)}
            >
              PTS
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
          valor={paciente.score_clinico || 0}
        />

        <CardStatus
          titulo="Tendência"
          valor={
            {
              estavel: "Estável",
              melhora: "Melhora Clínica",
              piora: "Piora Clínica",
              "alto risco persistente": "Alto Risco Persistente",
              "monitoramento inicial": "Monitoramento Inicial",
            }[paciente.tendencia] ||
            paciente.tendencia ||
            "Monitoramento Inicial"
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
            || paciente.protocolo
            || "Preventivo"
          }
        />

        <CardStatus
          titulo="Risco"
          valor={paciente.risco || "baixo"}
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
          ultimoRegistro?.pressao_sistolica
            ? `${ultimoRegistro.pressao_sistolica}x${ultimoRegistro.pressao_diastolica}`
            : "--"
         }
       />

       <CardIndicador
         titulo="Glicemia"
          valor={
            ultimoRegistro?.glicemia || "--"
          }
       />

        <CardIndicador
          titulo="IMC"
          valor={ultimoRegistroComIMC?.imc ?? "--"}
        />

        <CardIndicador
          titulo="Peso"
          valor={
            ultimoRegistro?.peso
              ? `${ultimoRegistro.peso} kg`
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
              {paciente.score_clinico || 0}
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
                  "monitoramento inicial": "Monitoramento Inicial",
                }[paciente.tendencia] ||
                paciente.tendencia ||
                "Monitoramento Inicial"
              }
            </strong>
          </p>

          <p>
            Risco:{" "}
            <strong>
              {paciente.risco || "baixo"}
            </strong>
          </p>

        </Box>

        <Box>
          <h2>Leitura Automatizada</h2>

          <p>
            {paciente.leitura_clinica ||
              "Paciente em acompanhamento longitudinal cardiometabólico."}
          </p>
        </Box>

      </div>

      {/* FATORES DE RISCO */}
      <Box>
        <h2>Fatores que elevaram o risco</h2>

        {ultimoRegistro?.eventos_clinicos?.length > 0 ? (
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 12,
            }}
          >
            {ultimoRegistro.eventos_clinicos.map((evento, index) => (
              <span
                key={index}
                style={{
                  background: "#fee2e2",
                  color: "#991b1b",
                  padding: "8px 12px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {evento}
              </span>
            ))}
          </div>
        ) : (
          <p>
            Nenhum fator crítico identificado no último registro.
          </p>
        )}
      </Box>

      {/* GRÁFICO */}
      <Box>
        <h2>Evolução glicêmica</h2>

        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="data" />

              <YAxis />

              <Tooltip />

              <Line
                type="monotone"
                dataKey="glicemia"
                stroke="#2563eb"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Box>

      <Box>
        <h2>Evolução da pressão arterial</h2>

        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={dadosPressao}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="data" />

              <YAxis />

              <Tooltip />

              <Line
                type="monotone"
                dataKey="sistolica"
                stroke="#dc2626"
                strokeWidth={3}
              />

              <Line
                type="monotone"
                dataKey="diastolica"
                stroke="#f59e0b"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Box>

      {dadosIMC.length > 0 && (
        <Box>
          <h2>Evolução do IMC</h2>

          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={dadosIMC}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="imc"
                  stroke="#7c3aed"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Box>
      )}

      <Box>
        <h2>Evolução do score clínico</h2>

        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={dadosScore}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="data" />

              <YAxis />

              <Tooltip />

              <Line
                type="monotone"
                dataKey="score"
                stroke="#2563eb"
                strokeWidth={4}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Box>

      {/* TIMELINE */}
      <Box>
        <h2>Timeline clínica</h2>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {timeline.map((item) => (
            <div
              key={item.id}
              style={{
                background:
                  item.risco === "critico"
                    ? "#fff1f2"
                    : item.risco === "alto"
                    ? "#fff5f5"
                    : item.risco === "moderado"
                    ? "#fffbeb"
                    : item.risco === "intervencao"
                    ? "#eff6ff"
                    : "#f0fdf4",

                border:
                  item.risco === "critico"
                    ? "1px solid #fda4af"
                    : item.risco === "alto"
                    ? "1px solid #fecaca"
                    : item.risco === "moderado"
                    ? "1px solid #fde68a"
                    : item.risco === "intervencao"
                    ? "1px solid #bfdbfe"
                    : "1px solid #bbf7d0",
                borderRadius: 20,
                padding: 24,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                  flexWrap: "wrap",
                  gap: 10,
                }}
             >

               <strong
                  style={{
                    fontSize: 16,
                    color: "#0f172a",
                  }}
                >
                 {item.tipo_evento}
                </strong>

                <span
                  style={{
                    fontSize: 13,
                    color: "#64748b",
                  }}
                >
                  {new Date(item.data)
                    .toLocaleString("pt-BR")}
                </span>

              </div>

              {item.tipo !== "Intervenção clínica" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                  }}
                >
                  <Info label="🩸 Glicemia" valor={item.glicemia || "--"} />
                  <Info label="❤️ Pressão" valor={item.pressao || "--"} />
                  <Info label="⚖️ Peso" valor={item.peso ? `${item.peso} kg` : "--"} />
                  <Info label="😴 Sono" valor={item.sono || "--"} />
                  <Info label="🧠 Humor" valor={item.humor || "--"} />
                  <Info label="📊 Score" valor={item.score || 0} />
                </div>
              )}

              <div
                style={{
                  marginTop: 18,
                  padding: 14,
                  borderRadius: 12,
                  background: "#f8fafc",
                  color: "#334155",
                }}
              >
                💡 {item.descricao}

                {item.eventos_clinicos?.length > 0 && (
                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {item.eventos_clinicos.map((evento, index) => (
                      <span
                        key={index}
                        style={{
                          background: "#fee2e2",
                          color: "#991b1b",
                          padding: "6px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {evento}
                      </span>
                    ))}
                  </div>
                )}
              </div>
                 
              </div>
          
            ))}     

        </div>

      </Box>

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

function Info({
  label,
  valor,
}) {
  return (
    <div
      style={{
        background: "#f8fafc",
        borderRadius: 12,
        padding: 12,
      }}
    >

      <div
        style={{
          fontSize: 12,
          color: "#64748b",
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        {valor}
      </div>

    </div>
  );
}
