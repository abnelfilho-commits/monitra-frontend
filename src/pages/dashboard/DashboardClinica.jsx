import { useAuth } from "../../context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { obterCockpitGestao } from "../../services/cockpitGestao";

import Button from "../../components/ui/Button";

function formatarData(iso) {
  if (!iso) return "";

  const d = new Date(iso);
  const horas = d.getHours();
  const minutos = d.getMinutes();
  const segundos = d.getSeconds();

  const soData = horas === 0 && minutos === 0 && segundos === 0;

  return soData
    ? d.toLocaleDateString("pt-BR")
    : d.toLocaleString("pt-BR");
}

function corStatus(status) {
  if (status === "verde") return "#22c55e";
  if (status === "amarelo") return "#eab308";
  if (status === "vermelho") return "#ef4444";
  return "#9ca3af";
}

function corRisco(risco) {
  if (risco === "baixo_risco") return "#22c55e";
  if (risco === "atencao") return "#eab308";
  if (risco === "alto_risco") return "#ef4444";
  return "#9ca3af";
}

function corRiscoTexto(risco) {
  if (risco === "baixo_risco") return "#166534";
  if (risco === "atencao") return "#92400e";
  if (risco === "alto_risco") return "#991b1b";
  return "#4b5563";
}

function labelRisco(risco) {
  if (risco === "baixo_risco") return "Baixo risco";
  if (risco === "atencao") return "Atenção";
  if (risco === "alto_risco") return "Alto risco";
  return "Sem dados";
}

function labelTendencia(tendencia) {
  if (tendencia === "piora") return "Tendência de piora";
  if (tendencia === "estavel") return "Tendência estável";
  if (tendencia === "melhora") return "Tendência de melhora";
  return "Sem leitura";
}

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
      <div style={{ fontSize: 13, opacity: 0.75 }}>{titulo}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6, color: corValor }}>
        {valor}
      </div>
      {subtitulo ? (
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>{subtitulo}</div>
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
        fontSize: 18,
      }}
    >
      {children}
    </h3>
  );
}

