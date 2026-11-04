import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageLayout from "../components/layouts/PageLayout";
import Button from "../components/ui/Button";
import { instituicoesOperacionais, contextosOperacionais, erroOperacional } from "../services/operacaoAssistencial";
import "./OperacaoAssistencial.css";
import ContextoOperacoes from "../components/ContextoOperacoes";

const date = value => value ? value.split("-").reverse().join("/") : "em aberto";
const contextLabel = c => `${date(c.data_inicio)} → ${date(c.data_fim)} · referência ${c.id}`;

export default function OperacaoAssistencial() {
  const [linking, setLinking] = useState(false), [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false);
  const markUncertain = useCallback(() => setUncertain(true), []);
  const [search, setSearch] = useSearchParams();
  const institution = search.get("instituicao_id") || "";
  const context = search.get("contexto_id") || "";
  return <PageLayout><div className="context-setup"><h1>Configurar contexto</h1>
    <p>Prepare os responsáveis, as participações e as permissões. Cada ação depende da autorização da conta conectada.</p>
    <Link to="/saude-mental">Voltar à Saúde Mental</Link>
    <Button disabled={busy || uncertain} onClick={() => setLinking(v => !v)}>{linking ? "Fechar vínculo" : "Vincular Pessoa a Profissional"}</Button>
    {uncertain && <p role="alert">Resultado não confirmado. Novas operações bloqueadas nesta sessão; solicite conferência administrativa.</p>}
    {linking ? <VincularPessoa onBusy={setBusy} onUncertain={markUncertain} blocked={uncertain} /> : <Scope key={`${institution}:${context}`} {...{institution, context, setSearch}} />}
  </div></PageLayout>;
}
function Scope({ institution, context, setSearch }) {
  const [choices, setChoices] = useState(null), [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    Promise.all([instituicoesOperacionais(), institution ? contextosOperacionais(Number(institution)) : Promise.resolve([])])
      .then(([institutions, contexts]) => { if (current) { setChoices({institutions, contexts}); setError(""); } })
      .catch(e => { if (current) setError(erroOperacional(e)); });
    return () => { current = false; };
  }, [institution, retry]);
  const selected = choices?.contexts.find(c => c.id === Number(context));
  const institutionName = choices?.institutions.find(i => i.id === Number(institution))?.nome;
  return <>
    {error ? <p role="alert">{error} <Button onClick={() => setRetry(n => n + 1)}>Reconsultar opções</Button></p> : !choices ? <p role="status">Carregando instituições e contextos...</p> : <section className="setup-card setup-grid">
      <label>Instituição<select aria-label="Instituição" value={institution} onChange={e => setSearch(e.target.value ? { instituicao_id: e.target.value } : {})}><option value="">Selecione</option>{choices.institutions.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}</select></label>
      <label>Contexto<select aria-label="Contexto" disabled={!institution} value={context} onChange={e => setSearch({ instituicao_id: institution, ...(e.target.value ? { contexto_id: e.target.value } : {}) })}><option value="">Selecione um contexto existente</option>{choices.contexts.map(c => <option key={c.id} value={c.id}>{contextLabel(c)}</option>)}</select></label>
      {!choices.institutions.length && <p>Nenhuma instituição disponível para esta conta. Solicite ao administrador a conferência do acesso institucional.</p>}
      {institution && !choices.contexts.length && <p>Nenhum contexto disponível nesta instituição para esta conta. Solicite a conferência do contexto e das autorizações.</p>}
      {context && !selected && <p role="alert">O contexto informado não está disponível nesta consulta. Selecione um contexto autorizado.</p>}
    </section>}
    {institutionName && selected && !error && <ContextoOperacoes institution={Number(institution)} context={Number(context)} institutionName={institutionName} selected={selected} />}
  </>;
}

