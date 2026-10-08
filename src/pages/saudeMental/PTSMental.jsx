import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import ClinicalPageLayout from "../../components/clinical/ClinicalPageLayout";
import { jornadaMental, listarPTSMental, salvarPTSMental, erroMental } from "../../services/saudeMental";
import "./PTSMental.css";
import PlanejamentoMental from "./PlanejamentoMental";

export default function PTSMental() {
  const { pessoaId, contextoId } = useParams();
  const [search] = useSearchParams();
  const institution = search.get("instituicao_id") || "";
  return <ContextualPlan key={`${institution}:${pessoaId}:${contextoId}`} {...{ institution, pessoaId, contextoId }} />;
}

function ContextualPlan({ institution, pessoaId, contextoId }) {
  const navigate = useNavigate();
  const back = `/saude-mental/pessoas/${pessoaId}/contextos/${contextoId}?instituicao_id=${encodeURIComponent(institution)}`;
  const mounted = useRef(true);
  const [jornada, setJornada] = useState(null);
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [editor, setEditor] = useState(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    mounted.current = true;
    async function load() {
      try {
        if (!institution) throw { response: { status: 422 } };
        const [journey, result] = await Promise.all([jornadaMental(institution, pessoaId, contextoId), listarPTSMental(institution, pessoaId, contextoId)]);
        if (mounted.current) { setJornada(journey); setPlans(result); }
      } catch (e) { if (mounted.current) setError(erroMental(e)); }
    }
    load();
    return () => { mounted.current = false; };
  }, [institution, pessoaId, contextoId]);
  async function refresh() {
    setSaving(true); setMessage("");
    try {
      const result = await listarPTSMental(institution, pessoaId, contextoId);
      if (mounted.current) { setPlans(result); setError(""); setUncertain(false); setEditor(null); }
    } catch (e) { if (mounted.current) { setPlans(null); setError(erroMental(e)); } }
    finally { if (mounted.current) setSaving(false); }
  }
  async function mutate(method, suffix, payload) {
    if (saving || uncertain || plans?.pode_registrar !== true) return;
    setSaving(true); setError(""); setMessage("");
    try {
      await salvarPTSMental(institution, pessoaId, contextoId, method, suffix, payload);
      const result = await listarPTSMental(institution, pessoaId, contextoId);
      if (mounted.current) { setPlans(result); setEditor(null); setMessage("PTS atualizado. Estado persistido consultado."); }
    } catch (e) {
      if (mounted.current) {
        setError(({401:"Sua sessão expirou.",403:"Operação não autorizada neste contexto.",409:"Há um conflito no PTS. Consulte o estado atual antes de continuar.",422:"Revise os dados do formulário."})[e?.response?.status] || "Não foi possível confirmar a operação. Consulte o estado atual antes de tentar novamente.");
        setUncertain(![422].includes(e?.response?.status));
      }
    } finally { if (mounted.current) setSaving(false); }
  }
  function edit(kind, plan = null, objective = null) {
    setEditor({ kind, plan, objective, data_inicio: "", objetivo_geral: plan?.objetivo_geral || "", observacoes: plan?.observacoes || "", descricao: objective?.descricao || "", prioridade: objective?.prioridade || "", status: objective?.status || "" });
  }
  function save(event) {
    event.preventDefault();
    const objective = editor.kind.startsWith("objective");
    const payload = objective ? { descricao: editor.descricao.trim(), prioridade: editor.prioridade || null, ...(editor.kind === "objective_edit" ? { status: editor.status } : {}) } : { objetivo_geral: editor.objetivo_geral.trim(), observacoes: editor.observacoes.trim() || null, ...(editor.kind === "create" ? { data_inicio: editor.data_inicio } : {}) };
    if (!(objective ? payload.descricao : payload.objetivo_geral)) return;
    const suffix = editor.kind === "create" ? "" : `/${editor.plan.id}` + (objective ? `/objetivos${editor.objective ? `/${editor.objective.id}` : ""}` : "");
    mutate(["create", "objective_create"].includes(editor.kind) ? "POST" : "PUT", suffix, payload);
  }
  const backButton = <Button variant="secondary" onClick={() => navigate(back)}>Voltar ao prontuário</Button>;
  if (!jornada || !plans) return <main className="mental-pts">{error ? <p role="alert">{error}</p> : <p role="status">Carregando PTS…</p>}{backButton}{error && jornada && <Button onClick={refresh}>Consultar PTS</Button>}</main>;
  const active = plans.itens.some(p => p.status === "ATIVO");
  const canWrite = plans.pode_registrar === true && !saving && !uncertain;
  return <div className="mental-pts"><ClinicalPageLayout titulo="Plano Terapêutico Singular" badge="Jornada Assistencial" subtitulo="Objetivos terapêuticos e acompanhamento profissional no contexto da Pessoa.">
    <div className="mental-pts__actions">{backButton}<Button variant="secondary" disabled={saving} onClick={refresh}>Consultar PTS</Button></div>
    <section className="mental-pts__card"><h2>{jornada.nome_social || jornada.nome_completo}</h2><p>{jornada.instituicao_nome} · Contexto #{jornada.contexto_assistencial_id} · Saúde Mental</p></section>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {!plans.pode_registrar && <p>Consulta disponível. Alterações exigem autorização de registro neste contexto.</p>}
    {!active && <section className="mental-pts__card"><h3>Nenhum PTS ativo cadastrado.</h3><Button disabled={!canWrite} onClick={() => edit("create")}>+ Criar PTS</Button></section>}
    {editor && <form className="mental-pts__card" onSubmit={save}><h3>{({create:"Novo PTS",edit:"Editar PTS",objective_create:"Novo Objetivo",objective_edit:"Acompanhar Objetivo"})[editor.kind]}</h3>
      <fieldset disabled={!canWrite}>
        {editor.kind.startsWith("objective") ? <>
          <label>Descrição<textarea aria-label="Descrição" required value={editor.descricao} onChange={e => setEditor({...editor,descricao:e.target.value})} /></label>
          <label>Prioridade<select value={editor.prioridade} onChange={e => setEditor({...editor,prioridade:e.target.value})}><option value="">Sem prioridade</option>{["BAIXA","MEDIA","ALTA"].map(p => <option key={p}>{p}</option>)}</select></label>
          {editor.kind === "objective_edit" && <label>Status do objetivo<input required maxLength={30} value={editor.status} onChange={e => setEditor({...editor,status:e.target.value})} /></label>}
        </> : <>
          {editor.kind === "create" && <label>Data de início<input required type="date" value={editor.data_inicio} onChange={e => setEditor({...editor,data_inicio:e.target.value})} /></label>}
          <label>Objetivo geral<textarea aria-label="Objetivo geral" required value={editor.objetivo_geral} onChange={e => setEditor({...editor,objetivo_geral:e.target.value})} /></label>
          <label>Observações<textarea aria-label="Observações" value={editor.observacoes} onChange={e => setEditor({...editor,observacoes:e.target.value})} /></label>
        </>}
        <div className="mental-pts__actions"><Button type="button" variant="secondary" onClick={() => setEditor(null)}>Cancelar</Button><Button type="submit">{saving ? "Salvando…" : "Salvar"}</Button></div>
      </fieldset>
    </form>}
    {plans.itens.map(plan => <section key={plan.id} className="mental-pts__card" aria-label={`PTS #${plan.id}`}>
      <div className="mental-pts__actions"><h3>PTS #{plan.id} · {plan.status}</h3><Button disabled={!canWrite} variant="secondary" onClick={() => edit("edit",plan)}>Editar PTS</Button>
        <Button disabled={!canWrite || (plan.status !== "ATIVO" && active)} variant="secondary" onClick={() => { if(window.confirm(plan.status === "ATIVO" ? "Encerrar este PTS?" : "Reabrir este PTS?")) mutate("PUT",`/${plan.id}/${plan.status === "ATIVO" ? "encerrar" : "reabrir"}`); }}>{plan.status === "ATIVO" ? "Encerrar PTS" : "Reabrir PTS"}</Button></div>
      <p>Início: {plan.data_inicio} · Encerramento: {plan.data_fim || "—"}</p>
      <strong>Objetivo geral</strong><p className="mental-pts__text">{plan.objetivo_geral || "—"}</p><strong>Observações</strong><p className="mental-pts__text">{plan.observacoes || "—"}</p>
      <h4>Objetivos Terapêuticos</h4>{plan.status === "ATIVO" && <Button variant="secondary" disabled={!canWrite} onClick={() => edit("objective_create",plan)}>+ Novo Objetivo</Button>}
      {plan.objetivos.length === 0 && <p>Nenhum objetivo cadastrado.</p>}
      {plan.objetivos.map(objective => <article key={objective.id} className="mental-pts__objective"><span>{objective.prioridade || "SEM PRIORIDADE"} · {objective.status}</span><p>{objective.descricao}</p><Button variant="secondary" disabled={!canWrite} onClick={() => edit("objective_edit",plan,objective)}>Acompanhar Objetivo</Button><PlanejamentoMental institution={institution} pessoaId={pessoaId} contextoId={contextoId} plan={plan} objective={objective} canWrite={canWrite} /></article>)}
    </section>)}
  </ClinicalPageLayout></div>;
}
