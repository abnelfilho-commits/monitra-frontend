import { useNavigate } from "react-router-dom";

import WidgetHeader from "../../../../components/ui/WidgetHeader";
import WidgetGrid from "../../../../components/layouts/WidgetGrid";
import ActionCard from "../../../../components/ui/ActionCard";

import "./QuickActions.css";

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <section className="quick-actions">
      <WidgetHeader
        icon="⚡"
        title="Ações rápidas"
      />

      <WidgetGrid minItemWidth={260}>
        <ActionCard
          icon="👥"
          title="Meus Pacientes"
          description="Visualize seus pacientes e acesse os prontuários."
          onClick={() => navigate("/pacientes")}
        />

        <ActionCard
          icon="🩺"
          title="Registrar Cuidado"
          description="Registre uma avaliação, intervenção ou acompanhamento do paciente."
          onClick={() => navigate("/pacientes?acao=registrar-cuidado")}
        />

        <ActionCard
          icon="📅"
          title="Agenda Assistencial"
          description="Veja seus atendimentos de hoje e os próximos agendamentos."
          onClick={() => navigate("/agenda-assistencial")}
        />
      </WidgetGrid>
    </section>
  );
}