import { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { buscarEvolucaoCardiometabolica } from '../../services/cardiometabolico/evolucao';

const charts = [
  ['Evolução glicêmica', [['glicemia_jejum', 'Glicemia em jejum (mg/dL)']]],
  ['Evolução da pressão arterial', [['pressao_sistolica', 'Sistólica (mmHg)'], ['pressao_diastolica', 'Diastólica (mmHg)']]],
  ['Evolução do peso', [['peso', 'Peso (kg)']]],
  ['Evolução do IMC', [['imc', 'IMC (kg/m²)']]],
];
export default function GraficosCardiometabolico({ pacienteId }) {
  const [loaded, setDados] = useState(null);
  const dados = loaded?.id === pacienteId ? loaded.data : null;
  const [erro, setErro] = useState(false);
  useEffect(() => {
    let active = true;
    buscarEvolucaoCardiometabolica(pacienteId).then(data => { if (active) setDados({id: pacienteId, data}); })
      .catch(() => { if (active) setErro(pacienteId); });
    return () => { active = false; };
  }, [pacienteId]);
  if (erro === pacienteId) return <p role="alert">Não foi possível carregar a evolução.</p>;
  if (!dados) return <p>Carregando evolução...</p>;
  return <div className="space-y-6">{charts.map(([title, fields]) => <section key={title} className="bg-white rounded-2xl shadow p-4">
    <h2>{title}</h2>
    {!dados.some(row => fields.some(([key]) => row[key] != null)) ? <p>Indisponível — sem medições válidas para este indicador.</p> :
      <div style={{width: '100%', height: 300}}><ResponsiveContainer><LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="data" /><YAxis /><Tooltip /><Legend />
        {fields.map(([key, name], i) => <Line key={key} dataKey={key} name={name} type="linear" connectNulls={false} stroke={i ? '#dc2626' : '#2563eb'} />)}
      </LineChart></ResponsiveContainer></div>}
  </section>)}</div>;
}
