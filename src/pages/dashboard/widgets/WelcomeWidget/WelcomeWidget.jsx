import CardWidget from "../../../../components/ui/CardWidget";
import WidgetGrid from "../../../../components/layouts/WidgetGrid";
import StatCard from "../../../../components/ui/StatCard";
import "./WelcomeWidget.css";

function obterSaudacao() {
  const hora = new Date().getHours();

  if (hora < 12) {
    return {
      texto: "Bom dia",
      icone: "👋",
    };
  }

  if (hora < 18) {
    return {
      texto: "Boa tarde",
      icone: "☀️",
    };
  }

  return {
    texto: "Boa noite",
    icone: "🌙",
  };
}

function formatarDataAtual() {
  const dataFormatada = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
}

function pluralizar(valor, singular, plural) {
  return valor === 1 ? singular : plural;
}

export default function WelcomeWidget({
  nome = "Profissional",
  totalPacientes = 0,
  totalPrioridades = 0,
}) {
  const saudacao = obterSaudacao();
  const dataAtual = formatarDataAtual();

  const primeiroNome =
    nome?.trim()?.split(" ")[0] || "Profissional";

  const mensagemPrioridade =
    totalPrioridades === 0
      ? "Tudo tranquilo por enquanto. Nenhum paciente necessita de atenção prioritária neste momento."
      : `${totalPrioridades} ${pluralizar(
          totalPrioridades,
          "paciente merece",
          "pacientes merecem"
        )} sua atenção hoje.`;

  return (
    <CardWidget
      icon={saudacao.icone}
      title={`${saudacao.texto}, ${primeiroNome}!`}
      description={`${dataAtual}. Que bom ter você de volta.`}
      variant="welcome"
    >
      <div className="welcome-widget__message">
        <p>
          Você acompanha{" "}
          <strong>
            {totalPacientes}{" "}
            {pluralizar(
              totalPacientes,
              "paciente",
              "pacientes"
            )}
          </strong>{" "}
          no Integra Care.
        </p>

        <p
          className={[
            "welcome-widget__priority-message",
            totalPrioridades > 0
              ? "welcome-widget__priority-message--attention"
              : "welcome-widget__priority-message--calm",
          ].join(" ")}
        >
          {mensagemPrioridade}
        </p>
      </div>

      <WidgetGrid minItemWidth={220}>
        <StatCard
          icon="👥"
          title="Meus pacientes"
          value={totalPacientes}
          description="Pacientes sob seu acompanhamento"
          tone="success"
        />

        <StatCard
          icon="🎯"
          title="Precisam de atenção"
          value={totalPrioridades}
          description={
            totalPrioridades === 0
              ? "Nenhuma prioridade identificada"
              : "Pacientes com prioridade assistencial"
          }
          tone={totalPrioridades > 0 ? "danger" : "neutral"}
        />
      </WidgetGrid>

      <p className="welcome-widget__closing">
        Desejamos um excelente dia de trabalho! 💙
      </p>
    </CardWidget>
  );
}