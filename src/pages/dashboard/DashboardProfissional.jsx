import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { obterCockpitProfissional } from "../../services/cockpit";
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
  const [sessoesAssistenciais, setSessoesAssistenciais] = useState([]);
  const [loadingPrioridades, setLoadingPrioridades] = useState(true);
  const [totalPacientes, setTotalPacientes] = useState(0);

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      try {
        setLoadingPrioridades(true);

        const [cockpitData, sessoesData] = await Promise.all([
          obterCockpitProfissional(),
          listarMinhasSessoesAssistenciais(),
        ]);

        const pacientesPrioritariosData = Array.isArray(
          cockpitData?.pacientes_prioritarios
        )
          ? cockpitData.pacientes_prioritarios
          : [];

        const atividades = Array.isArray(
          cockpitData?.atividades_recentes
        )
          ? cockpitData.atividades_recentes
          : [];

        const sessoesArray = Array.isArray(sessoesData)
          ? sessoesData
          : [];

        setTotalPacientes(
          Number(cockpitData?.total_pacientes || 0)
        );

        setPacientes(pacientesPrioritariosData);
        setAtividadesRecentes(atividades);
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
        setSessoesAssistenciais([]);
        setTotalPacientes(0);
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
      totalPacientes={totalPacientes}
      totalPrioridades={pacientes.length}
    />

    <SummaryCards
      totalPacientes={totalPacientes}
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
      pacientes={pacientes}
      loading={loadingPrioridades}
    />

    <RecentActivity
      items={atividadesRecentes}
      maxItems={5}
    />
</PageLayout>
  );
}