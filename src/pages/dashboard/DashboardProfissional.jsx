import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { listarPacientes } from "../../services/pacientes";
import { obterRiscoPaciente } from "../../services/analytics";
import { listarTimelinePorPaciente } from "../../services/timeline";
import { listarMinhasSessoesAssistenciais } from "../../services/sessoesAssistenciais";

import { useAuth } from "../../context/AuthContext";

import PageLayout from "../../components/layouts/PageLayout";
import WelcomeWidget from "./widgets/WelcomeWidget";
import QuickActions from "./widgets/QuickActions";
import PriorityToday from "./widgets/PriorityToday";
import SummaryCards from "./widgets/SummaryCards";
import RecentActivity from "./widgets/RecentActivity";

export default function DashboardProfissional() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState([]);
  const [atividadesRecentes, setAtividadesRecentes] = useState([]);
  const [totalRegistrosHoje, setTotalRegistrosHoje] = useState(0);
  const [sessoesAssistenciais, setSessoesAssistenciais] = useState([]);
  const [loadingPrioridades, setLoadingPrioridades] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      try {
        setLoadingPrioridades(true);

        // 1. Pacientes reais acessíveis ao profissional autenticado
        const [pacientesData, sessoesData] = await Promise.all([
          listarPacientes(),
          listarMinhasSessoesAssistenciais(),
        ]);

        const pacientesArray = Array.isArray(pacientesData)
          ? pacientesData
          : [];

        const sessoesArray = Array.isArray(sessoesData)
          ? sessoesData
          : [];

        // 2. Risco real individual de cada paciente
        const pacientesComRisco = await Promise.all(
          pacientesArray.map(async (paciente) => {
            try {
              const risco = await obterRiscoPaciente(paciente.id);

              return {
                ...paciente,
                ...risco,
              };
            } catch (error) {
              console.error(
                `Erro ao carregar risco do paciente ${paciente.id}:`,
                error
              );

              return {
                ...paciente,
                risco_atual: null,
                pontuacao_risco: null,
                tendencia: null,
                status_resumido: null,
              };
            }
          })
        );

        // 3. Timeline real dos pacientes do profissional
        const timelines = await Promise.all(
          pacientesArray.map(async (paciente) => {
            try {
              const eventos = await listarTimelinePorPaciente(
                paciente.id
              );

              return (
                Array.isArray(eventos) ? eventos : []
              ).map((evento) => ({
                ...evento,
                paciente_id: paciente.id,
                paciente_nome: paciente.nome,
              }));
            } catch (error) {
              console.error(
                `Erro ao carregar Timeline do paciente ${paciente.id}:`,
                error
              );

              return [];
            }
          })
        );

        // 4. Todos os eventos reais, ordenados do mais recente
        const todosEventos = timelines
          .flat()
          .map((evento) => ({
            ...evento,

            tipo:
              evento.tipo ||
              evento.tipo_evento ||
              "ATIVIDADE",

            data:
              evento.data ||
              evento.created_at,
          }))
          .sort(
            (a, b) =>
              new Date(b.data || 0).getTime() -
              new Date(a.data || 0).getTime()
          );

        // 5. Registros Diários realizados hoje
        const agora = new Date();

        const registrosHoje = todosEventos.filter((evento) => {
          const tipo =
            evento.tipo ||
            evento.tipo_evento;

          if (tipo !== "REGISTRO_DIARIO") {
            return false;
          }

          const valorData =
            evento.data ||
            evento.created_at;

          if (!valorData) {
            return false;
          }

          const dataEvento = new Date(valorData);

          if (Number.isNaN(dataEvento.getTime())) {
            return false;
          }

          return (
            dataEvento.getDate() === agora.getDate() &&
            dataEvento.getMonth() === agora.getMonth() &&
            dataEvento.getFullYear() === agora.getFullYear()
          );
        }).length;

        // 6. Atividade recente:
        // apenas o evento mais recente de cada paciente,
        // limitado a 5 pacientes.
        const pacientesJaExibidos = new Set();

        const atividades = todosEventos
          .filter((evento) => {
            if (!evento.paciente_id) {
              return false;
            }

            if (pacientesJaExibidos.has(evento.paciente_id)) {
              return false;
            }

            pacientesJaExibidos.add(evento.paciente_id);

            return true;
          })
          .slice(0, 5);

        if (!ativo) {
          return;
        }

        setPacientes(pacientesComRisco);
        setAtividadesRecentes(atividades);
        setTotalRegistrosHoje(registrosHoje);
        setSessoesAssistenciais(sessoesArray);
      } catch (error) {
        console.error(
          "Erro ao carregar dados do Cockpit do Profissional:",
          error
        );

        if (!ativo) {
          return;
        }

        setPacientes([]);
        setAtividadesRecentes([]);
        setTotalRegistrosHoje(0);
        setSessoesAssistenciais([]);
      } finally {
        if (ativo) {
          setLoadingPrioridades(false);
        }
      }
    }

    carregarDados();

    return () => {
      ativo = false;
    };
  }, []);

  const nomeProfissional =
    user?.nome ||
    user?.name ||
    "Profissional";

  // Prioridades reais:
  // somente alto risco ou atenção, máximo 5.
  const pacientesPrioritarios = useMemo(() => {
    return pacientes
      .filter((paciente) =>
        ["alto_risco", "atencao"].includes(
          paciente.risco_atual
        )
      )
      .sort(
        (a, b) =>
          (b.pontuacao_risco ?? 0) -
          (a.pontuacao_risco ?? 0)
      )
      .slice(0, 5);
  }, [pacientes]);

  const hoje = useMemo(() => {
    const agora = new Date();

    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  }, []);

  const sessoesHoje = useMemo(() => {
    return sessoesAssistenciais
      .filter(
        (sessao) =>
          sessao.data_agendada === hoje &&
          sessao.status !== "CANCELADA"
      )
      .sort((a, b) =>
        String(a.hora_inicio || "").localeCompare(
          String(b.hora_inicio || "")
        )
      );
  }, [sessoesAssistenciais, hoje]);

  const atendimentosRealizadosHoje = useMemo(
    () =>
      sessoesHoje.filter(
        (sessao) => sessao.status === "REALIZADA"
      ).length,
    [sessoesHoje]
  );

  const atendimentosPendentes = useMemo(
    () =>
      sessoesAssistenciais.filter(
        (sessao) =>
          sessao.data_agendada > hoje &&
          !["REALIZADA", "CANCELADA"].includes(sessao.status)
      ).length,
    [sessoesAssistenciais, hoje]
  );

  const proximoAtendimento = useMemo(() => {
  return sessoesAssistenciais
    .filter(
      (sessao) =>
        !["REALIZADA", "CANCELADA"].includes(sessao.status) &&
        sessao.data_agendada >= hoje
    )
    .sort((a, b) => {
      const dataHoraA = `${a.data_agendada}T${a.hora_inicio || "00:00:00"}`;
      const dataHoraB = `${b.data_agendada}T${b.hora_inicio || "00:00:00"}`;

      return new Date(dataHoraA) - new Date(dataHoraB);
    })[0] || null;
}, [sessoesAssistenciais, hoje]);

