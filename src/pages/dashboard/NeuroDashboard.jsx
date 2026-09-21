import useCareLineNavigate from "../../hooks/useCareLineNavigate";
import { useEffect, useMemo, useState } from "react";


import { obterCockpitProfissional } from "../../services/cockpit";
import { listarMinhasSessoesAssistenciais } from "../../services/sessoesAssistenciais";

import { useAuth } from "../../context/AuthContext";

import PageLayout from "../../components/layouts/PageLayout";
import WelcomeWidget from "./widgets/WelcomeWidget";
import QuickActions from "./widgets/QuickActions";
import PriorityToday from "./widgets/PriorityToday";
import SummaryCards from "./widgets/SummaryCards";
import RecentActivity from "./widgets/RecentActivity";

export default function NeuroDashboard() {
  const { user } = useAuth();
  const navigate = useCareLineNavigate();
  const [pacientes, setPacientes] = useState([]);
  const [atividadesRecentes, setAtividadesRecentes] = useState([]);
  const [sessoesAssistenciais, setSessoesAssistenciais] = useState([]);
  const [cockpitStatus, setCockpitStatus] = useState("loading");
  const [agendaStatus, setAgendaStatus] = useState("loading");
  const [totalPacientes, setTotalPacientes] = useState(0);

  useEffect(() => {
    let ativo = true;
    obterCockpitProfissional(1).then(data => {
      if (!ativo) return;
      if (!data || !Number.isFinite(data.total_pacientes) ||
          !Array.isArray(data.pacientes_prioritarios) || !Array.isArray(data.atividades_recentes)) {
        throw new Error("Resposta de Cockpit inválida");
      }
      setTotalPacientes(data.total_pacientes);
      setPacientes(data.pacientes_prioritarios);
      setAtividadesRecentes(data.atividades_recentes);
      setCockpitStatus("ready");
    }).catch(() => {
      if (ativo) setCockpitStatus("error");
    });
    listarMinhasSessoesAssistenciais().then(data => {
      if (!ativo) return;
      if (!Array.isArray(data)) throw new Error("Resposta de Agenda inválida");
      setSessoesAssistenciais(data);
      setAgendaStatus("ready");
    }).catch(() => {
      if (ativo) setAgendaStatus("error");
    });
    return () => { ativo = false; };
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
    {cockpitStatus === "ready" && <WelcomeWidget
      nome={nomeProfissional}
      totalPacientes={totalPacientes}
      totalPrioridades={pacientes.length}
    />}

    <SummaryCards
      totalPacientes={cockpitStatus === "ready" ? totalPacientes : cockpitStatus === "error" ? "Indisponível" : "Carregando…"}
      atendimentosHoje={agendaStatus === "ready" ? sessoesHoje.length : agendaStatus === "error" ? "Indisponível" : "Carregando…"}
      realizadosHoje={agendaStatus === "ready" ? atendimentosRealizadosHoje : agendaStatus === "error" ? "Indisponível" : "Carregando…"}
      pendentesHoje={agendaStatus === "ready" ? atendimentosPendentes : agendaStatus === "error" ? "Indisponível" : "Carregando…"}
    />

    {cockpitStatus === "loading" && <p role="status">Carregando Cockpit...</p>}
    {cockpitStatus === "error" && <p role="alert">Não foi possível carregar os pacientes, prioridades e atividades do Cockpit.</p>}
    <section aria-label="Agenda Assistencial">
      {agendaStatus === "loading" && <p role="status">Carregando Agenda Assistencial...</p>}
      {agendaStatus === "error" && <p role="alert">Agenda Assistencial indisponível. Não foi possível carregar suas sessões.</p>}
      {agendaStatus === "ready" && !sessoesAssistenciais.length && <p>Nenhuma sessão na Agenda Assistencial.</p>}
    </section>
    {agendaStatus === "ready" && proximoAtendimento && (
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

    {cockpitStatus === "ready" && <>
    <PriorityToday
      pacientes={pacientes}
    />

    <RecentActivity
      items={atividadesRecentes}
      maxItems={5}
    />
    </>}
</PageLayout>
  );
}