import { useCallback, useEffect, useId, useRef, useState } from "react";
import Button from "./ui/Button";
import ContextoOperacoes from "./ContextoOperacoes";
import ProfissionalPessoa from "./ProfissionalPessoa";
import HabilitarAcesso from "./HabilitarAcesso";
import { listarInstituicoes } from "../services/instituicoes";
import { obterVinculosPessoa, listarPessoas, obterPessoa, criarContextoPessoa, adicionarSaudeMental } from "../services/pessoas";
import { contextosDaPessoa, erroOperacional } from "../services/operacaoAssistencial";
import "./ConfigurarContextoModal.css";

const steps = ["Instituição", "Pessoa", "Contexto", "Responsáveis", "Equipe e permissões", "Conclusão"];
const date = v => v ? v.split("-").reverse().join("/") : "em aberto";
const institutionName = i => i?.nome_fantasia || i?.razao_social || "Instituição";

export default function ConfigurarContextoModal({ person, initialInstitution, initialLink, initialContext, renderPersonPreparation, renderLinkPreparation, externalBusy = false, label = "Configurar contexto", onClosed }) {
  const [open, setOpen] = useState(false), [step, setStep] = useState(0), [substep, setSubstep] = useState(0);
  const [data, setData] = useState(null), [institution, setInstitution] = useState(""), [contexts, setContexts] = useState(null), [context, setContext] = useState("");
  const [error, setError] = useState(""), [contextError, setContextError] = useState(""), [ownBusy, setBusy] = useState(false), [revision, refresh] = useState(0), [ops, setOps] = useState(null);
  const [creating, setCreating] = useState(false), [link, setLink] = useState(""), [start, setStart] = useState(""), [end, setEnd] = useState("");
  const [blocked, setBlocked] = useState(false), [resolving, setResolving] = useState(false);
  const dialog = useRef(null), title = useRef(null), trigger = useRef(null), locked = useRef(false), dirty = useRef({});
  const titleId = useId();
  const busy = ownBusy || externalBusy;
  const markDirty = useCallback((key, value) => { dirty.current[key] = value; }, []);
  const markUncertain = useCallback(() => setBlocked(true), []);
  const close = () => {
    if (locked.current || busy) return;
    if ((start || end || Object.values(dirty.current).some(Boolean)) && !window.confirm("Fechar e descartar apenas os campos não salvos? As operações já confirmadas serão preservadas.")) return;
    setOpen(false); setCreating(false); setStart(""); setEnd(""); setResolving(false); dirty.current = {}; onClosed?.();
  };
  useEffect(() => {
    const node = dialog.current, returnFocus = trigger.current;
    if (!open) { if (node.open) { node.close(); trigger.current?.focus(); } return; }
    const previousOverflow = document.body.style.overflow;
    node.showModal(); title.current?.focus(); document.body.style.overflow = "hidden";
    return () => { if (node.open) node.close(); document.body.style.overflow = previousOverflow; returnFocus?.focus(); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    let current = true;
    setData(null); setContexts(null); setOps(null); setError(""); setContextError("");
    Promise.all([listarInstituicoes(), obterVinculosPessoa(person.id)]).then(([institutions, links]) => {
      if (!Array.isArray(institutions) || links.pessoa_id !== person.id || !Array.isArray(links.pacientes) || links.pacientes.some(v => v.paciente_id !== links.paciente_id)) throw Error("Invalid person scope");
      if (!current) return;
      const available = institutions.filter(i => i.ativo);
      const known = [...new Set(links.pacientes.filter(v => v.ativo && v.instituicao_ativa && available.some(i => i.id === v.instituicao_id)).map(v => v.instituicao_id))];
      setData({institutions: available, links});
      setInstitution(previous => available.some(i => i.id === Number(previous)) ? previous : available.some(i => i.id === Number(initialInstitution)) ? String(initialInstitution) : known.length === 1 ? String(known[0]) : "");
    }).catch(e => { if (current) setError(erroOperacional(e)); });
    return () => { current = false; };
  }, [open, person.id, initialInstitution, revision]);
  useEffect(() => {
    if (!open || !data || !institution) return;
    let current = true;
    setContexts(null); setOps(null); setError(""); setContextError("");
    const links = data.links.pacientes.filter(v => v.instituicao_id === Number(institution));
    contextosDaPessoa(Number(institution), links).then(rows => {
      if (!current) return;
      const scoped = initialLink && Number(initialInstitution) === Number(institution) ? rows.filter(c => c.paciente_instituicao_id === Number(initialLink)) : rows;
      setContexts(scoped);
      setContext(previous => scoped.some(c => c.id === Number(previous)) ? previous : scoped.some(c => c.id === Number(initialContext)) ? String(initialContext) : scoped.length === 1 ? String(scoped[0].id) : "");
      const activeLinks = links.filter(v => v.ativo);
      setLink(activeLinks.some(v => v.id === Number(initialLink)) ? String(initialLink) : activeLinks.length === 1 ? String(activeLinks[0].id) : "");
    }).catch(e => { if (current) { setContexts(null); setContext(""); setContextError(erroOperacional(e)); } });
    return () => { current = false; };
  }, [open, data, institution, initialLink, initialContext, initialInstitution]);
  function containFocus(e) {
    if (e.key !== "Tab") return;
    const fields = [...dialog.current.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length > 0);
    const first = fields[0], last = fields.at(-1);
    if (!first) { e.preventDefault(); title.current?.focus(); return; }
    if (e.shiftKey && (document.activeElement === first || !fields.includes(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  const requestedMissing = initialContext && contexts && !contexts.some(c => c.id === Number(initialContext));
  const selected = contexts?.find(c => c.id === Number(context));
  const inst = data?.institutions.find(i => i.id === Number(institution));
  const activeLinks = data?.links.pacientes.filter(v => v.instituicao_id === Number(institution) && v.ativo) || [];
  const operationStep = step === 2 ? 0 : step === 3 ? substep === 0 ? 1 : 2 : step === 4 ? substep === 0 ? 3 : 4 : 5;
  async function write(fn) {
    if (locked.current || busy || blocked) return;
    locked.current = true; setBusy(true); setError("");
    try { await fn(); setCreating(false); setStart(""); setEnd(""); refresh(n => n + 1); }
    catch (e) { setError(erroOperacional(e)); if (!e.response || e.response.status >= 500) setBlocked(true); }
    finally { locked.current = false; setBusy(false); }
  }
  function go(next) { setStep(next); setSubstep(0); setResolving(false); title.current?.focus(); }
  const nextAllowed = !!data && !error && !requestedMissing && (step === 0 ? !!inst : step === 1 ? !!person.ativo && !!data.links.paciente_id && data.links.paciente_ativo === true : step === 2 ? !!selected && !creating && !contextError : true);
  return <>
    <Button ref={trigger} variant="secondary" aria-haspopup="dialog" onClick={() => setOpen(true)}>{label}</Button>
    <dialog ref={dialog} className="context-wizard context-setup" aria-labelledby={titleId} onKeyDown={containFocus} onCancel={e => { e.preventDefault(); close(); }}>
      <header><h2 id={titleId} ref={title} tabIndex={-1}>Configurar contexto — {steps[step]}</h2><p>{person.nome_completo}{inst ? ` · ${institutionName(inst)}` : ""}</p><p>Etapa {step + 1} de {steps.length} · {steps.join(" → ")}</p></header>
      <div className="context-wizard-body" aria-busy={busy}>
        {error && <p role="alert">{error} <Button disabled={busy} onClick={() => refresh(n => n + 1)}>Reconsultar</Button></p>}
        {blocked && <p role="alert">Resultado não confirmado. Escritas bloqueadas; solicite conferência administrativa antes de repetir. Fechar e reabrir não libera novas tentativas.</p>}
        {!data && !error && <p role="status">Consultando Pessoa e instituições...</p>}
        {data && <>
          {step === 0 && <><label>Instituição do contexto<select aria-label="Instituição do contexto" disabled={busy} value={institution} onChange={e => { setInstitution(e.target.value); setContext(""); setContexts(null); setCreating(false); setStart(""); setEnd(""); }}><option value="">Selecione</option>{data.institutions.map(i => <option key={i.id} value={i.id}>{institutionName(i)}</option>)}</select></label><p>A instituição é reaproveitada somente quando identificada de forma inequívoca. Não serão criados vínculos ou permissões automaticamente.</p></>}
          {step === 1 && <><h3>{person.nome_completo}</h3><p>Cadastro {person.ativo ? "ativo" : "inativo"}. Papel de Paciente: {data.links.paciente_id ? data.links.paciente_ativo ? "ativo" : "inativo" : "não preparado"}.</p><p>A Pessoa selecionada será preservada. A conta do paciente não precisa receber permissões administrativas.</p>{renderPersonPreparation?.({onBusy:setBusy})}<Button disabled={busy} onClick={() => refresh(n => n + 1)}>Atualizar pré-requisitos</Button></>}
          {step === 2 && <>
            {contextError && <p role="alert">{contextError} Não foi possível confirmar os contextos desta Pessoa. <Button disabled={busy} onClick={() => refresh(n => n + 1)}>Reconsultar contextos</Button></p>}
            {!contexts && !error && !contextError && <p role="status">Identificando contextos desta Pessoa e instituição...</p>}
            {requestedMissing && <p role="alert">O contexto solicitado não está disponível para esta Pessoa e instituição. A retomada foi interrompida; nenhum contexto será criado em seu lugar.</p>}
            {contexts && !requestedMissing && !creating && <>{contexts.length ? <><label>Contexto existente<select aria-label="Contexto existente" disabled={busy} value={context} onChange={e => { setContext(e.target.value); setOps(null); }}><option value="">Selecione explicitamente</option>{contexts.map(c => <option key={c.id} value={c.id}>{date(c.data_inicio)} → {date(c.data_fim)} · referência {c.id}</option>)}</select></label><p>Retomada de contexto existente. Nenhum novo contexto será criado.</p></> : <><p>Nenhum contexto ativo desta Pessoa foi encontrado nesta instituição. A ausência foi confirmada pela consulta.</p>{activeLinks.length ? <Button disabled={busy || blocked} onClick={() => setCreating(true)}>Preparar novo contexto</Button> : <>{renderLinkPreparation?.({institution:Number(institution),onBusy:setBusy,onUncertain:markUncertain,onCreated:() => refresh(n => n + 1),onDirty:markDirty}) || <p>É necessário preparar um vínculo institucional antes de criar o contexto.</p>}</>}</>}</>}
            {creating && <form onSubmit={e => { e.preventDefault(); write(async () => { const c = await criarContextoPessoa({paciente_instituicao_id:Number(link),data_inicio:start,data_fim:end || null}); setContext(String(c.id)); }); }}>
              <p>Criação explícita de contexto — administrador da plataforma.</p><label>Vínculo institucional<select aria-label="Vínculo institucional" required value={link} onChange={e => setLink(e.target.value)}><option value="">Selecione</option>{activeLinks.map(v => <option key={v.id} value={v.id}>{v.instituicao_nome} · {date(v.data_inicio)} → {date(v.data_fim)} · referência {v.id}</option>)}</select></label>
              <div className="setup-grid"><label>Início do contexto<input required type="date" value={start} onChange={e => setStart(e.target.value)} /></label><label>Término do contexto<input type="date" min={start} value={end} onChange={e => setEnd(e.target.value)} /></label></div><Button disabled={busy || blocked || !link || !start || !!(end && end < start)}>Criar contexto</Button><Button type="button" disabled={busy} variant="secondary" onClick={() => { setCreating(false); setStart(""); setEnd(""); }}>Cancelar criação</Button>
            </form>}
            {selected && ops && !ops.linha && !creating && <Button disabled={busy || blocked} onClick={() => write(() => adicionarSaudeMental(selected.id, Number(institution)))}>Adicionar Saúde Mental inativa</Button>}
          </>}
          {(step === 3 || step === 4) && <div className="setup-steps" role="group" aria-label="Ação desta etapa"><Button variant={substep === 0 ? "primary" : "secondary"} disabled={busy} aria-pressed={substep === 0} onClick={() => setSubstep(0)}>{step === 3 ? "Delegação de permissões" : "Participação profissional"}</Button><Button variant={substep === 1 ? "primary" : "secondary"} disabled={busy} aria-pressed={substep === 1} onClick={() => setSubstep(1)}>{step === 3 ? "Administração de participações" : "Permissões de atendimento"}</Button></div>}
          {(step === 3 || step === 4) && <><Button disabled={busy || blocked} variant="secondary" onClick={() => setResolving(v => !v)}>{resolving ? "Voltar às permissões" : step === 3 ? "Resolver acesso institucional de um responsável" : "Resolver cadastro e vínculo de um profissional"}</Button>{resolving && <ResolverAcesso busy={busy} team={step === 4} institution={Number(institution)} onBusy={setBusy} onDirty={markDirty} onUncertain={markUncertain} blocked={blocked} />}</>}
          {selected && step >= 2 && <div hidden={creating || resolving}><ContextoOperacoes key={`${person.id}:${institution}:${context}:${operationStep}`} institution={Number(institution)} context={selected.id} institutionName={institutionName(inst)} selected={selected} embedded externalStep={operationStep} onBusy={setBusy} onUncertain={markUncertain} blocked={blocked} onState={setOps} refreshKey={`${open}:${revision}`} /></div>}
          {step >= 3 && !selected && <p role="alert">Selecione um contexto confirmado desta Pessoa antes de continuar.</p>}
          {step === 5 && <p>As operações confirmadas permanecem no backend. Você pode fechar e retomar a consulta; este resumo não substitui a autorização exigida para cada ação.</p>}
        </>}
      </div>
      <footer><Button variant="secondary" disabled={busy} onClick={close}>Fechar</Button><Button variant="secondary" disabled={busy || step === 0} onClick={() => go(step - 1)}>Voltar</Button><Button disabled={busy || step === 5 || !nextAllowed} onClick={() => go(step + 1)}>Avançar</Button></footer>
    </dialog>
  </>;
}
function ResolverAcesso({ busy, team, institution, onBusy, onDirty, onUncertain, blocked }) {
  const [query, setQuery] = useState(""), [people, setPeople] = useState(null), [person, setPerson] = useState(null), [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const request = useRef(0);
  useEffect(() => () => { request.current += 1; }, []);
  async function search(e) {
    e.preventDefault(); if (busy) return; const generation = ++request.current; setLoading(true); setError(""); setPerson(null); setPeople(null);
    try { const rows = await listarPessoas(0, 20, {nome:query.trim()}); if (generation === request.current) setPeople(rows); } catch(e) { if (generation === request.current) setError(erroOperacional(e)); } finally { if (generation === request.current) setLoading(false); }
  }
  return <section><p>Administrador da plataforma: localize a Pessoa responsável e prepare apenas seu acesso à instituição. Isso não concede autoridade nem acesso clínico.</p><form onSubmit={search}><label>Nome do responsável<input disabled={busy} required value={query} onChange={e => setQuery(e.target.value)} /></label><Button disabled={busy || loading || !query.trim()}>Buscar responsável</Button></form>{error && <p role="alert">{error}</p>}{people && <><label>Pessoa responsável<select aria-label="Pessoa responsável" disabled={busy} value={person?.id || ""} onChange={async e => { const generation = ++request.current; const id = Number(e.target.value); setPerson(null); if (!id) return; try { const p = await obterPessoa(id); if (generation === request.current && p.id === id) setPerson(p); } catch(e) { if (generation === request.current) setError(erroOperacional(e)); } }}><option value="">Selecione</option>{people.map(p => <option key={p.id} value={p.id}>{p.nome_completo} · referência {p.id}</option>)}</select></label><p>Até 20 resultados. Refine o nome se necessário.</p></>}{person && team ? <PrepararProfissional busy={busy} key={person.id} person={person} institution={institution} onBusy={onBusy} onDirty={onDirty} onUncertain={onUncertain} blocked={blocked} /> : person && <HabilitarAcesso key={person.id} person={person} institutionId={institution} onBusy={onBusy} onDirty={onDirty} onUncertain={onUncertain} blocked={blocked} />}</section>;
}

function PrepararProfissional({ busy, person, institution, onBusy, onDirty, onUncertain, blocked }) {
  const [data, setData] = useState(null), [error, setError] = useState(""), [area, setArea] = useState("role");
  const reload = useCallback(async () => {
    const value = await obterVinculosPessoa(person.id);
    if (value.pessoa_id !== person.id) throw Error("Invalid professional identity");
    setData(value); setError(""); return value;
  }, [person.id]);
  useEffect(() => { let current = true; obterVinculosPessoa(person.id).then(value => {
    if (value.pessoa_id !== person.id) throw Error("Invalid professional identity");
    if (current) setData(value);
  }).catch(e => { if (current) setError(erroOperacional(e)); }); return () => { current = false; }; }, [person.id]);
  return <fieldset disabled={blocked}><label>Pré-requisito profissional<select aria-label="Pré-requisito profissional" disabled={busy} value={area} onChange={e => setArea(e.target.value)}><option value="role">Papel profissional</option><option value="link">Vínculo com a instituição</option><option value="access">Acesso à plataforma</option></select></label>
    {error && <p role="alert">{error} <Button onClick={() => reload().catch(e => setError(erroOperacional(e)))}>Reconsultar profissional</Button></p>}
    {!data && !error && <p role="status">Consultando pré-requisitos profissionais...</p>}
    {area === "access" ? <HabilitarAcesso person={person} institutionId={institution} onBusy={onBusy} onDirty={onDirty} onUncertain={onUncertain} blocked={blocked} /> : data && !error && <ProfissionalPessoa person={person} data={data} institutionId={institution} onReload={reload} onBusy={onBusy} onDirty={onDirty} onUncertain={onUncertain}>{({role,link}) => area === "role" ? role : link}</ProfissionalPessoa>}
  </fieldset>;
}