return (
  <PageLayout>
    <WelcomeWidget
      nome={nomeProfissional}
      totalPacientes={pacientes.length}
      totalPrioridades={pacientesPrioritarios.length}
    />

    <SummaryCards
      totalPacientes={pacientes.length}
      atendimentosHoje={sessoesHoje.length}
      realizadosHoje={atendimentosRealizadosHoje}
      pendentesHoje={atendimentosPendentes}
    />

    {proximoAtendimento && (
      <section
        style={{
          marginTop: 24,
          padding: 20,
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          background: "#fff",
        }}
      >
        <div
          style={{
            fontSize: 14,
            color: "#6b7280",
            marginBottom: 6,
          }}
        >
          Próximo atendimento
        </div>

        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          {proximoAtendimento.data_agendada
            ? new Date(
                `${proximoAtendimento.data_agendada}T00:00:00`
              ).toLocaleDateString("pt-BR")
            : "Data não definida"}

          {" às "}

          {proximoAtendimento.hora_inicio?.slice(0, 5) ||
            "Horário não definido"}

          {" • "}

          {proximoAtendimento.paciente}
        </div>

        <div
          style={{
            marginTop: 6,
            color: "#4b5563",
          }}
        >
          {proximoAtendimento.atividade ||
            "Atividade assistencial"}
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() =>
              navigate(`/sessoes-assistenciais/${proximoAtendimento.id}`, {
                state: {
                  returnTo: "/dashboard",
                },
              })
            }
          >
            Visualizar Sessão
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(`/sessoes-assistenciais/${proximoAtendimento.id}/executar`, {
                state: {
                  returnTo: "/dashboard",
                },
              })
            }
          >
            Registrar Atendimento
          </button>
        </div>
      </section>
    )}

    <QuickActions />

    <PriorityToday
      pacientes={pacientesPrioritarios}
      loading={loadingPrioridades}
    />

    <RecentActivity
      items={atividadesRecentes}
      maxItems={5}
    />
</PageLayout>
  );
}