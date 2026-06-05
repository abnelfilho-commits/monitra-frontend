import { buscarEvolucaoCardiometabolica } from "../../services/cardiometabolico/evolucao";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

export default function GraficosCardiometabolico({ pacienteId }) {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, [pacienteId]);

  async function carregarDados() {
    try {
      setLoading(true);

      const dadosEvolucao = await buscarEvolucaoCardiometabolica(pacienteId);
      setDados(dadosEvolucao);

    } catch (error) {
      console.error(
        "Erro ao carregar gráficos cardiometabólicos:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-4">
        <p className="text-gray-500">
          Carregando gráficos...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Evolução da Pressão Arterial
        </h2>

        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={dados}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="data" />

              <YAxis />

              <Tooltip />

              <Legend />

              <Line
                type="monotone"
                dataKey="pressao_sistolica"
                name="Pressão Sistólica"
                strokeWidth={2}
              />

              <Line
                type="monotone"
                dataKey="pressao_diastolica"
                name="Pressão Diastólica"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Evolução da Glicemia
        </h2>

        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={dados}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="data" />

              <YAxis />

              <Tooltip />

              <Legend />

              <Line
                type="monotone"
                dataKey="glicemia_jejum"
                name="Glicemia em jejum"
                strokeWidth={2}
              />

              <Line
                type="monotone"
                dataKey="glicemia_pos_prandial"
                name="Glicemia pós-prandial"
                strokeWidth={2} 
              />

            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">

        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Evolução do IMC
        </h2>

        <div style={{ width: "100%", height: 300 }}>

          <ResponsiveContainer>

            <LineChart data={dados}>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="data" />

              <YAxis />

              <Tooltip />

              <Legend />

              <Line
                type="monotone"
                dataKey="imc"
                name="IMC"
                strokeWidth={2}
              />

              <Line
                type="monotone"
                dataKey="peso"
                name="Peso"
                strokeWidth={2}
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

      </div>

    </div>
  );
}
