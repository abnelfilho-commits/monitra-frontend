
import {
  obterDashboardAnalytics,
} from "../../services/cardiometabolico";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../../components/ui/Button";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,  
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

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

function calcularScore(paciente) {
  if (paciente.score !== undefined && paciente.score !== null) {
    return Number(paciente.score);
  }

  if (paciente.score_clinico !== undefined && paciente.score_clinico !== null) {
    return Number(paciente.score_clinico);
  }

  const glicemia = Number(paciente.glicemia || 0);
  const imc = Number(paciente.imc || 0);

  let sistolica = 0;

  if (typeof paciente.pa === "string" && paciente.pa.includes("x")) {
    sistolica = Number(paciente.pa.split("x")[0] || 0);
  } else if (paciente.pressao_sistolica) {
    sistolica = Number(paciente.pressao_sistolica || 0);
  }

  let score = 0;

  if (glicemia >= 180) score += 3;
  else if (glicemia >= 150) score += 2;

  if (sistolica >= 160) score += 3;
  else if (sistolica >= 140) score += 2;

  if (imc >= 35) score += 2;
  else if (imc >= 30) score += 1;

  return score;
}

export default function DashboardCardiometabolico() {
  const navigate = useNavigate();

  const [pacientesCriticos, setPacientesCriticos] = useState([]);

  const [indicadores, setIndicadores] = useState(null);

  const [graficoGlicemia, setGraficoGlicemia] =
    useState([]);

  const pacientesComScore =
    pacientesCriticos.map((p) => ({
      ...p,
      score: calcularScore(p),
    }));

  const dadosGrafico =
    pacientesComScore
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 12)
      .map((p) => ({
        nome: p.nome?.split(" ")[0] || "Paciente",
        glicemia: Number(p.glicemia || 0),
        score: Number(p.score || 0),
      }));

  const distribuicaoRisco = [
    {
      name: "Baixo",
      value: indicadores?.baixo || 0,
    },
    {
      name: "Moderado",
      value: indicadores?.moderado || 0,
    },
    {
      name: "Alto",
      value: indicadores?.alto_risco || 0,
    },
    {
      name: "Crítico",
      value: indicadores?.critico || 0,
    },
  ];

  useEffect(() => {
    async function carregarDashboard() {

    const data =
      await obterDashboardAnalytics();

    setIndicadores(data.indicadores);

    setPacientesCriticos(
      data.pacientes_criticos
    );

    setGraficoGlicemia(
      data.grafico_glicemia
    );

  }

  carregarDashboard();

  }, []);
  return (
    <div
      style={{
        padding: 24,
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "flex-start",
          marginBottom: 8,
        }}
      >
        <div style={{ flex: "1 1 320px", minWidth: 280 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>
                Dashboard Cardiometabólico
              </h2>

              <p
                style={{
                  marginTop: 4,
                  color: "#4b5563",
                }}
              >
                Visão executiva longitudinal para monitoramento, priorização e tomada de decisão clínica.
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="secondary"
            onClick={() =>
              navigate("/cardiometabolico/pacientes")
            }
          >
            Pacientes
          </Button>

          <Button
            variant="secondary"
            onClick={() =>
              navigate("/profissionais?modulo=cardiometabolico")
            }
          >
            Profissionais
          </Button>

          <Button
            variant="secondary"
            onClick={() =>
              navigate("/clinicas?modulo=cardiometabolico")
            }
          >
            Clínicas
          </Button>

          <Button
            variant="secondary"
            onClick={() =>
              navigate("/responsaveis?modulo=cardiometabolico")
            }
          >
            Responsáveis
          </Button>

          <Button
            variant="secondary"
            onClick={() =>
              navigate("/cardiometabolico/mapa-risco")
            }
          >
            Mapa de Risco
          </Button>

          <Button
            onClick={() =>
              navigate("/pacientes/novo?modulo=cardiometabolico")
            }
          >
            + Novo Paciente
          </Button>

          <Button
            onClick={() =>
              navigate("/profissionais/novo?modulo=cardiometabolico")
            }
          >
            + Novo Profissional
          </Button>

          <Button
            variant="secondary"
            onClick={() =>
              window.location.reload()
            }
          >
            Atualizar
          </Button>
        </div>
      </div>
      <div style={{ marginTop: 24 }}>
        <TituloSecao>
          📊 Indicadores principais
        </TituloSecao>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <CardIndicador
            titulo="Total pacientes"
            valor={indicadores?.total_pacientes || 0}
            subtitulo="Pacientes monitorados"
          />

          <CardIndicador
            titulo="🚨 Alto/Crítico"
            valor={(indicadores?.alto_risco || 0) + (indicadores?.critico || 0)}
            subtitulo="Necessitam atenção imediata"
            background="#fef2f2"
            corValor="#b91c1c"
          />

          <CardIndicador
            titulo="🩸 Glicemia crítica"
            valor={indicadores?.glicemia_critica || 0}
            subtitulo="Acima da meta clínica"
            background="#fff7ed"
            corValor="#c2410c"
          />

          <CardIndicador
            titulo="⚖️ Obesidade severa"
            valor={indicadores?.obesidade || 0}
            subtitulo="IMC > 35"
            background="#fefce8"
            corValor="#a16207"
          />

          <CardIndicador
            titulo="❤️ Hipertensão persistente"
            valor={indicadores?.hipertensos || 0}
            subtitulo="PA elevada recorrente"
            background="#eff6ff"
            corValor="#1d4ed8"
          />

          <CardIndicador
            titulo="📉 Sem acompanhamento"
            valor={indicadores?.sem_acompanhamento || 0}
            subtitulo="Sem registros recentes"
            background="#f3f4f6"
            corValor="#4b5563"
          />
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: 24,
          marginTop: 24,
        }}
      >
        <h2
          style={{
            fontSize: 32,
            fontWeight: 700,
            marginBottom: 24,
          }}
        >
          📈 Score clínico populacional
        </h2>

        <div
          style={{
            width: "100%",
            height: 320,
          }}
        >
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="nome" />

              <YAxis />

              <Tooltip />

              <Line
                type="monotone"
                dataKey="score"
                stroke="#2563eb"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: 24,
          marginTop: 24,
        }}
      >
        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 24,
          }}
        >
          📊 Distribuição de risco
        </h2>

        <div
          style={{
            width: "100%",
            height: 320,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribuicaoRisco}
                dataKey="value"
                nameKey="name"
                outerRadius={120}
                label
              >
                <Cell fill="#22c55e" />
                <Cell fill="#facc15" />
                <Cell fill="#f97316" />
                <Cell fill="#dc2626" />

              </Pie>

              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <TituloSecao>
          🚨 Prioridade do dia
        </TituloSecao>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {pacientesComScore.map((paciente) => (
            <div
              key={paciente.id}
              style={{
                background: "#fff",
                borderRadius: 18,
                padding: 20,
                border: "1px solid #e5e7eb",
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 20,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 999,
                          background:
                            paciente.score >= 8
                              ? "#ef4444"
                              : "#f59e0b",

                          color: "white",

                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",

                          fontWeight: 800,
                          fontSize: 14,
                        }}
                      >
                        {paciente.score}
                      </div>

                      <h3
                        style={{
                          margin: 0,
                          fontSize: 26,
                        }}
                      >
                        {paciente.nome}
                      </h3>
                    </div>                    

                    <span
                      style={{
                        background:
                          paciente.risco === "critico"
                            ? "#fee2e2"
                            : paciente.risco === "alto"
                            ? "#fee2e2"
                            : "#fef3c7",

                        color:
                          paciente.risco === "critico"
                            ? "#991b1b"
                            : paciente.risco === "alto"
                            ? "#b91c1c"
                            : "#92400e",

                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {
                        paciente.risco === "critico"
                          ? "Crítico"
                          : paciente.risco === "alto"
                          ? "Alto risco"
                          : paciente.risco === "moderado"
                          ? "Atenção"
                          : "Baixo risco"
                      }
                    </span>
                  </div>

                  <p
                    style={{
                      color: "#4b5563",
                      marginTop: 10,
                    }}
                  >
                    {paciente.resumo}
                  </p>

                  <div
                    style={{
                      marginTop: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      background:
                        paciente.tendencia === "piora"
                          ? "#fee2e2"
                          : "#fef3c7",

                      color:
                        paciente.tendencia === "piora"
                          ? "#b91c1c"
                          : "#92400e",

                      padding: "6px 12px",
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {paciente.tendencia === "piora"
                      ? "📈 Tendência de piora"
                      : "⚠️ Tendência de alerta"}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 18,
                      flexWrap: "wrap",
                      marginTop: 14,
                      fontSize: 14,
                    }}
                  >
                    <div>
                      🩸 Glicemia:{" "}
                      <strong>
                        {paciente.glicemia}
                      </strong>
                    </div>

                    {paciente.imc ? (
                      <div>
                        ⚖️ IMC:{" "}
                        <strong>{paciente.imc}</strong>
                      </div>
                    ) : null}

                    <div>
                      ❤️ PA:{" "}
                      <strong>
                        {paciente.pa}
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginTop: 18,
                    }}
                  >
                    <div
                      style={{
                        background: "#f3f4f6",
                        padding: "8px 14px",
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      📅 Última atualização:
                      {" "}
                      {paciente.ultima_atualizacao || "Hoje"}
                    </div>

                    <div
                      style={{
                        background: "#fef2f2",
                        color: "#b91c1c",
                        padding: "8px 14px",
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      🚨 Prioridade assistencial
                    </div>
                  </div>

                </div>

                <div
                  style={{
                    minWidth: 120,
                    textAlign: "right",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                    }}
                  >
                    Score de risco
                  </div>

                  <div
                    style={{
                      fontSize: 42,
                      fontWeight: 800,
                      color:
                        paciente.score >= 8
                          ? "#b91c1c"
                          : "#92400e",
                    }}
                  >
                    {paciente.score}
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      marginTop: 10,
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      padding: "6px 12px",
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    📘 {paciente.protocolo_label}
                  </div>

                  <Button
                    onClick={() =>
                      navigate(
                        `/cardiometabolico/pacientes/${paciente.id}`
                      )
                    }
                  >
                    Abrir prontuário
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
