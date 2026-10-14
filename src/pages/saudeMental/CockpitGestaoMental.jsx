import { useEffect, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PageLayout from "../../components/layouts/PageLayout";
import WidgetGrid from "../../components/layouts/WidgetGrid";
import CardWidget from "../../components/ui/CardWidget";
import StatCard from "../../components/ui/StatCard";
import WidgetHeader from "../../components/ui/WidgetHeader";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { cockpitGestaoMental, erroGestao, MANAGEMENT_DENIED } from "../../services/cockpitGestaoMental";
import { listarInstituicoes } from "../../services/instituicoes";
import { instituicoesMentais } from "../../services/saudeMental";
import "./CockpitGestaoMental.css";

const indicators = [
  ["instituicoes_ativas", "Instituições ativas", "Situação atual", "🏢"],
  ["profissionais_vinculados", "Profissionais vinculados", "Situação atual · vínculos institucionais, não autorização clínica", "👥"],
  ["atendimentos_programados", "Atendimentos programados", "No período", "📅"],
  ["atendimentos_realizados", "Atendimentos realizados", "No período", "✅"],
];
const civilDate = value => String(value).split("-").reverse().join("/");
export default function CockpitGestaoMental() {
  const { user } = useAuth();
  const location = useLocation();
  const [search, setSearch] = useSearchParams();
  const weeks = Number(search.get("semanas") || 4);
  const institution = search.get("instituicao_id") || "";
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState(null);
  const [scope, setScope] = useState(null);
  const [labels, setLabels] = useState(null);
  const identity = `${user?.id}:${user?.perfil}`;
  const key = `${identity}:${location.key}:${weeks}:${institution}:${retry}`;
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    const denied = () => {
      current = false; controller.abort(); setScope(null);
      setResult({ key, error: erroGestao({ response: { status: 403 } }), status: 403 });
    };
    window.addEventListener(MANAGEMENT_DENIED, denied);
    const run = async () => {
      try {
        if (![4, 8, 12].includes(weeks) || (institution && !/^[1-9]\d*$/.test(institution))) throw { response: { status: 422 } };
        const discovery = await cockpitGestaoMental(4, null, controller.signal);
        if (!current) return;
        const ids = discovery.metadados.instituicao_ids;
        setScope({ identity, ids, global: discovery.metadados.escopo === "GLOBAL" });
        if (institution && !ids.includes(Number(institution))) throw { response: { status: 422 } };
        const data = weeks === 4 && !institution ? discovery : await cockpitGestaoMental(weeks, institution, controller.signal);
        if (!data.metadados.instituicao_ids.every(id => ids.includes(id)) ||
            (institution && (data.metadados.instituicao_ids.length !== 1 || data.metadados.instituicao_ids[0] !== Number(institution)))) throw new Error("INVALID_MANAGEMENT_RESPONSE");
        if (current) setResult({ key, data });
      } catch (error) {
        if (!current) return;
        if ([401, 403].includes(error?.response?.status)) setScope(null);
        setResult({ key, error: erroGestao(error), status: error?.response?.status });
      }
    };
    run();
    return () => { current = false; controller.abort(); window.removeEventListener(MANAGEMENT_DENIED, denied); };
  }, [identity, key, weeks, institution]);
  useEffect(() => {
    let current = true;
    const load = user?.perfil === "ADMIN" ? listarInstituicoes({ ativo: true }) : instituicoesMentais();
    load.then(rows => {
      if (!Array.isArray(rows)) throw new Error("Invalid names");
      if (current) setLabels({ identity, rows });
    }).catch(() => { if (current) setLabels({ identity, rows: [], failed: true }); });
    return () => { current = false; };
  }, [identity, user?.perfil, retry]);
  const visible = result?.key === key ? result : null;
  const data = visible?.data;
  const authorized = scope?.identity === identity ? scope : null;
  const names = labels?.identity === identity ? labels : null;
  const change = (field, value) => {
    setResult(null);
    const next = new URLSearchParams(search);
    if (value) next.set(field, value); else next.delete(field);
    setSearch(next);
  };
  const empty = data && data.indicadores.atendimentos_programados === 0 && data.indicadores.atendimentos_realizados === 0;
  return <PageLayout className="management-cockpit">
    <h1>Cockpit Gestor/RH — Saúde Mental</h1>
    <CardWidget title="Gestão operacional institucional" description="Contagens operacionais restritas ao seu escopo gerencial. Este espaço não concede acesso clínico.">
      <div className="management-cockpit-filters">
        <label>Instituição<select aria-label="Instituição gerencial" value={institution} onChange={e => change("instituicao_id", e.target.value)} disabled={!authorized}>
          <option value="">{authorized?.global ? "Todas as instituições autorizadas" : "Todas as minhas instituições autorizadas"}</option>
          {institution && !authorized?.ids.includes(Number(institution)) && <option value={institution}>Seleção indisponível</option>}
          {authorized?.ids.map(id => {
            const row = names?.rows.find(item => item.id === id);
            return <option key={id} value={id}>{row?.nome || row?.nome_fantasia || row?.razao_social || `Instituição #${id}`}</option>;
          })}
        </select></label>
        <label>Período<select aria-label="Período gerencial" value={weeks} onChange={e => change("semanas", e.target.value)}>
          {[4, 8, 12].map(n => <option key={n} value={n}>{n} semanas completas</option>)}
        </select></label>
        <Button variant="secondary" onClick={() => setRetry(n => n + 1)}>Atualizar</Button>
      </div>
      {names?.failed && <p role="status">Nomes institucionais indisponíveis. Os identificadores autorizados continuam disponíveis.</p>}
    </CardWidget>
    {!visible && <p role="status">Carregando gestão institucional…</p>}
    {visible?.error && <div role="alert"><p>{visible.error}</p><Button onClick={() => setRetry(n => n + 1)}>Tentar novamente</Button>
      {visible.status === 422 && <Button variant="secondary" onClick={() => setSearch({})}>Usar filtros padrão</Button>}
    </div>}
    {data && <>
      <WidgetHeader title="Resumo operacional" description={`${civilDate(data.metadados.data_inicio)} a ${civilDate(data.metadados.data_fim)} · ${data.metadados.fuso} · Consulta: ${civilDate(data.metadados.data_consulta)}`} />
      <WidgetGrid minItemWidth={220}>{indicators.map(([field, title, description, icon]) => <StatCard key={field} title={title} description={description} icon={icon} value={data.indicadores[field]} tone="info" />)}</WidgetGrid>
      {empty && <EmptyState title="Nenhum atendimento no período" description="As contagens zero são válidas para esta consulta." />}
      <CardWidget title="Atendimentos programados × realizados" description="Programados por data agendada; realizados por data efetiva. Não somar as duas séries.">
        <div className="management-cockpit-chart" aria-label="Gráfico semanal de programados e realizados">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={data.atendimentos_programados_realizados}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="semana" tickFormatter={value => civilDate(value).slice(0, 5)} minTickGap={24} /><YAxis allowDecimals={false} /><Tooltip labelFormatter={civilDate} /><Legend />
            <Bar isAnimationActive={false} dataKey="programados" name="Programados" fill="#2563eb" /><Bar isAnimationActive={false} dataKey="realizados" name="Realizados" fill="#0f766e" />
          </BarChart></ResponsiveContainer>
        </div>
      </CardWidget>
      <CardWidget title="Evolução dos atendimentos realizados">
        <div className="management-cockpit-chart" aria-label="Gráfico semanal da evolução dos realizados">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={data.evolucao_atendimentos}>
            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="semana" tickFormatter={value => civilDate(value).slice(0, 5)} minTickGap={24} /><YAxis allowDecimals={false} /><Tooltip labelFormatter={civilDate} />
            <Line isAnimationActive={false} dataKey="realizados" name="Realizados" stroke="#0f766e" strokeWidth={3} />
          </LineChart></ResponsiveContainer>
        </div>
      </CardWidget>
      <details><summary>Sobre os dados desta consulta</summary><ul>{data.metadados.limitacoes.map((text, i) => <li key={i}>{text}</li>)}</ul></details>
    </>}
  </PageLayout>;
}
