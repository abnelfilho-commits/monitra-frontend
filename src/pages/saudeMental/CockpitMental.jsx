import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PageLayout from "../../components/layouts/PageLayout";
import WidgetGrid from "../../components/layouts/WidgetGrid";
import CardWidget from "../../components/ui/CardWidget";
import StatCard from "../../components/ui/StatCard";
import WidgetHeader from "../../components/ui/WidgetHeader";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import { cockpitMental, instituicoesMentais, erroMental } from "../../services/saudeMental";
import "../dashboard/widgets/RecentActivity/RecentActivity.css";
import "./CockpitMental.css";

const indicators = [
  ["pessoas_em_acompanhamento", "Pessoas em acompanhamento", "👥", "success"],
  ["atendimentos_hoje", "Atendimentos hoje", "📅", "info"],
  ["realizados_hoje", "Realizados hoje", "✅", "success"],
  ["proximos_atendimentos", "Próximos atendimentos", "⏳", "neutral"],
];
const reasons = { APOIO_AUTORREFERIDO: "Solicitação de apoio autorreferida", INSTRUMENTO_REVISAO: "Instrumento com indicação de revisão profissional", MUDANCA_OBSERVACIONAL: "Mudança observacional reconhecida", SESSAO_SEM_DESFECHO: "Sessão vencida sem desfecho registrado" };
const events = { CHECKIN: ["📋", "Check-in de Bem-Estar"], PHQ9: ["📝", "PHQ-9"], GAD7: ["📝", "GAD-7"], CBI: ["📝", "CBI"], DIAGNOSTICO: ["📋", "Diagnóstico"], INTERVENCAO: ["🧠", "Intervenção"], SESSAO: ["📅", "Sessão realizada"] };
const journey = row => `/saude-mental/pessoas/${row.pessoa_id}/contextos/${row.contexto_assistencial_id}?instituicao_id=${row.instituicao_id}`;
const civilDate = value => value ? value.slice(0, 10).split("-").reverse().join("/") : "Data indisponível";
function timestamp(value, precision, zone) {
  if (precision === "DATA") return civilDate(value);
  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? "Data indisponível" : instant.toLocaleString("pt-BR", { timeZone: zone });
}
function contextGroups(motivos) {
  const groups = new Map();
  motivos.forEach(reason => {
    const key = `${reason.instituicao_id}-${reason.contexto_assistencial_id}`;
    if (!groups.has(key)) groups.set(key, { key, scope: reason, motivos: [] });
    groups.get(key).motivos.push(reason);
  });
  return [...groups.values()];
}
function More({ value }) { return value ? <p className="mental-cockpit-muted">Há outros registros além desta lista limitada.</p> : null; }
function Scope({ row }) { return <span>{row.instituicao} · Contexto #{row.contexto_assistencial_id}</span>; }

export default function CockpitMental() {
  const { user } = useAuth();
  const [search, setSearch] = useSearchParams();
  const institution = search.get("instituicao_id") || "";
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [choices, setChoices] = useState([]);
  const [choicesError, setChoicesError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    cockpitMental(institution, controller.signal).then(result => {
      if (!result || !indicators.every(([key]) => Number.isInteger(result.resumo?.[key])) ||
          !["agenda_hoje", "proximos_atendimentos", "pessoas_para_acompanhamento", "atividade_recente"].every(key => Array.isArray(result[key])) || !result.metadados?.tem_mais) throw new Error("Invalid response");
      if (current) setData(result);
    }).catch(e => { if (current) setError(e?.response?.status === 422 ? "Filtro inválido. Selecione uma instituição disponível." : erroMental(e)); });
    instituicoesMentais().then(result => { if (current) setChoices(result); }).catch(() => { if (current) setChoicesError(true); });
    return () => { current = false; controller.abort(); };
  }, [institution, retry]);
  const reload = () => { setData(null); setError(""); setChoicesError(false); setRetry(n => n + 1); };
  const returnTo = `/saude-mental${institution ? `?instituicao_id=${encodeURIComponent(institution)}` : ""}`;
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: "America/Cuiaba" }).format(new Date()));
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const name = user?.nome || user?.name || "Profissional";
  const zone = data?.metadados.fuso || "America/Cuiaba";
  const sessions = (rows, more, compact = false) => <>
    {!rows.length ? <EmptyState compact icon="📅" title="Nenhum atendimento agendado neste período" /> : rows.map(row => <article className={`mental-cockpit-session${compact ? " mental-cockpit-session--compact" : ""}`} key={row.sessao_id}>
      <div className="mental-cockpit-session-info"><h3>{civilDate(row.data_agendada)} · {row.hora_inicio?.slice(0, 5) || "Horário não definido"} · {row.pessoa}</h3>
      <p>{row.atividade} · {row.duracao_minutos} min · {({ AGENDADA: "Agendada", CONFIRMADA: "Confirmada", EM_ANDAMENTO: "Em andamento" })[row.status] || row.status}</p>
      <p className="mental-cockpit-muted"><Scope row={row} /></p></div>
      <div className="mental-cockpit-actions">
        <Button variant="secondary" onClick={() => navigate(`/sessoes-assistenciais/${row.sessao_id}?espaco=saude-mental`, { state: { returnTo } })}>Visualizar Sessão</Button>
        {row.pode_registrar === true && <Button onClick={() => navigate(`/sessoes-assistenciais/${row.sessao_id}/executar?espaco=saude-mental`, { state: { returnTo } })}>Registrar Atendimento</Button>}
      </div>
    </article>)}<More value={more} />
  </>;
  return <PageLayout className="mental-cockpit">
    <CardWidget icon={hour < 18 ? "👋" : "🌙"} title={`${greeting}, ${name}!`} description="Bem-vindo(a) ao seu espaço assistencial de Saúde Mental." variant="welcome">
      <div className="mental-cockpit-actions">
        <Link to={`${returnTo}#pessoas`}>Minhas Pessoas</Link>
        <Link to="/agenda-assistencial?espaco=saude-mental">Agenda Assistencial</Link>
        <Button variant="secondary" onClick={reload}>Atualizar</Button>
      </div>
    </CardWidget>
    <div className="mental-cockpit-filter">
      <label htmlFor="cockpit-institution">Instituição (opcional)</label>
      <select id="cockpit-institution" value={institution} onChange={e => setSearch(e.target.value ? { instituicao_id: e.target.value } : {})}>
        <option value="">Todas as minhas atribuições autorizadas</option>
        {institution && !choices.some(i => String(i.id) === institution) && <option value={institution}>Instituição selecionada #{institution}</option>}
        {choices.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
      </select>
      {choicesError && <p role="status">Filtro institucional indisponível. A consulta consolidada continua disponível.</p>}
    </div>
    {!data && !error && <p role="status">Carregando Cockpit Saúde Mental…</p>}
    {error && <div role="alert"><p>{error}</p><Button onClick={reload}>Tentar novamente</Button></div>}
    {data && <>
      <section aria-label="Resumo do dia">
        <WidgetHeader icon="📊" title="Resumo do dia" description={`${civilDate(data.metadados.data_referencia)} · ${zone}`} />
        <WidgetGrid minItemWidth={220}>{indicators.map(([key, title, icon, tone]) => <StatCard key={key} title={title} icon={icon} tone={tone} value={data.resumo[key]} />)}</WidgetGrid>
      </section>
      <CardWidget icon="📅" title="Minha Agenda Hoje">{sessions(data.agenda_hoje, data.metadados.tem_mais.agenda_hoje)}</CardWidget>
      <CardWidget icon="⏳" title="Próximos atendimentos">{sessions(data.proximos_atendimentos, data.metadados.tem_mais.proximos_atendimentos, true)}</CardWidget>
      <CardWidget icon="👥" title="Pessoas para Acompanhamento" description="Evidências para revisão profissional, sem classificação automática de risco.">
        {!data.pessoas_para_acompanhamento.length && <EmptyState compact title="Nenhuma evidência de acompanhamento nesta consulta" />}
        {data.pessoas_para_acompanhamento.map(person => <article className="mental-cockpit-session" key={person.pessoa_id}>
          <h3>{person.pessoa}</h3><p className="mental-cockpit-muted">Evidência mais recente: {timestamp(person.evidencia_mais_recente, "INSTANTE", zone)}</p>
          {contextGroups(person.motivos).map(group => <section className="mental-cockpit-context" key={group.key} aria-label={`Contexto #${group.scope.contexto_assistencial_id}`}>
            <div className="mental-cockpit-context-header">
              <span className="mental-cockpit-muted"><Scope row={group.scope} /></span>
              <Link to={journey(group.scope)} aria-label={`Abrir Jornada · Contexto #${group.scope.contexto_assistencial_id}`}>Abrir Jornada</Link>
            </div>
            <ul className="mental-cockpit-reasons">{group.motivos.map((reason, i) => <li key={`${reason.codigo}-${reason.referencia_id}-${i}`}>
              <strong>{reasons[reason.codigo] || "Evidência para revisão profissional"}</strong>
              <time dateTime={reason.data}>{timestamp(reason.data, "INSTANTE", zone)}</time>
              {!!reason.dimensoes?.length && <span className="mental-cockpit-muted">{reason.dimensoes.join(" · ")}</span>}
            </li>)}</ul>
          </section>)}
        </article>)}<More value={data.metadados.tem_mais.pessoas_para_acompanhamento} />
      </CardWidget>
      <CardWidget icon="🕒" title="Atividade Recente">
        {!data.atividade_recente.length && <EmptyState title="Nenhuma novidade por enquanto" description="Os eventos autorizados aparecerão aqui quando disponíveis." />}
        <div className="recent-activity__list">{data.atividade_recente.map(item => <article className="recent-activity__item" key={`${item.tipo}-${item.contexto_assistencial_id}-${item.referencia_id}`}>
          <span className="recent-activity__marker recent-activity__marker--blue" aria-hidden="true">{events[item.tipo]?.[0] || "📌"}</span>
          <div className="recent-activity__content">
            <div className="recent-activity__top"><div><div className="recent-activity__type">{events[item.tipo]?.[1] || "Evento assistencial"}</div><h3 className="recent-activity__patient">{item.pessoa}</h3></div>
              <time className="recent-activity__time" dateTime={item.precisao === "DATA" ? item.data.slice(0, 10) : item.data}>{timestamp(item.data, item.precisao, zone)}</time></div>
            <p className="recent-activity__description"><Scope row={item} /></p>
            <Link className="recent-activity__link" to={journey(item)}>Abrir jornada</Link>
          </div>
        </article>)}</div><More value={data.metadados.tem_mais.atividade_recente} />
      </CardWidget>
    </>}
  </PageLayout>;
}
