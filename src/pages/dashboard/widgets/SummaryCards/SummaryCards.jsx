import WidgetHeader from "../../../../components/ui/WidgetHeader";
import WidgetGrid from "../../../../components/layouts/WidgetGrid";
import StatCard from "../../../../components/ui/StatCard";

import "./SummaryCards.css";

export default function SummaryCards({
  totalPacientes = 0,
  atendimentosHoje = 0,
  realizadosHoje = 0,
  pendentesHoje = 0,
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
      icon: "📅",
      title: "Atendimentos hoje",
      value: atendimentosHoje,
      description: "Sessões previstas para hoje",
      tone: "info",
    },
    {
      icon: "✅",
      title: "Realizados",
      value: realizadosHoje,
      description: "Atendimentos concluídos hoje",
      tone: "success",
    },
    {
      icon: "⏳",
      title: "Próximos",
      value: pendentesHoje,
      description: "Atendimentos agendados ainda por realizar",
      tone: pendentesHoje > 0 ? "warning" : "neutral",
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