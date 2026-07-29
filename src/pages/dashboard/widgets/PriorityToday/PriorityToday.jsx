import { useNavigate } from "react-router-dom";

import CardWidget from "../../../../components/ui/CardWidget";
import EmptyState from "../../../../components/ui/EmptyState";
import Button from "../../../../components/ui/Button";

import "./PriorityToday.css";

function labelRisco(risco) {
  if (risco === "alto_risco") return "Alta prioridade";
  if (risco === "atencao") return "Atenção";
  return "Acompanhamento";
}

function labelTendencia(tendencia) {
  if (tendencia === "piora") return "Tendência de piora";
  if (tendencia === "melhora") return "Tendência de melhora";
  if (tendencia === "estavel") return "Tendência estável";
  return "Sem leitura recente";
}

export default function PriorityToday({
  pacientes = [],
  loading = false,
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <CardWidget
        icon="🎯"
        title="Sua atenção hoje"
        description="Identificando os pacientes que merecem acompanhamento prioritário."
        variant="attention"
      >
        <p className="priority-today__loading">
          Carregando prioridades...
        </p>
      </CardWidget>
    );
  }

  return (
    <CardWidget
      icon="🎯"
      title="Sua atenção hoje"
      description="Pacientes que merecem um acompanhamento mais próximo neste momento."
      variant="attention"
    >
      {pacientes.length === 0 ? (
        <EmptyState
          icon="🎉"
          title="Tudo tranquilo por enquanto"
          description="Nenhum paciente necessita de atenção prioritária neste momento."
        />
      ) : (
        <div className="priority-today__list">
          {pacientes.map((paciente) => {
            const altoRisco =
              paciente.risco_atual === "alto_risco";

            return (
              <article
                key={paciente.id}
                className={[
                  "priority-today__item",
                  altoRisco
                    ? "priority-today__item--danger"
                    : "priority-today__item--warning",
                ].join(" ")}
              >
                <div className="priority-today__content">
                  <div className="priority-today__heading">
                    <h3 className="priority-today__name">
                      {paciente.nome}
                    </h3>

                    <span
                      className={[
                        "priority-today__badge",
                        altoRisco
                          ? "priority-today__badge--danger"
                          : "priority-today__badge--warning",
                      ].join(" ")}
                    >
                      {labelRisco(paciente.risco_atual)}
                    </span>
                  </div>

                  <p className="priority-today__summary">
                    {paciente.status_resumido ||
                      "Este paciente merece uma avaliação mais próxima da equipe."}
                  </p>

                  <div className="priority-today__meta">
                    <span>
                      📊 {labelTendencia(paciente.tendencia)}
                    </span>

                    {paciente.pontuacao_risco != null ? (
                      <span>
                        Score de risco:{" "}
                        <strong>
                          {paciente.pontuacao_risco}
                        </strong>
                      </span>
                    ) : null}
                  </div>
                </div>

                <Button
                  variant="secondary"
                  onClick={() =>
                    navigate(`/pacientes/${paciente.id}`, {
                      state: {
                        returnTo: "/dashboard-profissional",
                      },
                    })
                  }
                >
                  Ver prontuário
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </CardWidget>
  );
}