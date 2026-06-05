import { useEffect, useState } from "react";
import axios from "axios";

export default function TimelinePaciente({ pacienteId }) {
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!pacienteId) return;

    axios
      .get(`${import.meta.env.VITE_API_URL}/timeline/pacientes/${pacienteId}`)
      .then((res) => setEventos(res.data))
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, [pacienteId]);

  if (carregando) {
    return <div className="bg-white p-6 rounded-2xl shadow">Carregando timeline...</div>;
  }

  if (!eventos.length) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow">
        Nenhum evento encontrado na timeline deste paciente.
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow">
      <h2 className="text-lg font-semibold mb-4">Timeline longitudinal</h2>

      <div className="space-y-4">
        {eventos.map((e) => (
          <div 

            key={`${e.tipo_evento}-${e.id}`}
            className="border-l-4 pl-4"
            style={{
              borderColor:
                e.tipo_evento === "CARDIOMETABOLICO"
                  ? "#dc2626"
                  : e.tipo_evento === "INTERVENCAO"
                  ? "#f59e0b"
                  : "#2563eb",
            }}
          > 

            <div className="text-xs text-gray-500">
              {new Date(e.data).toLocaleDateString("pt-BR")}
            </div>

            <div className="font-semibold">
              {e.tipo_evento}
            </div>

            <div className="text-gray-700">
              {e.descricao}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
