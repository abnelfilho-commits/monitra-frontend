import Button from "../components/ui/Button";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { listarMinhasSessoesAssistenciais } from "../services/sessoesAssistenciais";

function formatarData(data) {
  if (!data) return "—";

  return new Date(`${data}T00:00:00`).toLocaleDateString(
    "pt-BR"
  );
}

function formatarHora(hora) {
  if (!hora) return "Horário não definido";
  return hora.slice(0, 5);
}

export default function AgendaAssistencial() {
  const navigate = useNavigate();

  const [sessoes, setSessoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarAgenda() {
      try {
        setLoading(true);
        setErro("");

        const data =
          await listarMinhasSessoesAssistenciais();

        setSessoes(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(
          "Erro ao carregar Agenda Assistencial:",
          error
        );

        setErro(
          "Não foi possível carregar sua Agenda Assistencial."
        );
      } finally {
        setLoading(false);
      }
    }

    carregarAgenda();
  }, []);

  const hoje = useMemo(() => {
    const agora = new Date();

    const ano = agora.getFullYear();
    const mes = String(
      agora.getMonth() + 1
    ).padStart(2, "0");
    const dia = String(
      agora.getDate()
    ).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  }, []);

  const sessoesHoje = useMemo(
    () =>
      sessoes.filter(
        (sessao) =>
          sessao.data_agendada === hoje &&
          !["CANCELADA", "REALIZADA"].includes(
            sessao.status
          )
      ),
    [sessoes, hoje]
  );

  const proximasSessoes = useMemo(
    () =>
      sessoes.filter(
        (sessao) =>
          sessao.data_agendada > hoje &&
          !["CANCELADA", "REALIZADA"].includes(
            sessao.status
          )
      ),
    [sessoes, hoje]
  );

  function renderSessao(sessao) {
    return (
      <div
        key={sessao.id}
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          background: "#fff",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          {formatarHora(sessao.hora_inicio)}
          {" • "}
          {sessao.paciente}
        </div>

        <div
          style={{
            marginTop: 6,
            color: "#4b5563",
          }}
        >
          {sessao.atividade || "Atividade assistencial"}
        </div>

        <div
          style={{
            marginTop: 6,
            color: "#6b7280",
            fontSize: 14,
          }}
        >
          Sessão {sessao.numero_sessao}
          {" • "}
          {sessao.duracao_minutos} min
          {" • "}
          {sessao.status}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 14,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() =>
              navigate(
                `/sessoes-assistenciais/${sessao.id}`
              )
            }
          >
            Visualizar Sessão
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                `/sessoes-assistenciais/${sessao.id}/executar`
              )
            }
          >
            Registrar Atendimento
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        Carregando Agenda Assistencial...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >
      <Button
        variant="secondary"
        onClick={() => navigate("/dashboard")}
      >
        ← Voltar
      </Button>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ marginBottom: 6 }}>
          📅 Agenda Assistencial
        </h1>

        <p
          style={{
            margin: 0,
            color: "#6b7280",
          }}
        >
          Seus atendimentos organizados para dar
          continuidade à jornada de cuidado.
        </p>
      </div>

      {erro && (
        <div
          style={{
            padding: 16,
            marginBottom: 20,
            border: "1px solid #fecaca",
            borderRadius: 10,
          }}
        >
          {erro}
        </div>
      )}

      <section style={{ marginBottom: 32 }}>
        <h2>Hoje</h2>

        {sessoesHoje.length === 0 ? (
          <p style={{ color: "#6b7280" }}>
            Você não possui atendimentos agendados
            para hoje.
          </p>
        ) : (
          sessoesHoje.map(renderSessao)
        )}
      </section>

      <section>
        <h2>Próximos atendimentos</h2>

        {proximasSessoes.length === 0 ? (
          <p style={{ color: "#6b7280" }}>
            Nenhum próximo atendimento agendado.
          </p>
        ) : (
          proximasSessoes.map((sessao) => (
            <div key={sessao.id}>
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                {formatarData(sessao.data_agendada)}
              </div>

              {renderSessao(sessao)}
            </div>
          ))
        )}
      </section>
    </div>
  );
}