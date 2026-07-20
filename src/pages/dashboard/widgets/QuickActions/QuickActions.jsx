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
        subtitle="Acesse rapidamente as funcionalidades mais utilizadas."
      />

      <WidgetGrid minItemWidth={260}>

        <ActionCard
          icon="👥"
          title="Meus Pacientes"
          description="Visualize seus pacientes e acesse os prontuários."
          onClick={() => navigate("/pacientes")}
        />

        <ActionCard
          icon="🧠"
          title="Nova Intervenção"
          description="Registre uma intervenção clínica."
          onClick={() => navigate("/intervencoes")}
        />

        <ActionCard
          icon="📋"
          title="Avaliações"
          description="Aplicar protocolos clínicos."
          onClick={() => navigate("/assessments")}
        />

        <ActionCard
          icon="📅"
          title="Agenda Assistencial"
          description="Em breve integrada ao PTS."
          badge="Sprint 4.1"
          disabled
        />

      </WidgetGrid>

    </section>
  );
}