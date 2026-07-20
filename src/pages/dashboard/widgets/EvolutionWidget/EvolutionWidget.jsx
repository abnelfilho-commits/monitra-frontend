import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import CardWidget from "../../../../components/ui/CardWidget";
import EmptyState from "../../../../components/ui/EmptyState";
import "./EvolutionWidget.css";

export default function EvolutionWidget({ data = [] }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <CardWidget
        icon="📈"
        title="Como seus pacientes estão evoluindo"
        description="Acompanhe a evolução clínica dos pacientes sob seus cuidados."
      >
        <EmptyState
          icon="📊"
          title="Ainda não há evolução suficiente"
          description="Quando houver registros em datas diferentes, a evolução aparecerá aqui."
        />
      </CardWidget>
    );
  }

  return (
    <CardWidget
      icon="📈"
      title="Como seus pacientes estão evoluindo"
      description="Visão longitudinal dos registros clínicos recentes."
    >
      <div className="evolution-widget__chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 10,
              right: 16,
              left: 0,
              bottom: 4,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="data" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="valor"
              name="Evolução"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </CardWidget>
  );
}