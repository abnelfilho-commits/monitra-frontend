import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listarInstituicoes } from "../services/instituicoes";
import GerenciarCapacidade from "../components/GerenciarCapacidade";
import { consultarVinculos, consultarCapacidade } from "../services/capacidadeInstitucional";
import PageLayout from "../components/layouts/PageLayout";
import PageHeader from "../components/ui/PageHeader";
import CardWidget from "../components/ui/CardWidget";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import "./GestaoInstitucionalVisual.css";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Cuiaba", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const civil = value => value ? value.split("-").reverse().join("/") : "Sem término";
const weeklyLoad = minutes => {
  if (minutes == null) return <span className="capacity-missing">Não informada</span>;
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return hours ? `${hours}h${rest ? String(rest).padStart(2, "0") : ""}` : `${rest}min`;
};
const positive = value => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 && Number(value) <= 2147483647;
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function errorText(error) {
  const code = error?.response?.data?.detail?.code;
  return ({ CAPACITY_INSTITUTION_INACTIVE: "Instituição inativa. Selecione uma instituição ativa.",
    CAPACITY_INTEGRITY_CONFLICT: "Há uma inconsistência nas capacidades. Solicite conferência administrativa." })[code]
    || ({401: "Sessão expirada. Entre novamente.",403: "Acesso restrito a ADMIN autorizado.",404: "Instituição não encontrada.",
      409: "Há um conflito nos dados. Atualize ou solicite conferência administrativa.",422: "Confira a instituição, a data e a ocupação."})[error?.response?.status]
    || "Não foi possível consultar a capacidade. Verifique a conexão e tente novamente.";
}
function assertScope(data, institution, date, occupation) {
  if (data?.instituicao_id !== Number(institution) || data?.data_referencia !== date ||
      data?.ocupacao_id !== (occupation ? Number(occupation) : null) || !data.totais ||
      !Array.isArray(data.ocupacoes) || !Array.isArray(data.vinculos)) throw Error("Invalid response scope");
  return data;
}

