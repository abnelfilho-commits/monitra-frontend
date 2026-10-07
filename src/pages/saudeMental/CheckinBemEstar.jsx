import { useRef, useEffect, useState } from "react";
import { responseLabels, valueLabels } from "./bemEstarPresentation";
import AssessmentField from "../../components/assessments/AssessmentField";
import Button from "../../components/ui/Button";
import { registrarCheckin, erroCheckin } from "../../services/saudeMental";

export default function CheckinBemEstar({ jornada, onSaved, open, setOpen, showHistory = true }) {
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const data = jornada.bem_estar;
  const fields = data?.formulario?.campos || [];
  const canWrite = data?.pode_registrar === true && fields.length > 0;
  const checkins = data?.checkins || [];
  const update = (name, value) => setAnswers(previous => ({ ...previous, [name]: value, ...(name === "evento_relevante" && value === "NAO" ? { evento_descricao: "" } : {}) }));
  async function submit(event) {
    event.preventDefault();
    if (saving || uncertain) return;
    if (fields.some(f => f.obrigatorio && !answers[f.nome_campo])) { setError("Responda todas as perguntas obrigatórias."); return; }
    setSaving(true); setError("");
    try {
      await registrarCheckin(jornada.instituicao_id, jornada.pessoa_id, jornada.contexto_assistencial_id, {
        paciente_id: jornada.paciente_id, modulo_id: jornada.modulo_id, formulario_id: data.formulario.id, respostas: answers,
      });
      if (mounted.current) { setOpen(false); setAnswers({}); onSaved(); }
    } catch (e) {
      if (mounted.current) {
        setError(erroCheckin(e));
        // Never automatically repeat a write whose completion could be uncertain.
        setUncertain(![401, 403, 422, 503].includes(e?.response?.status));
      }
    } finally { if (mounted.current) setSaving(false); }
  }
  return <section>
    <p>As respostas devem refletir a percepção da própria pessoa. O profissional está apenas auxiliando no registro.</p>
    <p>Este Check-in não é um instrumento diagnóstico nem um canal de emergência.</p>
    {!canWrite && <p>Registro indisponível: é necessário contexto aberto, linha ativa e autorização para registrar.</p>}
    {open && <form onSubmit={submit}>
      <h3>{checkins.length === 0 ? "Check-in Inicial" : "Check-in de Bem-Estar — Acompanhamento"} — {jornada.nome_social || jornada.nome_completo}</h3>
      <p>Modalidade assistida · Portal Profissional</p>
      <fieldset disabled={saving || uncertain} style={{ border: 0, padding: 0 }}>
        {fields.filter(f => f.tipo_campo !== "textarea").map((f, index) => <AssessmentField key={f.id} campo={f} numero={index + 1} valor={answers[f.nome_campo]} onChange={update} />)}
        {answers.evento_relevante === "SIM" && <label>Descrição do evento (opcional)<textarea name="evento_descricao" maxLength={2000} value={answers.evento_descricao || ""} onChange={e => update("evento_descricao", e.target.value)} style={{ display: "block", width: "100%", minHeight: 90 }} /></label>}
      </fieldset>
      {error && <p role="alert">{error}</p>}
      {saving && <p role="status">Salvando Check-in…</p>}
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <Button type="submit" disabled={saving || uncertain}>Salvar Check-in</Button>
        <Button type="button" variant="secondary" disabled={saving} onClick={() => { setOpen(false); setAnswers({}); setError(""); }}>Cancelar</Button>
        {uncertain && <Button type="button" onClick={() => window.location.reload()}>Atualizar jornada</Button>}
      </div>
    </form>}
    {showHistory && checkins.map(item => <article key={item.id} style={{ borderTop: "1px solid #e5e7eb", marginTop: 20, paddingTop: 16 }}>
      <h3>{item.baseline ? "Check-in Inicial · Baseline" : "Check-in de Bem-Estar"}</h3>
      <p>{new Date(item.data_hora).toLocaleString("pt-BR")} · {item.modalidade === "ASSISTIDO" ? "Modalidade assistida" : item.modalidade}</p>
      <dl>{Object.entries(item.respostas).map(([name, value]) => {
        const f = fields.find(field => field.nome_campo === name);
        return <div key={name}><dt>{f?.label || responseLabels[name] || name}</dt><dd>{f?.opcoes?.find(o => o.valor === value)?.label || valueLabels[value] || value}</dd></div>;
      })}</dl>
    </article>)}
  </section>;
}