// Only operationally authorized identities are used; no administrative lookup.
function VincularPessoa({ onBusy, onUncertain, blocked }) {
  const [institutions, setInstitutions] = useState(null), [institution, setInstitution] = useState("");
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const reportBusy = useCallback(value => { setBusy(value); onBusy(value); }, [onBusy]);
  useEffect(() => {
    let current = true;
    instituicoesOperacionais().then(rows => { if (!Array.isArray(rows)) throw Error("Invalid institutions"); if (current) setInstitutions(rows); }).catch(e => { if (current) setError(erroOperacional(e)); });
    return () => { current = false; };
  }, []);
  return <section className="setup-card" aria-label="Vincular Pessoa a Profissional">
    <h2>Vincular Pessoa a Profissional</h2><p>Estabelece somente a participação no contexto existente. Não concede acesso clínico.</p>
    {error && <p role="alert">{error}</p>}
    <fieldset disabled={busy || blocked}>
      <label>Instituição do vínculo<select value={institution} onChange={e => setInstitution(e.target.value)} disabled={!institutions}><option value="">Selecione</option>{institutions?.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}</select></label>
      {institution && <PacienteDoVinculo key={institution} institution={Number(institution)} institutionName={institutions.find(i => i.id === Number(institution)).nome} onBusy={reportBusy} onUncertain={onUncertain} blocked={blocked} />}
    </fieldset>
  </section>;
}
function PacienteDoVinculo({ institution, institutionName, onBusy, onUncertain, blocked }) {
  const [rows, setRows] = useState(null), [person, setPerson] = useState(""), [context, setContext] = useState(""), [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    contextosOperacionais(institution).then(values => {
      if (!Array.isArray(values)) throw Error("Invalid operational identities");
      const contexts = new Set(), links = new Map(), patients = new Map(), people = new Map();
      for (const c of values) {
        if (![c.id, c.instituicao_id, c.paciente_id, c.paciente_instituicao_id, c.pessoa_id].every(v => Number.isSafeInteger(v) && v > 0) || c.instituicao_id !== institution || contexts.has(c.id)) throw Error("Invalid operational identity");
        const identity = `${c.paciente_id}:${c.pessoa_id}`;
        if ((links.has(c.paciente_instituicao_id) && links.get(c.paciente_instituicao_id) !== identity) || (patients.has(c.paciente_id) && patients.get(c.paciente_id) !== c.pessoa_id) || (people.has(c.pessoa_id) && people.get(c.pessoa_id) !== c.paciente_id)) throw Error("Conflicting operational identity");
        contexts.add(c.id); links.set(c.paciente_instituicao_id, identity); patients.set(c.paciente_id, c.pessoa_id); people.set(c.pessoa_id, c.paciente_id);
      }
      if (current) setRows(values);
    }).catch(e => { if (current) setError(e?.response ? erroOperacional(e) : "Não foi possível confirmar a correspondência entre Pessoa, paciente, vínculo e contexto. Identificação operacional incompleta ou inconsistente; solicite conferência ao responsável."); });
    return () => { current = false; };
  }, [institution]);
  const people = [...new Map((rows || []).map(c => [c.pessoa_id, c.paciente_id])).entries()];
  const patient = people.find(([id]) => id === Number(person))?.[1];
  const contexts = rows?.filter(c => c.pessoa_id === Number(person) && c.paciente_id === patient && c.instituicao_id === institution) || [];
  const selected = contexts.find(c => c.id === Number(context));
  return <>
    {error && <p role="alert">{error}</p>}
    {!rows && !error && <p role="status">Consultando identificação operacional autorizada...</p>}
    {rows && !rows.length && <p>Nenhum contexto autorizado disponível nesta instituição. Solicite a conferência das autorizações ou a preparação em Pessoas → Configurar contexto. Nenhum contexto será criado aqui.</p>}
    {!!people.length && <><p>Selecione a referência da Pessoa. Esta consulta fornece somente identificadores, sem dados clínicos.</p>
      <label>Pessoa paciente<select value={person} onChange={e => { setPerson(e.target.value); setContext(""); }}><option value="">Selecione explicitamente</option>{people.map(([id, patientId]) => <option key={id} value={id}>Pessoa #{id} · paciente #{patientId}</option>)}</select></label></>}
    {person && <label>Contexto do paciente<select value={context} onChange={e => setContext(e.target.value)}><option value="">Selecione</option>{contexts.map(c => <option key={c.id} value={c.id}>{contextLabel(c)} · vínculo #{c.paciente_instituicao_id}</option>)}</select></label>}
    {selected && <ContextoOperacoes key={`${person}:${context}`} institution={institution} context={selected.id} institutionName={institutionName} selected={selected} externalStep={3} embedded verifyParticipation onBusy={onBusy} onUncertain={onUncertain} blocked={blocked} />}
  </>;
}
