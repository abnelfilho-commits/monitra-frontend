import CronogramaMental from "./CronogramaMental";
import { useState } from "react";
import Button from "../../components/ui/Button";
import { salvarPTSMental } from "../../services/saudeMental";

const blank = { atividade_id:"", ocupacao_id:"", profissional_id:"", frequencia_semanal:"", duracao_minutos:"", data_inicio:"", data_fim:"", quantidade_sessoes:"", observacoes:"" };
const failure = e => e?.response?.data?.detail?.message || ({403:"Operação não autorizada neste contexto.",404:"Planejamento indisponível neste contexto.",409:"Planejamento em conflito. Consulte novamente."})[e?.response?.status] || "Não foi possível confirmar a operação. Consulte novamente antes de tentar.";

export default function PlanejamentoMental({ institution, pessoaId, contextoId, plan, objective, canWrite }) {
  const [items,setItems]=useState(null), [catalog,setCatalog]=useState(null), [form,setForm]=useState(null);
  const [busy,setBusy]=useState(false), [error,setError]=useState(""), [quantity,setQuantity]=useState(null), [uncertain,setUncertain]=useState(false);
  const suffix=`/${plan.id}/objetivos/${objective.id}/planejamentos`;
  const call=(method,path,payload) => salvarPTSMental(institution,pessoaId,contextoId,method,path,payload);
  async function load() {
    setBusy(true);setError("");
    try {setItems(await call("GET",suffix));setUncertain(false);setForm(null);}
    catch(e){setError(failure(e));setUncertain(true);}
    finally{setBusy(false);}
  }
  async function edit(item=null) {
    setBusy(true);setError("");setQuantity(null);
    try {setCatalog(await call("GET","/catalogo-planejamento"));setForm(item ? {...item,quantidade_sessoes:String(item.quantidade_sessoes),observacoes:item.observacoes||""} : {...blank});}
    catch(e){setError(failure(e));}
    finally{setBusy(false);}
  }
  function change(key,value) {setForm(prev=>({...prev,[key]:value,...(key==="atividade_id"?{ocupacao_id:"",profissional_id:""}:key==="ocupacao_id"?{profissional_id:""}:{})}));setQuantity(null);}
  function period() {return {data_inicio:form.data_inicio,data_fim:form.data_fim,frequencia_semanal:Number(form.frequencia_semanal),duracao_minutos:Number(form.duracao_minutos),quantidade_sessoes:form.quantidade_sessoes===""?null:Number(form.quantidade_sessoes)};}
  async function calculate() {
    setBusy(true);setError("");setQuantity(null);
    try {setQuantity(await call("POST","/calcular-quantidade",period()));}
    catch(e){setError(failure(e));}
    finally{setBusy(false);}
  }
  async function save(e) {
    e.preventDefault();if(!canWrite||busy||uncertain)return;
    setBusy(true);setError("");
    try {
      await call(form.id?"PUT":"POST",suffix+(form.id?`/${form.id}`:""),{...period(),atividade_id:Number(form.atividade_id),ocupacao_id:Number(form.ocupacao_id),profissional_id:Number(form.profissional_id),observacoes:form.observacoes.trim()||null});
      setItems(await call("GET",suffix));setForm(null);setQuantity(null);
    } catch(err){setError(failure(err));setUncertain(err?.response?.status!==422);}
    finally{setBusy(false);}
  }
  const occupations=catalog?.ocupacoes.filter(o=>catalog.associacoes.some(a=>a.atividade_id===Number(form?.atividade_id)&&a.ocupacao_id===o.id))||[];
  const executors=(catalog?.executores||[]).filter(p=>p.ocupacao_id===Number(form?.ocupacao_id)).filter((p,i,all)=>all.findIndex(x=>x.profissional_id===p.profissional_id)===i);
  return <section aria-label={`Planejamento do objetivo ${objective.id}`}>
    <h5>Planejamento Assistencial</h5><Button variant="secondary" disabled={busy} onClick={load}>Consultar planejamentos</Button>
    {error&&<p role="alert">{error}</p>}
    {items&&<><p>Planejamento não representa sessão agendada, realizada ou previsão financeira.</p>
      {!items.length&&<p>Nenhum planejamento registrado.</p>}
      {items.map(item=><div key={item.id} className="mental-pts__card"><strong>{item.atividade_nome}</strong><p>{item.ocupacao_nome} · {item.profissional_nome}</p><p>{item.frequencia_semanal} vezes/semana · {item.duracao_minutos} minutos · {item.data_inicio} até {item.data_fim}</p><p>Quantidade planejada: {item.quantidade_sessoes} sessões · {item.status}</p>{item.observacoes&&<p>{item.observacoes}</p>}<Button variant="secondary" disabled={!canWrite||busy||uncertain} onClick={()=>edit(item)}>Editar planejamento</Button><CronogramaMental institution={institution} pessoaId={pessoaId} contextoId={contextoId} plan={plan} objective={objective} planning={item} canWrite={canWrite} /></div>)}
      <Button variant="secondary" disabled={!canWrite||busy||uncertain} onClick={()=>edit()}>+ Novo planejamento</Button></>}
    {form&&catalog&&<form className="mental-pts__card" onSubmit={save}><h5>{form.id?"Editar planejamento":"Novo planejamento"}</h5><fieldset disabled={!canWrite||busy||uncertain}>
      <label>Atividade<select aria-label="Atividade" required value={form.atividade_id} onChange={e=>change("atividade_id",e.target.value)}><option value="">Selecione</option>{catalog.atividades.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}</select></label>
      <label>Ocupação<select aria-label="Ocupação" required value={form.ocupacao_id} onChange={e=>change("ocupacao_id",e.target.value)}><option value="">Selecione</option>{occupations.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}</select></label>
      <label>Profissional executor<select aria-label="Profissional executor" required value={form.profissional_id} onChange={e=>change("profissional_id",e.target.value)}><option value="">Selecione</option>{executors.map(p=><option key={p.profissional_id} value={p.profissional_id}>{p.nome}</option>)}</select></label>
      <p>O vínculo institucional do executor deve cobrir todo o período. Nenhum acesso clínico é concedido por esta seleção.</p>
      <div className="mental-planning-grid">{[["frequencia_semanal","Frequência semanal","number"],["duracao_minutos","Duração da sessão (minutos)","number"],["data_inicio","Data inicial","date"],["data_fim","Data final","date"]].map(([key,label,type])=><label key={key}>{label}<input aria-label={label} required type={type} min={type==="number"?1:undefined} value={form[key]} onChange={e=>change(key,e.target.value)}/></label>)}</div>
      <label>Quantidade manual (opcional)<input aria-label="Quantidade manual (opcional)" type="number" min="1" value={form.quantidade_sessoes} onChange={e=>change("quantidade_sessoes",e.target.value)}/></label><p>Deixe vazio para calcular pela frequência e período. Na edição, a quantidade persistida é explícita; limpe o campo para recalcular.</p>
      <Button type="button" variant="secondary" onClick={calculate}>Calcular quantidade</Button>
      {quantity&&<p role="status">Quantidade planejada: {quantity.quantidade_sessoes} sessões — {quantity.origem_quantidade==="CALCULADA"?"calculada a partir da frequência e período":"quantidade manual validada para o período"}.</p>}
      <label>Observações do planejamento<textarea aria-label="Observações do planejamento" value={form.observacoes} onChange={e=>change("observacoes",e.target.value)}/></label>
      <div className="mental-pts__actions"><Button type="button" variant="secondary" onClick={()=>setForm(null)}>Cancelar planejamento</Button><Button type="submit">Salvar planejamento</Button></div>
    </fieldset></form>}
  </section>;
}