export default function CapacidadeInstalada() {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Carregando sessão...</p>;
  if (user?.perfil !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return <CapacityPanel key={`${user.id}:${user.perfil}`} />;
}

function CapacityPanel() {
  const [params, setParams] = useSearchParams();
  const institution = params.get("instituicao_id") || "";
  const date = params.get("data_referencia") || "";
  const occupation = params.get("ocupacao_id") || "";
  const [managing, setManaging] = useState(null);
  const [links, setLinks] = useState(null);
  const [linkError, setLinkError] = useState("");
  const [reload, setReload] = useState(0);
  const [institutions, setInstitutions] = useState(null);
  const [catalogError, setCatalogError] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const key = JSON.stringify([institution, date, occupation, reload]);
  const valid = positive(institution) && validDate(date) && (!occupation || positive(occupation));
  const current = snapshot?.key === key ? snapshot : null;
  const data = current?.data;
  useEffect(() => {
    if (!params.has("data_referencia")) {
      const next = new URLSearchParams(params); next.set("data_referencia", today()); setParams(next, { replace: true });
    }
  }, [params, setParams]);
  useEffect(() => {
    let active = true;
    listarInstituicoes().then(rows => { if (active) { setInstitutions(rows); setCatalogError(""); } })
      .catch(error => { if (active) setCatalogError(errorText(error)); });
    return () => { active = false; };
  }, [reload]);
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController(); let active = true;
    const filters = { instituicao_id: Number(institution), data_referencia: date };
    // Unfiltered groups provide all occupations, including inactive ones absent from the legacy catalogue.
    const base = consultarCapacidade(filters, controller.signal);
    const selected = occupation ? consultarCapacidade({ ...filters, ocupacao_id: Number(occupation) }, controller.signal) : base;
    Promise.all([base, selected]).then(([all, result]) => {
      assertScope(all, institution, date, ""); assertScope(result, institution, date, occupation);
      if (active) setSnapshot({ key, data: result, occupations: all.ocupacoes });
    }).catch(error => { if (active) setSnapshot({ key, error: errorText(error) }); });
    return () => { active = false; controller.abort(); };
  }, [institution, date, occupation, key, valid]);
  useEffect(() => {
    if (!positive(institution)) return;
    let active = true; const controller = new AbortController();
    consultarVinculos(Number(institution), controller.signal).then(rows => {
      if (!Array.isArray(rows) || rows.some(r => r.instituicao_id !== Number(institution))) throw Error("Escopo inválido");
      if (active) { setLinks({ institution, rows }); setLinkError(""); }
    }).catch(e => { if (active) { setLinks(null); setLinkError(errorText(e)); } });
    return () => { active = false; controller.abort(); };
  }, [institution, reload]);
  const available = links?.institution === institution ? links.rows : [];
  function manage(id) {
    const found = available.find(r => r.id === Number(id));
    if (found) setManaging({ ...data?.vinculos.find(v => v.vinculo_id === found.id), ...found, reference: date, institutionName: institutions?.find(i => i.id === Number(institution))?.nome_fantasia || institutions?.find(i => i.id === Number(institution))?.razao_social });
  }
  function change(field, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(field, value); else next.delete(field);
    if (field === "instituicao_id" || field === "data_referencia") next.delete("ocupacao_id");
    setParams(next);
  }
  const groups = current?.occupations || [];
  return <PageLayout><div className="institutional-visual capacity-panel">
    <PageHeader title="Capacidade instalada" description="Capacidade semanal declarada por vínculo institucional. Não representa disponibilidade de agenda." />
    <Link to="/admin/instituicoes">Voltar para Instituições</Link>
    <CardWidget title="Filtros">
      {catalogError && <p role="alert">{catalogError}</p>}
      <div className="capacity-filters">
        <label>Instituição<select value={institution} onChange={e => change("instituicao_id", e.target.value)}>
          <option value="">Selecione a instituição</option>
          {institution && !institutions?.some(i => String(i.id) === institution) && <option value={institution}>Instituição selecionada #{institution}</option>}
          {(institutions || []).map(i => <option key={i.id} value={i.id}>{i.nome_fantasia || i.razao_social}{i.ativo ? "" : " (inativa)"}</option>)}
        </select></label>
        <label>Data de referência<input type="date" value={date} onChange={e => change("data_referencia", e.target.value)} required /></label>
        <label>Ocupação<select value={occupation} disabled={!data} onChange={e => change("ocupacao_id", e.target.value)}>
          <option value="">Todas as ocupações</option>
          {occupation && !groups.some(o => String(o.ocupacao_id) === occupation) && <option value={occupation}>Ocupação selecionada #{occupation}</option>}
          {groups.map(o => <option key={o.ocupacao_id} value={o.ocupacao_id}>{o.ocupacao_nome}{o.ocupacao_ativa ? "" : " (inativa)"}</option>)}
        </select></label>
      </div>
      <Button className="institutional-refresh" variant="secondary" onClick={() => setReload(n => n + 1)}>Atualizar</Button>
    </CardWidget>
    {valid && <CardWidget title="Localizar vínculo para gestão">
      {linkError && <p role="alert">{linkError}</p>}
      <label>Vínculo profissional institucional<select id="capacity-management-entry" aria-label="Vínculo profissional institucional" value="" onChange={e => manage(e.target.value)}>
        <option value="">Selecione um vínculo (inclusive fora da data de referência)</option>
        {available.map(v => <option key={v.id} value={v.id}>{v.profissional_nome || data?.vinculos.find(d => d.vinculo_id === v.id)?.profissional_nome || `Profissional #${v.profissional_id}`} · {v.ocupacao_nome || data?.vinculos.find(d => d.vinculo_id === v.id)?.ocupacao_nome || `Ocupação #${v.ocupacao_id}`} · {civil(v.data_inicio)} — {civil(v.data_fim)}{v.ativo ? "" : " (inativo)"}</option>)}
      </select></label>
      {links?.institution === institution && !available.length && <p>Nenhum vínculo cadastrado nesta instituição.</p>}
    </CardWidget>}
    {managing && <GerenciarCapacidade key={`${managing.instituicao_id}:${managing.id}:${managing.reference}`} link={managing} institution={managing.instituicao_id} reference={managing.reference}
      institutionName={managing.institutionName || `Instituição #${managing.instituicao_id}`}
      onClose={() => setManaging(null)} onConfirmed={() => setReload(n => n + 1)} />}
    {!institution ? <EmptyState title="Selecione uma instituição" description="Informe os filtros para consultar a capacidade declarada." /> :
      !valid ? <p role="alert">Confira os filtros: instituição válida, data completa e ocupação válida.</p> :
      !current ? <p role="status">Carregando capacidade...</p> : current.error ? <p role="alert">{current.error}</p> : data && <>
        <div className="capacity-indicators" aria-label="Indicadores de capacidade">
          {[["Horas semanais declaradas", `${String(data.totais.horas_semanais).replace(".", ",")} h`],
            ["Profissionais distintos", data.totais.profissionais_distintos], ["Vínculos com capacidade", data.totais.vinculos_com_capacidade],
            ["Vínculos sem capacidade", data.totais.vinculos_sem_capacidade],
            ["Completude", !data.vinculos.length ? "Sem vínculos elegíveis" : data.totais.informacao_completa ? "Completa" : "Incompleta"]]
            .map(([title, value]) => <CardWidget key={title} title={title}><strong>{value}</strong></CardWidget>)}
        </div>
        {!data.vinculos.length ? <EmptyState title="Nenhum vínculo elegível" description="Não há vínculos elegíveis para os filtros selecionados. Isso não representa cadastro de capacidade zero." /> : <>
          {data.totais.vinculos_sem_capacidade > 0 && <p>Existem vínculos com capacidade não informada. Os totais incluem somente a capacidade declarada.</p>}
          <CardWidget title="Por ocupação"><div className="institutional-table" tabIndex={0} role="region" aria-label="Capacidade por ocupação"><table role="table">
            <thead role="rowgroup"><tr role="row">{["Ocupação", "Horas semanais", "Profissionais", "Vínculos com capacidade", "Vínculos sem capacidade"].map(t => <th role="columnheader" key={t} scope="col">{t}</th>)}</tr></thead>
            <tbody role="rowgroup">{data.ocupacoes.map(o => <tr role="row" key={o.ocupacao_id}><th role="rowheader" scope="row" data-label="Ocupação">{o.ocupacao_nome}{!o.ocupacao_ativa && " (inativa)"}</th><td role="cell" data-label="Horas semanais">{o.horas_semanais.replace(".", ",")}</td><td role="cell" data-label="Profissionais">{o.profissionais_distintos}</td><td role="cell" data-label="Vínculos com capacidade">{o.vinculos_com_capacidade}</td><td role="cell" data-label="Vínculos sem capacidade">{o.vinculos_sem_capacidade}</td></tr>)}</tbody>
          </table></div></CardWidget>
          <CardWidget title="Vínculos institucionais"><div className="institutional-table" tabIndex={0} role="region" aria-label="Detalhamento dos vínculos"><table role="table">
            <thead role="rowgroup"><tr role="row">{["Profissional", "Ocupação", "Capacidade semanal", "Vigência do vínculo", "Vigência da capacidade", "Gestão"].map(t => <th role="columnheader" key={t} scope="col">{t}</th>)}</tr></thead>
            <tbody role="rowgroup">{data.vinculos.map(v => <tr role="row" key={v.vinculo_id} data-vinculo-id={v.vinculo_id}><th role="rowheader" scope="row" data-label="Profissional">{v.profissional_nome}<details><summary>Dados para suporte</summary><small>Vínculo #{v.vinculo_id}</small></details></th><td role="cell" data-label="Ocupação">{v.ocupacao_nome}{!v.ocupacao_ativa && " (inativa)"}</td><td role="cell" data-label="Capacidade semanal">{weeklyLoad(v.minutos_semanais)}</td><td role="cell" data-label="Vigência do vínculo">{civil(v.vinculo_data_inicio)} — {civil(v.vinculo_data_fim)}</td><td role="cell" data-label="Vigência da capacidade">{v.capacidade_id == null ? <span className="capacity-missing">Não informada</span> : `${civil(v.capacidade_data_inicio)} — ${civil(v.capacidade_data_fim)}`}</td><td role="cell" data-label="Gestão"><button disabled={!available.some(l => l.id === v.vinculo_id)} onClick={() => manage(v.vinculo_id)}>Gerenciar capacidade</button></td></tr>)}</tbody>
          </table></div></CardWidget>
        </>}
      </>}
  </div></PageLayout>;
}
