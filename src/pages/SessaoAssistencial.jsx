import SummaryCard from "../components/assistencial/SummaryCard";
import ProgressCard from "../components/assistencial/ProgressCard";

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "../components/ui/Button";
import { obterSessaoAssistencial } from "../services/sessoesAssistenciais";

function formatarData(valor) {
  if (!valor) return "-";

  return new Date(`${valor}T00:00:00`).toLocaleDateString(
    "pt-BR"
  );
}

function formatarDataHora(valor) {
  if (!valor) return "-";

  return new Date(valor).toLocaleString("pt-BR");
}

function formatarHora(valor) {
  if (!valor) return null;

  return String(valor).slice(0, 5);
}

function calcularDiasAte(data) {
  if (!data) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const destino = new Date(`${data}T00:00:00`);
  destino.setHours(0, 0, 0, 0);

  const diferenca = Math.ceil(
    (destino.getTime() - hoje.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (diferenca === 0) {
    return "Hoje";
  }

  if (diferenca === 1) {
    return "Amanhã";
  }

  if (diferenca > 1) {
    return `Em ${diferenca} dias`;
  }

  return "Data anterior";
}

function formatarDuracao(sessao) {
  const segundos = Number(sessao?.duracao_segundos || 0);
  const minutos = Number(sessao?.duracao_minutos || 0);

  if (minutos >= 60) {
    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;

    if (minutosRestantes === 0) {
      return `${horas}h`;
    }

    return `${horas}h ${minutosRestantes}min`;
  }

  if (minutos > 0) {
    return `${minutos} minuto${minutos === 1 ? "" : "s"}`;
  }

  if (segundos > 0) {
    return `${segundos} segundo${segundos === 1 ? "" : "s"}`;
  }

  return "Não informada";
}

function formatarHorario(sessao) {
  const inicio = formatarHora(sessao?.hora_inicio);
  const fim = formatarHora(sessao?.hora_fim);

  if (!inicio) {
    return "Não informado";
  }

  if (!fim) {
    return inicio;
  }

  return `${inicio} às ${fim}`;
}

function badgeStatus(status) {
  const configuracoes = {
    REALIZADA: {
      texto: "Realizada",
      fundo: "#dcfce7",
      cor: "#166534",
      borda: "#86efac",
    },
    AGENDADA: {
      texto: "Agendada",
      fundo: "#dbeafe",
      cor: "#1d4ed8",
      borda: "#93c5fd",
    },
    CONFIRMADA: {
      texto: "Confirmada",
      fundo: "#e0e7ff",
      cor: "#4338ca",
      borda: "#a5b4fc",
    },
    EM_ANDAMENTO: {
      texto: "Em andamento",
      fundo: "#fef3c7",
      cor: "#92400e",
      borda: "#fcd34d",
    },
    REAGENDADA: {
      texto: "Reagendada",
      fundo: "#ffedd5",
      cor: "#9a3412",
      borda: "#fdba74",
    },
    CANCELADA: {
      texto: "Cancelada",
      fundo: "#fee2e2",
      cor: "#991b1b",
      borda: "#fecaca",
    },
  };

  return (
    configuracoes[status] || {
      texto: status || "Não informado",
      fundo: "#f1f5f9",
      cor: "#475569",
      borda: "#cbd5e1",
    }
  );
}

function Card({ titulo, subtitulo, children, destaque = false }) {
  return (
    <section
      style={{
        border: destaque
          ? "1px solid #bfdbfe"
          : "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 18,
        background: destaque
          ? "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)"
          : "#ffffff",
        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: 17,
          color: "#0f172a",
        }}
      >
        {titulo}
      </h3>

      {subtitulo && (
        <p
          style={{
            margin: "6px 0 0",
            color: "#64748b",
            fontSize: 13,
          }}
        >
          {subtitulo}
        </p>
      )}

      <div style={{ marginTop: 14 }}>{children}</div>
    </section>
  );
}

function LinhaInformacao({ label, valor }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "160px 1fr",
        gap: 12,
        padding: "8px 0",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <span
        style={{
          color: "#64748b",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {label}
      </span>

      <span
        style={{
          color: "#1e293b",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {valor || "-"}
      </span>
    </div>
  );
}

export default function SessaoAssistencial() {
  const { sessaoId } = useParams();
  const navigate = useNavigate();

  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErro("");

      try {
        const resposta = await obterSessaoAssistencial(
          Number(sessaoId)
        );

        if (ativo) {
          setDados(resposta);
        }
      } catch (error) {
        if (ativo) {
          setErro(
            error?.response?.data?.detail ||
              error?.message ||
              "Não foi possível carregar a Sessão Assistencial."
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [sessaoId]);

  const status = useMemo(
    () => badgeStatus(dados?.sessao?.status),
    [dados]
  );

  if (carregando) {
    return (
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: 24,
        }}
      >
        <div
          style={{
            borderRadius: 16,
            background: "#ffffff",
            padding: 24,
            boxShadow: "0 6px 18px rgba(15, 23, 42, 0.05)",
          }}
        >
          Carregando Sessão Assistencial...
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: 24,
        }}
      >
        <div
          style={{
            padding: 16,
            borderRadius: 14,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          {erro}
        </div>

        <div style={{ marginTop: 16 }}>
          <Button
            variant="secondary"
            onClick={() => navigate("/agenda-assistencial")}
          >
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  if (!dados) {
    return null;
  }

  const {
    sessao,
    paciente,
    objetivo,
    atividade,
    profissional,
    registro_longitudinal: registro,
    avaliacoes,
    intervencoes,
    proxima_sessao: proximaSessao,
  } = dados;

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: 24,
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div>
          <Button
            variant="secondary"
            onClick={() => navigate("/agenda-assistencial")}
          >
            ← Voltar para Agenda
          </Button>

          <div style={{ marginTop: 18 }}>
            <div
              style={{
                fontSize: 13,
                color: "#2563eb",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              JORNADA ASSISTENCIAL
            </div>

            <h1
              style={{
                margin: "6px 0 0",
                fontSize: 28,
                color: "#0f172a",
              }}
            >
              Sessão nº {sessao.numero}
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#475569",
                fontSize: 16,
              }}
            >
              {atividade?.nome || "Atividade não informada"}
            </p>
          </div>
        </div>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "8px 14px",
            borderRadius: 999,
            background: status.fundo,
            color: status.cor,
            border: `1px solid ${status.borda}`,
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {status.texto}
        </span>
      </header>

      <SummaryCard resumo={dados.resumo} />

      <ProgressCard resumo={dados.resumo} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        <Card
          titulo="Visão da sessão"
          subtitulo="Informações centrais do atendimento realizado."
          destaque
        >
          <LinhaInformacao
            label="Paciente"
            valor={paciente?.nome}
          />

          <LinhaInformacao
            label="Data"
            valor={formatarData(sessao.data)}
          />

          <LinhaInformacao
            label="Horário"
            valor={formatarHorario(sessao)}
          />

          <LinhaInformacao
            label="Duração"
            valor={formatarDuracao(sessao)}
          />

          <LinhaInformacao
            label="Atividade"
            valor={atividade?.nome}
          />

          <LinhaInformacao
            label="Ocupação"
            valor={profissional?.ocupacao}
          />

          <LinhaInformacao
            label="Profissional"
            valor={profissional?.nome}
          />
        </Card>

        <Card
          titulo="🎯 Objetivo terapêutico"
          subtitulo="Objetivo do PTS relacionado a esta sessão."
        >
          {objetivo ? (
            <>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  lineHeight: 1.5,
                  color: "#1e293b",
                }}
              >
                {objetivo.descricao}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 14,
                }}
              >
                {objetivo.status && (
                  <span
                    style={{
                      padding: "5px 10px",
                      borderRadius: 999,
                      background: "#e0f2fe",
                      color: "#0369a1",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {objetivo.status}
                  </span>
                  
                )}

                <span
                  style={{
                    padding: "5px 10px",
                    borderRadius: 999,
                    background: "#dcfce7",
                    color: "#166534",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  🟢 Em acompanhamento
                </span>

                {objetivo.prioridade && (
                  <span
                    style={{
                      padding: "5px 10px",
                      borderRadius: 999,
                      background: "#fef3c7",
                      color: "#92400e",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    Prioridade {objetivo.prioridade}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p style={{ color: "#64748b" }}>
              Nenhum objetivo terapêutico vinculado.
            </p>
          )}
        </Card>

        <Card
          titulo="📝 Registro Longitudinal"
          subtitulo="Documentação clínica vinculada à sessão."
        >
          {registro ? (
            <>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#dcfce7",
                  color: "#166534",
                  border: "1px solid #86efac",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                ✓ Registro realizado
              </div>

              <LinhaInformacao
                label="Registro"
                valor={`Nº ${registro.id}`}
              />

              <LinhaInformacao
                label="Data"
                valor={formatarData(registro.data)}
              />

              <LinhaInformacao
                label="Origem"
                valor={
                  registro.origem === "PROFISSIONAL"
                    ? "Profissional"
                    : registro.origem
                }
              />

              <div style={{ marginTop: 14 }}>
                <Button
                  variant="secondary"
                  onClick={() =>
                    navigate(
                      `/prontuario/evento/REGISTRO/${registro.id}`
                    )
                  }
                >
                  👁 Visualizar Registro
                </Button>
              </div>
            </>
          ) : (
            <p style={{ color: "#64748b" }}>
              Esta sessão ainda não possui Registro Longitudinal.
            </p>
          )}
        </Card>

        <Card
          titulo="📊 Avaliações da sessão"
          subtitulo="Avaliações clínicas originadas do registro vinculado."
        >
          {avaliacoes?.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {avaliacoes.map((avaliacao) => (
                <div
                  key={avaliacao.id}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #e9d5ff",
                    background: "#faf5ff",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      color: "#6d28d9",
                    }}
                  >
                    {avaliacao.instrumento}
                  </div>

                  <div style={{ marginTop: 6, color: "#475569" }}>
                    Score: {avaliacao.score ?? "-"}
                  </div>

                  <div style={{ marginTop: 4, color: "#475569" }}>
                    Classificação:{" "}
                    {avaliacao.classificacao || "-"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#64748b" }}>
              Nenhuma avaliação vinculada a esta sessão.
            </p>
          )}
        </Card>

        <Card
          titulo="💬 Contexto de intervenções"
          subtitulo="Intervenções recentes registradas para o paciente."
        >
          {intervencoes?.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {intervencoes.map((intervencao) => (
                <div
                  key={intervencao.id}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    background: "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      lineHeight: 1.5,
                      color: "#334155",
                    }}
                  >
                    {intervencao.descricao}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: "#64748b",
                    }}
                  >
                    {formatarDataHora(intervencao.data)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#64748b" }}>
              Nenhuma intervenção recente encontrada.
            </p>
          )}
        </Card>

        <Card
          titulo="📅 Próxima sessão"
          subtitulo="Continuidade prevista do plano assistencial."
        >
          {proximaSessao ? (
            <>
              <LinhaInformacao
                label="Sessão"
                valor={`Nº ${proximaSessao.numero}`}
              />

              <LinhaInformacao
                label="Data"
                valor={formatarData(proximaSessao.data)}
              />

              {calcularDiasAte(proximaSessao.data) && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {calcularDiasAte(proximaSessao.data)}
                </div>
              )}

              <LinhaInformacao
                label="Status"
                valor={proximaSessao.status}
              />

              <div style={{ marginTop: 14 }}>
                <Button
                  variant="secondary"
                  onClick={() =>
                    navigate(
                      `/sessoes-assistenciais/${proximaSessao.id}`
                    )
                  }
                >
                  Abrir próxima sessão
                </Button>
              </div>
            </>
          ) : (
            <p style={{ color: "#64748b" }}>
              Não há próxima sessão futura identificada.
            </p>
          )}
        </Card>
      </div>
    </main>
  );
}