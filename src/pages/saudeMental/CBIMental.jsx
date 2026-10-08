import CBIResult from "./CBIResult";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import AssessmentField from "../../components/assessments/AssessmentField";
import { jornadaMental, erroMental, registrarCBIMental } from "../../services/saudeMental";
import "./PHQ9Mental.css";

export default function CBIMental() {
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
  const fields = journey?.cbi?.formulario?.campos || [];
  const allowed = journey?.cbi?.pode_registrar === true && fields.length === 19;
  const answered = fields.filter(field => answers[field.nome_campo] !== undefined).length;
  async function save(event) {
    event.preventDefault();
    if (pending.current || uncertain || result || !allowed) return;
    if (answered !== 19) {
      setError("Responda às 19 questões antes de concluir.");
      const missing = fields.find(field => answers[field.nome_campo] === undefined);
      document.getElementById(`question-${missing.nome_campo}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    pending.current = true; setSaving(true); setError("");
    try {
      const saved = await registrarCBIMental(institution, pessoaId, contextoId, { respostas: answers });
      if (mounted.current) setResult(saved.resultado);
    } catch (e) {
      if (mounted.current) {
        const status = e?.response?.status;
        setError(({401: "Sua sessão expirou. Entre novamente.", 403: "Aplicação não autorizada neste contexto.", 422: "Revise as 19 respostas."})[status] || "Não foi possível confirmar a avaliação. Consulte a jornada antes de tentar novamente.");
        setUncertain(![401, 403, 422].includes(status));
      }
    } finally { pending.current = false; if (mounted.current) setSaving(false); }
  }
  return <main className="mental-phq9"><div className="mental-phq9__container">
    <Button variant="secondary" disabled={saving} onClick={() => navigate(back, { state: result ? { cbiSaved: true } : undefined })}>← Voltar ao prontuário</Button>
    <header className="mental-phq9__header"><small>Framework Universal de Avaliações</small><h1>CBI</h1>
      <p>Copenhagen Burnout Inventory · Aplicação assistida</p>
      {journey && <div className="mental-phq9__identity"><strong>Pessoa: {journey.nome_social || journey.nome_completo}</strong>
        <p>{journey.instituicao_nome} · Contexto #{journey.contexto_assistencial_id} · Saúde Mental</p></div>}
      <p>Instrumento de rastreamento de sintomas. O resultado não estabelece diagnóstico.</p>
    </header>
    {loading && <p role="status">Preparando a avaliação…</p>}
    {error && <p role="alert" className="mental-phq9__alert">{error}</p>}
    {!loading && !error && !allowed && <p role="alert">Aplicação não disponível neste contexto.</p>}
    {result ? <section className="mental-phq9__result" aria-label="Resultado CBI">
      <h2>Avaliação registrada</h2><CBIResult result={result} />
      <Button onClick={() => navigate(back, { replace: true, state: { cbiSaved: true } })}>Retornar ao prontuário</Button>
    </section> : allowed && <form onSubmit={save}>
      <h2>Aplicação da Avaliação</h2><p>{journey.cbi.instrucoes}</p>
      <p role="status">{answered} / 19 respondidas</p>
      <progress max="19" value={answered} aria-label="Progresso da avaliação" />
      <fieldset disabled={saving || uncertain}>
        {(journey.cbi.dominios || []).map(domain => <section key={domain.codigo} aria-label={domain.nome}>
          <h3>{domain.nome}</h3>
          {fields.filter(field => domain.itens.includes(field.nome_campo)).map(field => <div id={`question-${field.nome_campo}`} key={field.id}>
            <AssessmentField campo={field} numero={fields.indexOf(field) + 1} valor={answers[field.nome_campo]} onChange={(key, value) => setAnswers(current => ({ ...current, [key]: value }))} />
          </div>)}
        </section>)}
      </fieldset>
      <Button type="submit" disabled={saving || uncertain}>{saving ? "Registrando…" : "Concluir avaliação"}</Button>
      {uncertain && <p>Use “Voltar ao prontuário” para consultar o estado persistido.</p>}
    </form>}
  </div></main>;
}
