import { useNavigate } from "react-router-dom";

import CardWidget from "../../../../components/ui/CardWidget";
import EmptyState from "../../../../components/ui/EmptyState";
import Button from "../../../../components/ui/Button";

import "./RecentActivity.css";

const TIPO_CONFIG = {
  REGISTRO_DIARIO: {
    icon: "📋",
    label: "Registro diário",
    tone: "blue",
  },
  INTERVENCAO: {
    icon: "🧠",
    label: "Intervenção",
    tone: "green",
  },
  AVALIACAO_CLINICA: {
    icon: "📝",
    label: "Avaliação clínica",
    tone: "purple",
  },
  MCHAT: {
    icon: "🧠",
    label: "M-CHAT",
    tone: "purple",
  },
  DENVER: {
    icon: "🧩",
    label: "Denver II",
    tone: "purple",
  },
  PTS: {
    icon: "🎯",
    label: "PTS",
    tone: "orange",
  },
  AGENDA: {
    icon: "📅",
    label: "Agenda assistencial",
    tone: "yellow",
  },
};

function obterConfigTipo(tipo) {
  return (
    TIPO_CONFIG[tipo] || {
      icon: "📌",
      label: "Atividade",
      tone: "neutral",
    }
  );
}

function formatarDataHora(valor) {
  if (!valor) return "";

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return String(valor);
  }

  const hoje = new Date();

  const mesmaData =
    data.getDate() === hoje.getDate() &&
    data.getMonth() === hoje.getMonth() &&
    data.getFullYear() === hoje.getFullYear();

  if (mesmaData) {
    return data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RecentActivity({
  items = [],
  loading = false,
  maxItems = 8,
}) {
  const navigate = useNavigate();

  const atividades = Array.isArray(items)
    ? items.slice(0, maxItems)
    : [];

  if (loading) {
    return (
      <CardWidget
        icon="🕒"
        title="Atividade recente"
        description="Buscando o que aconteceu desde seu último acesso."
      >
        <p className="recent-activity__loading">
          Carregando atividades recentes...
        </p>
      </CardWidget>
    );
  }

  return (
    <CardWidget
      icon="🕒"
      title="Atividade recente"
      description="Veja o que aconteceu recentemente com seus pacientes."
      action={
        <Button
          variant="secondary"
          onClick={() => navigate("/timeline")}
        >
          Abrir Timeline
        </Button>
      }
    >
      {atividades.length === 0 ? (
        <EmptyState
          icon="🕊️"
          title="Nenhuma novidade por enquanto"
          description="Assim que houver novos registros, intervenções ou avaliações, eles aparecerão aqui."
        />
      ) : (
        <div className="recent-activity__list">
          {atividades.map((item) => {
            const config = obterConfigTipo(item.tipo);

            return (
              <article
                key={`${item.tipo}-${item.id}`}
                className="recent-activity__item"
              >
                <div
                  className={[
                    "recent-activity__marker",
                    `recent-activity__marker--${config.tone}`,
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {config.icon}
                </div>

                <div className="recent-activity__content">
                  <div className="recent-activity__top">
                    <div>
                      <div className="recent-activity__type">
                        {config.label}
                      </div>

                      <h3 className="recent-activity__patient">
                        {item.paciente_nome ||
                          item.paciente ||
                          "Paciente"}
                      </h3>
                    </div>

                    <time className="recent-activity__time">
                      {formatarDataHora(item.data || item.created_at)}
                    </time>
                  </div>

                  <p className="recent-activity__description">
                    {item.descricao ||
                      "Uma nova atividade foi registrada."}
                  </p>

                  {item.paciente_id ? (
                    <button
                      type="button"
                      className="recent-activity__link"
                      onClick={() =>
                        navigate(`/pacientes/${item.paciente_id}`)
                      }
                    >
                      Acompanhar paciente →
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </CardWidget>
  );
}