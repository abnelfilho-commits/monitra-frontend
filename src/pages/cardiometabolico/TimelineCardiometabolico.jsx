import { useEffect, useState } from "react";
import { buscarTimelineCardiometabolica } from "../../services/cardiometabolico/timeline";

export default function TimelineCardiometabolico({ pacienteId }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarTimeline();
  }, [pacienteId]);

  async function carregarTimeline() {
    try {
      setLoading(true);

      const dadosTimeline = await buscarTimelineCardiometabolica(pacienteId);
      setTimeline(dadosTimeline);
    } catch (error) {
      console.error("Erro ao carregar timeline cardiometabólica:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-4">
        <p className="text-gray-500">
          Carregando timeline...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Timeline Cardiometabólica
        </h2>

        <button
          onClick={carregarTimeline}
          className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg"
        >
          Atualizar
        </button>
      </div>

      {timeline.length === 0 ? (
        <p className="text-gray-500">
          Nenhum registro encontrado.
        </p>
      ) : (
        <div className="space-y-4">
          {timeline.map((evento) => (
            <div
              key={evento.id}
               className="cardio-timeline-card"
            >

              <div className="cardio-timeline-header">

                <div>

                  <div className="cardio-timeline-title">
                    {evento.tipo || "Monitoramento longitudinal"}
                  </div>

                  <div className="cardio-timeline-date">
                    {new Date(evento.data).toLocaleDateString("pt-BR")}
                  </div>

                </div>

                <div
                   className={`cardio-risk-badge ${
                    evento.risco === "alto"
                      ? "cardio-risk-alto"
                      : evento.risco === "moderado"
                      ? "cardio-risk-moderado"
                      : "cardio-risk-baixo"
                  }`}
                >
                  {evento.risco || "baixo"}
                </div>

              </div>

              <div className="cardio-timeline-grid">

                <div className="cardio-timeline-metric">
                  <div className="cardio-timeline-metric-label">
                    Glicemia
                  </div>

                  <div className="cardio-timeline-metric-value">
                    {evento.glicemia || "--"}
                  </div>
                </div>

                <div className="cardio-timeline-metric">
                  <div className="cardio-timeline-metric-label">
                    Pressão arterial
                  </div>

                  <div className="cardio-timeline-metric-value">
                    {evento.pressao || "--"}
                  </div>
                </div>

                <div className="cardio-timeline-metric">
                  <div className="cardio-timeline-metric-label">
                    Peso
                  </div>

                  <div className="cardio-timeline-metric-value">
                    {evento.peso || "--"} kg
                  </div>
                </div>

                <div className="cardio-timeline-metric">
                  <div className="cardio-timeline-metric-label">
                    IMC
                  </div>

                  <div className="cardio-timeline-metric-value">
                    {evento.imc || "--"}
                  </div>
                </div>

              </div>

              <div className="cardio-timeline-description">
                {evento.descricao || "Sem descrição clínica."}
              </div>

            </div>

          ))}
        </div>
      )}
    </div>
  );
}
