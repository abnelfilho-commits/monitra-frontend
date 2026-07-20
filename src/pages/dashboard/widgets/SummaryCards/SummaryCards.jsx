import WidgetHeader from "../../../../components/ui/WidgetHeader";
import WidgetGrid from "../../../../components/layouts/WidgetGrid";
import StatCard from "../../../../components/ui/StatCard";

import "./SummaryCards.css";

export default function SummaryCards({
  totalPacientes = 0,
  registrosHoje = 0,
  avaliacoesPendentes = 0,
  totalPrioridades = 0,
}) {
  const cards = [
    {
      icon: "👥",
      title: "Pacientes ativos",
      value: totalPacientes,
      description: "Sob seu acompanhamento",
      tone: "success",
    },
    {
      icon: "📋",
      title: "Registros recebidos hoje",
      value: registrosHoje,
      description: "Enviados pelas famílias",
      tone: "info",
    },
    {
      icon: "🧠",
      title: "Avaliações pendentes",
      value: avaliacoesPendentes,
      description: "Aguardando conclusão",
      tone: "warning",
    },
    {
      icon: "🎯",
      title: "Prioridades assistenciais",
      value: totalPrioridades,
      description:
        totalPrioridades === 1
          ? "Paciente que merece atenção"
          : "Pacientes que merecem atenção",
      tone: totalPrioridades > 0 ? "danger" : "neutral",
    },
  ];

  return (
    <section className="summary-cards">
      <WidgetHeader
        icon="📊"
        title="Resumo do dia"
        description="Uma visão rápida dos seus pacientes e das atividades que merecem acompanhamento."
      />

      <WidgetGrid minItemWidth={220}>
        {cards.map((card) => (
          <StatCard
            key={card.title}
            icon={card.icon}
            title={card.title}
            value={card.value}
            description={card.description}
            tone={card.tone}
          />
        ))}
      </WidgetGrid>
    </section>
  );
}