export default function DashboardClinica() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuporte =
    user?.perfil === "SUPORTE";
  const [cockpit, setCockpit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  async function loadDashboard() {
    setErro("");
    setLoading(true);

    try {
      const data = await obterCockpitGestao();
      const cockpitV2 = data?.cockpit_v2;

      if (!cockpitV2) {
        throw new Error("Cockpit de Gestão V2 não disponível.");
      }

      setCockpit(cockpitV2);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Falha ao carregar Cockpit de Gestão.";

      setErro(String(msg));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <div style={{ padding: 24 }}>Carregando Cockpit de Gestão...</div>;
  }

  if (!cockpit) {
    return (
      <div style={{ padding: 24 }}>
        {erro || "Cockpit de Gestão indisponível."}
      </div>
    );
  }

  const contexto = cockpit?.contexto || {};
  const visaoExecutiva = cockpit?.visao_executiva || {};

  const situacaoClinica =
    cockpit?.situacao_populacao?.situacao_clinica || {};

  const continuidade =
    cockpit?.situacao_populacao?.continuidade_longitudinal || {};

  const prioridades =
    cockpit?.prioridades_atencao?.prioridades || [];

  const prioridadesResumo =
    cockpit?.prioridades_atencao?.por_motivo || {};

  const operacao =
    cockpit?.operacao_assistencial || {};

  const estrutura =
    cockpit?.estrutura_operacao;

  const atividadeRecente =
    cockpit?.atividade_recente || [];

  const isAdminGlobal =
    contexto?.escopo === "GLOBAL";

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 1280,
        margin: "0 auto",
      }}
    >
      {/* =========================================================
          CABEÇALHO
      ========================================================= */}

      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>
              Cockpit de Gestão — Neurodesenvolvimento
            </h2>

            <p
              style={{
                marginTop: 8,
                marginBottom: 0,
                color: "#4b5563",
                maxWidth: 760,
                lineHeight: 1.5,
              }}
            >
              Visão populacional e operacional da linha de cuidado.
            </p>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  background: "#eef2ff",
                  color: "#3730a3",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {contexto.perfil || "-"}
              </span>

              <span
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  background: "#f3f4f6",
                  color: "#374151",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {isAdminGlobal
                  ? "Visão global"
                  : "Visão da clínica"}
              </span>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={loadDashboard}
          >
            ↻ Atualizar
          </Button>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="secondary"
            onClick={() => navigate("/pacientes")}
          >
            Pacientes acompanhados
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate("/profissionais")}
          >
            Profissionais
          </Button>

          {isAdminGlobal && (
            <Button
              variant="secondary"
              onClick={() => navigate("/clinicas")}
            >
              Clínicas
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => navigate("/responsaveis")}
          >
            Responsáveis
          </Button>

          {!isSuporte && (
            <Button
              onClick={() => navigate("/pacientes/novo")}
            >
              + Novo paciente
            </Button>
          )}

          {!isSuporte && (
            <Button
              onClick={() => navigate("/profissionais/novo")}
            >
              + Novo profissional
            </Button>
          )}
        </div>
      </div>

      {erro && (
        <div
          style={{
            marginBottom: 20,
            padding: 12,
            borderRadius: 10,
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca",
          }}
        >
          {erro}
        </div>
      )}

      {/* =========================================================
          1. VISÃO EXECUTIVA
      ========================================================= */}

      <div style={{ marginTop: 24 }}>
        <TituloSecao>
          📊 Visão Executiva
        </TituloSecao>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          <CardIndicador
            titulo="Pessoas acompanhadas"
            valor={
              visaoExecutiva.pessoas_acompanhadas ?? 0
            }
            subtitulo="População ativa no escopo atual"
          />

          <CardIndicador
            titulo="Acompanhamento ativo"
            valor={
              visaoExecutiva.acompanhamento_ativo ?? 0
            }
            subtitulo="Com atividade assistencial nos últimos 30 dias"
          />

          <CardIndicador
            titulo="Cobertura assistencial"
            valor={`${Number(
              visaoExecutiva.cobertura_assistencial ?? 0
            ).toFixed(2)}%`}
            subtitulo="População com acompanhamento ativo"
            background="#eff6ff"
            corValor="#1d4ed8"
          />

          <CardIndicador
            titulo="Atenção necessária"
            valor={
              visaoExecutiva.atencao_necessaria ?? 0
            }
            subtitulo="Pessoas com motivo objetivo de atenção"
            background="#fff7ed"
            corValor="#c2410c"
          />

          <CardIndicador
            titulo="Profissionais ativos"
            valor={
              visaoExecutiva.profissionais_ativos ?? 0
            }
            subtitulo="Profissionais vinculados à operação"
            background="#f0fdf4"
            corValor="#166534"
          />
        </div>
      </div>

      {/* =========================================================
          2. SITUAÇÃO DA POPULAÇÃO
      ========================================================= */}

      <div style={{ marginTop: 32 }}>
        <TituloSecao>
          🧭 Situação da População
        </TituloSecao>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(420px, 1fr))",
            gap: 16,
          }}
        >
          {/* SITUAÇÃO CLÍNICA */}

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 18,
              background: "white",
              boxShadow:
                "0 4px 14px rgba(0,0,0,0.04)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              Situação Clínica
            </h3>

            <p
              style={{
                marginTop: -4,
                marginBottom: 16,
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              Classificação proveniente do Clinical Engine.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(120px, 1fr))",
                gap: 10,
              }}
            >
              <CardIndicador
                titulo="🚨 Alto risco"
                valor={situacaoClinica.alto_risco ?? 0}
                background="#fef2f2"
                corValor="#b91c1c"
              />

              <CardIndicador
                titulo="📍 Atenção"
                valor={situacaoClinica.atencao ?? 0}
                background="#fefce8"
                corValor="#a16207"
              />

              <CardIndicador
                titulo="📉 Em piora"
                valor={situacaoClinica.em_piora ?? 0}
                background="#fff7ed"
                corValor="#c2410c"
              />

              <CardIndicador
                titulo="🟢 Estáveis"
                valor={situacaoClinica.estavel ?? 0}
                background="#f0fdf4"
                corValor="#166534"
              />

              <CardIndicador
                titulo="⚪ Sem dados"
                valor={situacaoClinica.sem_dados ?? 0}
                background="#f3f4f6"
                corValor="#4b5563"
              />
            </div>
          </div>

          {/* CONTINUIDADE LONGITUDINAL */}

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 18,
              background: "white",
              boxShadow:
                "0 4px 14px rgba(0,0,0,0.04)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              Continuidade Longitudinal
            </h3>

            <p
              style={{
                marginTop: -4,
                marginBottom: 16,
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              Regularidade dos Registros Diários ao longo da
              jornada.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 10,
              }}
            >
              <CardIndicador
                titulo="🟢 Regular"
                valor={continuidade.regular ?? 0}
                subtitulo="0–3 dias"
                background="#f0fdf4"
                corValor="#166534"
              />

              <CardIndicador
                titulo="🟡 Atenção"
                valor={continuidade.atencao ?? 0}
                subtitulo="4–6 dias"
                background="#fefce8"
                corValor="#a16207"
              />

              <CardIndicador
                titulo="🔴 Crítica"
                valor={continuidade.critica ?? 0}
                subtitulo="7+ dias"
                background="#fef2f2"
                corValor="#b91c1c"
              />

              <CardIndicador
                titulo="⚪ Não iniciada"
                valor={continuidade.nao_iniciada ?? 0}
                subtitulo="Sem Registro Diário"
                background="#f3f4f6"
                corValor="#4b5563"
              />
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 10,
                background: "#f9fafb",
                fontSize: 13,
                color: "#4b5563",
                lineHeight: 1.5,
              }}
            >
              A continuidade longitudinal mede a regularidade dos
              Registros Diários e não substitui a classificação de
              risco clínico.
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          3. PRIORIDADES DE ATENÇÃO
      ========================================================= */}

      <div style={{ marginTop: 32 }}>
        <TituloSecao>
          🚨 Prioridades de Atenção
        </TituloSecao>

        <div
          style={{
            border: "1px solid #fed7aa",
            borderRadius: 16,
            padding: 18,
            background:
              "linear-gradient(180deg, #fffaf5 0%, #ffffff 100%)",
            boxShadow:
              "0 6px 20px rgba(234, 88, 12, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "flex-start",
              marginBottom: 18,
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>
                Pessoas que requerem atenção
              </h3>

              <p
                style={{
                  marginTop: 8,
                  marginBottom: 0,
                  color: "#6b7280",
                  maxWidth: 760,
                }}
              >
                Priorização baseada em motivos clínicos e de
                continuidade longitudinal, apresentados de forma
                transparente.
              </p>
            </div>

            <div
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                background: "#ffedd5",
                color: "#9a3412",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              {cockpit?.prioridades_atencao?.total_pessoas ?? 0}{" "}
              pessoas
            </div>
          </div>

          {/* RESUMO DOS MOTIVOS */}

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "#fee2e2",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Alto risco:{" "}
              {prioridadesResumo.risco_alto ?? 0}
            </span>

            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "#fef3c7",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Atenção clínica:{" "}
              {prioridadesResumo.atencao_clinica ?? 0}
            </span>

            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "#ffedd5",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Piora clínica:{" "}
              {prioridadesResumo.piora_clinica ?? 0}
            </span>

            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "#fee2e2",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Continuidade crítica:{" "}
              {prioridadesResumo.continuidade_critica ?? 0}
            </span>

            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "#fefce8",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Continuidade em atenção:{" "}
              {prioridadesResumo.continuidade_atencao ?? 0}
            </span>
          </div>

          {prioridades.length === 0 ? (
            <div
              style={{
                padding: 18,
                borderRadius: 12,
                background: "#f9fafb",
                color: "#4b5563",
              }}
            >
              Nenhuma prioridade de atenção identificada neste
              momento.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {prioridades.map((p, index) => {
                const motivos = Array.isArray(p.motivos)
                  ? p.motivos
                  : [];

                const labelsMotivos = {
                  RISCO_CLINICO_ALTO: "Alto risco clínico",
                  ATENCAO_CLINICA: "Atenção clínica",
                  PIORA_CLINICA: "Piora clínica",
                  CONTINUIDADE_CRITICA:
                    "Continuidade crítica",
                  CONTINUIDADE_ATENCAO:
                    "Continuidade em atenção",
                };

                return (
                  <div
                    key={p.id || p.paciente_id || index}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 14,
                      padding: 14,
                      background: "white",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          minWidth: 260,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 999,
                              background: "#ffedd5",
                              color: "#9a3412",
                              fontWeight: 800,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                            }}
                          >
                            {index + 1}
                          </div>

                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: 15,
                            }}
                          >
                            {p.nome ||
                              p.paciente_nome ||
                              `Pessoa #${
                                p.id || p.paciente_id
                              }`}
                          </div>
                        </div>

                        {motivos.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                              marginTop: 10,
                            }}
                          >
                            {motivos.map((motivo, motivoIndex) => {
                              const tipo =
                                typeof motivo === "string"
                                  ? motivo
                                  : motivo?.tipo;

                              const diasSemRegistro =
                                typeof motivo === "object"
                                  ? motivo?.dias_sem_registro
                                  : null;

                              return (
                                <span
                                  key={`${tipo || "MOTIVO"}-${motivoIndex}`}
                                  style={{
                                    padding: "5px 9px",
                                    borderRadius: 999,
                                    background:
                                      tipo === "RISCO_CLINICO_ALTO" ||
                                      tipo === "CONTINUIDADE_CRITICA"
                                        ? "#fee2e2"
                                        : tipo === "PIORA_CLINICA"
                                        ? "#ffedd5"
                                        : "#fef3c7",
                                    color: "#374151",
                                    fontSize: 12,
                                    fontWeight: 700,
                                  }}
                                >
                                  {labelsMotivos[tipo] || tipo || "Motivo de atenção"}

                                  {Number.isFinite(diasSemRegistro) &&
                                    (tipo === "CONTINUIDADE_CRITICA" ||
                                      tipo === "CONTINUIDADE_ATENCAO") && (
                                      <>
                                        {" "}
                                        · {diasSemRegistro}{" "}
                                        {diasSemRegistro === 1 ? "dia" : "dias"} sem registro
                                      </>
                                    )}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {p.profissional_nome && (
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 12,
                              color: "#6b7280",
                            }}
                          >
                            Profissional:{" "}
                            {p.profissional_nome}
                          </div>
                        )}
                      </div>

                      <Button
                        variant="secondary"
                        onClick={() =>
                          navigate(
                            `/pacientes/${
                              p.id || p.paciente_id
                            }`
                          )
                        }
                      >
                        Abrir prontuário
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================
          4. OPERAÇÃO ASSISTENCIAL
      ========================================================= */}

      <div style={{ marginTop: 32 }}>
        <TituloSecao>
          🩺 Operação Assistencial
        </TituloSecao>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#6b7280",
              fontSize: 13,
            }}
          >
            Volume de atividade assistencial no período.
          </p>

          <span
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "#f3f4f6",
              color: "#374151",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Últimos {operacao.periodo_dias ?? 30} dias
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          <CardIndicador
            titulo="📋 Registros Diários"
            valor={operacao.registros_diarios ?? 0}
          />

          <CardIndicador
            titulo="🩺 Sessões realizadas"
            valor={operacao.sessoes_realizadas ?? 0}
          />

          <CardIndicador
            titulo="🧪 Avaliações clínicas"
            valor={operacao.avaliacoes_clinicas ?? 0}
          />

          <CardIndicador
            titulo="🧠 Intervenções"
            valor={operacao.intervencoes ?? 0}
          />
        </div>
      </div>

      {/* =========================================================
          5. ESTRUTURA DA OPERAÇÃO — ADMIN GLOBAL
      ========================================================= */}

      {estrutura && Array.isArray(estrutura.unidades) && (
        <div style={{ marginTop: 32 }}>
          <TituloSecao>
            🏥 Estrutura da Operação
          </TituloSecao>

          <p
            style={{
              marginTop: -6,
              marginBottom: 14,
              color: "#6b7280",
              fontSize: 13,
            }}
          >
            Visão comparativa das unidades ou clínicas sob gestão.
          </p>

          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              overflow: "hidden",
              background: "white",
            }}
          >
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 820,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#f9fafb",
                      textAlign: "left",
                    }}
                  >
                    <th style={{ padding: 12 }}>
                      Unidade / Clínica
                    </th>

                    <th style={{ padding: 12 }}>
                      Pessoas
                    </th>

                    <th style={{ padding: 12 }}>
                      Ativas
                    </th>

                    <th style={{ padding: 12 }}>
                      Cobertura
                    </th>

                    <th style={{ padding: 12 }}>
                      Atenção
                    </th>

                    <th style={{ padding: 12 }}>
                      Profissionais
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {estrutura.unidades.map(
                    (unidade, index) => (
                      <tr
                        key={
                          unidade.id ||
                          unidade.clinica_id ||
                          index
                        }
                        style={{
                          borderTop:
                            "1px solid #e5e7eb",
                        }}
                      >
                        <td
                          style={{
                            padding: 12,
                            fontWeight: 700,
                          }}
                        >
                          {unidade.nome ||
                            unidade.clinica_nome ||
                            `Unidade #${
                              unidade.id ||
                              unidade.clinica_id
                            }`}
                        </td>

                        <td style={{ padding: 12 }}>
                          {unidade.pessoas_acompanhadas ??
                            unidade.total_pessoas ??
                            0}
                        </td>

                        <td style={{ padding: 12 }}>
                          {unidade.acompanhamento_ativo ??
                            unidade.pessoas_ativas ??
                            0}
                        </td>

                        <td style={{ padding: 12 }}>
                          {Number(
                            unidade.cobertura_assistencial ??
                              0
                          ).toFixed(2)}
                          %
                        </td>

                        <td style={{ padding: 12 }}>
                          {unidade.atencao_necessaria ??
                            unidade.pessoas_atencao ??
                            0}
                        </td>

                        <td style={{ padding: 12 }}>
                          {unidade.profissionais_ativos ??
                            0}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          6. ATIVIDADE RECENTE
      ========================================================= */}

      <div style={{ marginTop: 32 }}>
        <TituloSecao>
          🕘 Atividade Recente
        </TituloSecao>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 18,
            background: "white",
            boxShadow:
              "0 4px 14px rgba(0,0,0,0.04)",
          }}
        >
          {atividadeRecente.length === 0 ? (
            <p
              style={{
                margin: 0,
                color: "#6b7280",
              }}
            >
              Nenhuma atividade recente encontrada.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {atividadeRecente.map((item, index) => {
                const tipoConfig = {
                  REGISTRO_DIARIO: {
                    label: "📋 Registro Diário",
                    background: "#f9fff5",
                  },

                  INTERVENCAO: {
                    label: "🧠 Intervenção",
                    background: "#f5f9ff",
                  },

                  AVALIACAO_CLINICA: {
                    label: "🧪 Avaliação Clínica",
                    background: "#fffdf5",
                  },

                  SESSAO_REALIZADA: {
                    label: "🩺 Sessão Realizada",
                    background: "#f5fbff",
                  },

                  DIAGNOSTICO: {
                    label: "🧾 Diagnóstico",
                    background: "#fff8f8",
                  },
                };

                const config =
                  tipoConfig[item.tipo_evento] || {
                    label: "📌 Evento Assistencial",
                    background: "#f9fafb",
                  };

                return (
                  <div
                    key={`${item.paciente_id}-${item.tipo_evento}-${item.id}-${index}`}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                      background: config.background,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 14,
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          minWidth: 260,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                          }}
                        >
                          {config.label}
                        </div>

                        <div
                          style={{
                            fontSize: 13,
                            color: "#6b7280",
                            marginTop: 5,
                          }}
                        >
                          Pessoa:{" "}
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/pacientes/${item.paciente_id}`
                              )
                            }
                            style={{
                              border: 0,
                              background: "transparent",
                              padding: 0,
                              cursor: "pointer",
                              color: "#2563eb",
                              fontWeight: 700,
                            }}
                          >
                            {item.paciente_nome ||
                              `#${item.paciente_id}`}
                          </button>
                        </div>

                        {item.descricao && (
                          <div
                            style={{
                              marginTop: 7,
                              lineHeight: 1.5,
                              color: "#374151",
                            }}
                          >
                            {item.descricao}
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatarData(item.data)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
