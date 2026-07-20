import { useAuth } from "../../context/AuthContext";

import PageLayout from "../../components/layouts/PageLayout";
import WelcomeWidget from "./widgets/WelcomeWidget";
import QuickActions from "./widgets/QuickActions";
import PriorityToday from "./widgets/PriorityToday";
import SummaryCards from "./widgets/SummaryCards";
import RecentActivity from "./widgets/RecentActivity";

export default function DashboardProfissional() {
  const { user } = useAuth();

  const nomeProfissional =
    user?.nome ||
    user?.name ||
    "Profissional";

  const pacientesPrioritarios = [
    {
      id: 1,
      nome: "Gabriel Henrique",
      risco_atual: "alto_risco",
      pontuacao_risco: 10,
      tendencia: "piora",
      status_resumido:
        "O acompanhamento recente indica sinais que merecem atenção da equipe.",
    },
    {
      id: 2,
      nome: "Maria Clara",
      risco_atual: "atencao",
      pontuacao_risco: 6,
      tendencia: "estavel",
      status_resumido:
        "A paciente permanece sob monitoramento e precisa de acompanhamento próximo.",
    },
  ];

  const atividadesRecentes = [
    {
      id: 1,
      tipo: "REGISTRO_DIARIO",
      paciente_id: 1,
      paciente_nome: "Gabriel Henrique",
      descricao: "A família enviou um novo registro diário.",
      data: new Date().toISOString(),
    },
    {
      id: 2,
      tipo: "INTERVENCAO",
      paciente_id: 2,
      paciente_nome: "Maria Clara",
      descricao: "Uma nova intervenção clínica foi registrada.",
      data: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
    {
      id: 3,
      tipo: "AVALIACAO_CLINICA",
      paciente_id: 3,
      paciente_nome: "Pedro Augusto",
      descricao: "A avaliação M-CHAT foi concluída.",
      data: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 4,
      tipo: "PTS",
      paciente_id: 1,
      paciente_nome: "Gabriel Henrique",
      descricao: "O Plano Terapêutico Singular foi atualizado.",
      data: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return (
    <PageLayout>
      <WelcomeWidget
        nome={nomeProfissional}
        totalPacientes={18}
        totalPrioridades={pacientesPrioritarios.length}
      />

      <QuickActions />

      <PriorityToday pacientes={pacientesPrioritarios} />
      <RecentActivity items={atividadesRecentes} />
      <SummaryCards
        totalPacientes={18}
        registrosHoje={5}
        avaliacoesPendentes={2}
        totalPrioridades={pacientesPrioritarios.length}
      />
    </PageLayout>
  );
}