import { useEffect, useMemo, useState } from "react";

import { listarPacientes } from "../../services/pacientes";
import { obterMapaRiscoClinica } from "../../services/analytics";

import { useAuth } from "../../context/AuthContext";

import PageLayout from "../../components/layouts/PageLayout";
import WelcomeWidget from "./widgets/WelcomeWidget";
import QuickActions from "./widgets/QuickActions";
import PriorityToday from "./widgets/PriorityToday";
import SummaryCards from "./widgets/SummaryCards";
import RecentActivity from "./widgets/RecentActivity";

export default function DashboardProfissional() {
  const { user } = useAuth();

  const [pacientes, setPacientes] = useState([]);
  const [mapaRisco, setMapaRisco] = useState([]);
  const [loadingPrioridades, setLoadingPrioridades] =
    useState(true);

  useEffect(() => {
    async function carregarDados() {
      try {
        setLoadingPrioridades(true);

        const [pacientesData, mapaData] =
          await Promise.all([
            listarPacientes(),
            obterMapaRiscoClinica(user.clinica_id),
          ]);

        setPacientes(
          Array.isArray(pacientesData)
            ? pacientesData
            : []
        );

        setMapaRisco(
          Array.isArray(mapaData)
            ? mapaData
            : []
        );
      } catch (error) {
        console.error(
          "Erro ao carregar dados do Cockpit:",
          error
        );

        setPacientes([]);
        setMapaRisco([]);
      } finally {
        setLoadingPrioridades(false);
      }
    }

    if (user?.clinica_id) {
      carregarDados();
    }
  }, [user?.clinica_id]);

  const nomeProfissional =
    user?.nome ||
    user?.name ||
    "Profissional";

  const pacientesPrioritarios = useMemo(() => {
    const idsPermitidos = new Set(
      pacientes.map((paciente) => paciente.id)
    );

    return mapaRisco
      .filter((item) => {
        const pacienteId =
          item.paciente_id ?? item.id;

        return (
          idsPermitidos.has(pacienteId) &&
          ["alto_risco", "atencao"].includes(
            item.risco_atual
          )
        );
      })
      .map((item) => {
        const pacienteId =
          item.paciente_id ?? item.id;

        const paciente = pacientes.find(
          (p) => p.id === pacienteId
        );

        return {
          ...item,
          id: pacienteId,
          nome:
            item.nome ||
            item.paciente_nome ||
            paciente?.nome ||
            "Paciente",
        };
      })
      .sort(
        (a, b) =>
          (b.pontuacao_risco ?? 0) -
          (a.pontuacao_risco ?? 0)
      )
      .slice(0, 5);
  }, [pacientes, mapaRisco]);

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

      <PriorityToday
        pacientes={pacientesPrioritarios}
        loading={loadingPrioridades}
      />
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