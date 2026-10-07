import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import AssessmentField from "../../components/assessments/AssessmentField";
import { jornadaMental, erroMental, registrarGAD7Mental } from "../../services/saudeMental";
import "./PHQ9Mental.css";

export default function GAD7Mental() {
  const { pessoaId, contextoId } = useParams();
  const [search] = useSearchParams();
  const institution = search.get("instituicao_id") || "";
  return <AssessmentPage key={`${institution}:${pessoaId}:${contextoId}`} {...{ institution, pessoaId, contextoId }} />;
}
function AssessmentPage({ institution, pessoaId, contextoId }) {
  const navigate = useNavigate();
  const back = `/saude-mental/pessoas/${pessoaId}/contextos/${contextoId}?instituicao_id=${encodeURIComponent(institution)}`;
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [result, setResult] = useState(null);
  const mounted = useRef(true);
  const pending = useRef(false);
  useEffect(() => {
    mounted.current = true;
    async function load() {
      try {
        if (!institution) throw { response: { status: 422 } };
        const data = await jornadaMental(institution, pessoaId, contextoId);
        if (mounted.current) setJourney(data);
      } catch (e) { if (mounted.current) setError(erroMental(e)); }
      finally { if (mounted.current) setLoading(false); }
    }
    load();
    return () => { mounted.current = false; };
  }, [institution, pessoaId, contextoId]);
  const fields = journey?.gad7?.formulario?.campos || [];
  const allowed = journey?.gad7?.pode_registrar === true && fields.length === 7;
  const answered = fields.filter(field => answers[field.nome_campo] !== undefined).length;
  async function save(event) {
    event.preventDefault();
    if (pending.current || uncertain || result || !allowed) return;
    if (answered !== 7) {
      setError("Responda às sete questões antes de concluir.");
      const missing = fields.find(field => answers[field.nome_campo] === undefined);
      document.getElementById(`question-${missing.nome_campo}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    pending.current = true; setSaving(true); setError("");
    try {
      const saved = await registrarGAD7Mental(institution, pessoaId, contextoId, { respostas: answers });
      if (mounted.current) setResult(saved.resultado);
    } catch (e) {
      if (mounted.current) {
        const status = e?.response?.status;
        setError(({401: "Sua sessão expirou. Entre novamente.", 403: "Aplicação não autorizada neste contexto.", 422: "Revise as sete respostas."})[status] || "Não foi possível confirmar a avaliação. Consulte a jornada antes de tentar novamente.");
        setUncertain(![401, 403, 422].includes(status));
      }
    } finally { pending.current = false; if (mounted.current) setSaving(false); }
  }
  return <main className="mental-phq9"><div className="mental-phq9__container">
    <Button variant="secondary" disabled={saving} onClick={() => navigate(back, { state: result ? { gad7Saved: true } : undefined })}>← Voltar ao prontuário</Button>
    <header className="mental-phq9__header"><small>Framework Universal de Avaliações</small><h1>GAD-7</h1>
      <p>Rastreamento de sintomas de ansiedade · Aplicação assistida</p>
      {journey && <div className="mental-phq9__identity"><strong>Pessoa: {journey.nome_social || journey.nome_completo}</strong>
        <p>{journey.instituicao_nome} · Contexto #{journey.contexto_assistencial_id} · Saúde Mental</p></div>}
      <p>Instrumento de rastreamento de sintomas. O resultado não estabelece diagnóstico.</p>
    </header>
    {loading && <p role="status">Preparando a avaliação…</p>}
    {error && <p role="alert" className="mental-phq9__alert">{error}</p>}
    {!loading && !error && !allowed && <p role="alert">Aplicação não disponível neste contexto.</p>}
    {result ? <section className="mental-phq9__result" aria-label="Resultado GAD-7">
      <h2>Avaliação registrada</h2><p><strong>Pontuação: {result.score} / 21</strong></p>
      <p>Intensidade de sintomas segundo o GAD-7: {result.classificacao}</p><p>{result.interpretacao}</p>
      {result.alertas?.map(alert => <p key={alert} role="alert" className="mental-phq9__alert">{alert}</p>)}
      <p>{result.conduta}</p><Button onClick={() => navigate(back, { replace: true, state: { gad7Saved: true } })}>Retornar ao prontuário</Button>
    </section> : allowed && <form onSubmit={save}>
      <h2>Aplicação da Avaliação</h2><p>{journey.gad7.instrucoes}</p>
      <p role="status">{answered} / 7 respondidas</p>
      <progress max="7" value={answered} aria-label="Progresso da avaliação" />
      <fieldset disabled={saving || uncertain}>
        {fields.map((field, index) => <div id={`question-${field.nome_campo}`} key={field.id}>
          <AssessmentField campo={field} numero={index + 1} valor={answers[field.nome_campo]} onChange={(key, value) => setAnswers(current => ({ ...current, [key]: value }))} />
        </div>)}
      </fieldset>
      <Button type="submit" disabled={saving || uncertain}>{saving ? "Registrando…" : "Concluir avaliação"}</Button>
      {uncertain && <p>Use “Voltar ao prontuário” para consultar o estado persistido.</p>}
    </form>}
  </div></main>;
}
