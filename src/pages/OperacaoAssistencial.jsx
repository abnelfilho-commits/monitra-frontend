import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageLayout from "../components/layouts/PageLayout";
import Button from "../components/ui/Button";
import { instituicoesOperacionais, contextosOperacionais, erroOperacional } from "../services/operacaoAssistencial";
import "./OperacaoAssistencial.css";
import ContextoOperacoes from "../components/ContextoOperacoes";

const date = value => value ? value.split("-").reverse().join("/") : "em aberto";
const contextLabel = c => `${date(c.data_inicio)} → ${date(c.data_fim)} · referência ${c.id}`;

export default function OperacaoAssistencial() {
  const [search, setSearch] = useSearchParams();
  const institution = search.get("instituicao_id") || "";
  const context = search.get("contexto_id") || "";
  return <PageLayout><div className="context-setup"><h1>Configurar contexto</h1>
    <p>Prepare os responsáveis, as participações e as permissões. Cada ação depende da autorização da conta conectada.</p>
    <Link to="/saude-mental">Voltar à Saúde Mental</Link>
    <Scope key={`${institution}:${context}`} {...{institution, context, setSearch}} />
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
