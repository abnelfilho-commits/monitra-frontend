import { useRef, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ClinicalPageLayout from "../../components/clinical/ClinicalPageLayout";
import ClinicalSection from "../../components/clinical/ClinicalSection";
import ClinicalFooter from "../../components/clinical/ClinicalFooter";
import Button from "../../components/ui/Button";
import { jornadaMental, erroMental, registrarCheckin, erroCheckin } from "../../services/saudeMental";
import "./CheckinBemEstar.css";

export default function CheckinBemEstar() {
  const { pessoaId, contextoId } = useParams();
  const [search] = useSearchParams();
  const institution = search.get("instituicao_id") || "";
  return <CheckinPage key={`${institution}:${pessoaId}:${contextoId}`} {...{ institution, pessoaId, contextoId }} />;
}

function CheckinPage({ institution, pessoaId, contextoId }) {
  const navigate = useNavigate();
  const back = `/saude-mental/pessoas/${pessoaId}/contextos/${contextoId}?instituicao_id=${encodeURIComponent(institution)}`;
  const [jornada, setJornada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    async function load() {
      try {
        if (!institution) throw { response: { status: 422 } };
        const result = await jornadaMental(institution, pessoaId, contextoId);
        if (mounted.current) setJornada(result);
      } catch (e) { if (mounted.current) setLoadError(erroMental(e)); }
      finally { if (mounted.current) setLoading(false); }
    }
    load();
    return () => { mounted.current = false; };
  }, [institution, pessoaId, contextoId]);
  const data = jornada?.bem_estar;
  const fields = data?.formulario?.campos || [];
  const canWrite = data?.pode_registrar === true && fields.length > 0;
  const checkins = data?.checkins || [];
  const update = (name, value) => setAnswers(previous => ({ ...previous, [name]: value, ...(name === "evento_relevante" && value === "NAO" ? { evento_descricao: "" } : {}) }));
  async function submit(event) {
    event.preventDefault();
    if (saving || uncertain || !canWrite) return;
    if (fields.some(f => f.obrigatorio && !answers[f.nome_campo])) { setError("Responda todas as perguntas obrigatórias."); return; }
    setSaving(true); setError("");
    try {
      await registrarCheckin(jornada.instituicao_id, jornada.pessoa_id, jornada.contexto_assistencial_id, {
        paciente_id: jornada.paciente_id, modulo_id: jornada.modulo_id, formulario_id: data.formulario.id, respostas: answers,
      });
      if (mounted.current) { navigate(back, { replace: true, state: { checkinSaved: true } }); }
    } catch (e) {
      if (mounted.current) {
        setError(erroCheckin(e));
        // Never automatically repeat a write whose completion could be uncertain.
        setUncertain(![401, 403, 422, 503].includes(e?.response?.status));
      }
    } finally { if (mounted.current) setSaving(false); }
  }
  return <div className="mental-checkin"><ClinicalPageLayout
    titulo="Check-in de Bem-Estar"
    subtitulo="Registre a percepção da Pessoa e mantenha sua jornada assistencial atualizada."
    badge="Jornada Assistencial">
    {loading ? <p role="status">Preparando o Check-in…</p> : loadError || !canWrite ? <>
      <p role="alert">{loadError || "Registro indisponível: é necessário contexto aberto, linha ativa e autorização para registrar."}</p>
      <Button variant="secondary" onClick={() => navigate(back)}>Voltar ao prontuário</Button>
    </> : <>
      <section className="mental-checkin__identity">
        <span className="mental-checkin__avatar" aria-hidden="true">👤</span>
        <div><span className="mental-checkin__label">Pessoa</span>
          <h2>{jornada.nome_social || jornada.nome_completo}</h2>
          <p>{jornada.instituicao_nome} · Contexto #{jornada.contexto_assistencial_id} · Saúde Mental</p>
        </div>
        <span className="mental-checkin__badge">✓ Identificada pela jornada</span>
      </section>
      <section className="mental-checkin__notice">
        <h2>{checkins.length === 0 ? "Check-in Inicial" : "Check-in de Bem-Estar — Acompanhamento"} — {jornada.nome_social || jornada.nome_completo}</h2>
        <p>Modalidade assistida · Portal Profissional</p>
        <p>Respondente: {jornada.nome_social || jornada.nome_completo}. Profissional registrador identificado pela sessão autenticada.</p>
        <p>As respostas devem refletir a percepção da própria pessoa. O profissional está apenas auxiliando no registro.</p>
        <p>Este Check-in não é um instrumento diagnóstico nem um canal de emergência.</p>
      </section>
      <form onSubmit={submit}>
        <fieldset disabled={saving || uncertain} className="mental-checkin__fields">
          {fields.filter(f => f.tipo_campo !== "textarea").map((f, index) => <ClinicalSection key={f.id} numero={index + 1} titulo={f.label}>
            <div role="radiogroup" aria-label={f.label} aria-required={f.obrigatorio} className="mental-checkin__options">
              {f.opcoes?.map(option => <label key={option.valor} className={`mental-checkin__option${answers[f.nome_campo] === option.valor ? " is-selected" : ""}`}>
                <input type="radio" name={f.nome_campo} value={option.valor} checked={answers[f.nome_campo] === option.valor} onChange={e => update(f.nome_campo, e.target.value)} />
                {option.label}
              </label>)}
            </div>
            {f.nome_campo === "evento_relevante" && answers.evento_relevante === "SIM" && <label className="mental-checkin__description">Descrição do evento (opcional)
              <textarea name="evento_descricao" maxLength={2000} value={answers.evento_descricao || ""} onChange={e => update("evento_descricao", e.target.value)} rows={4} />
            </label>}
          </ClinicalSection>)}
        </fieldset>
        {error && <p role="alert" className="mental-checkin__error">{error}</p>}
        {saving && <p role="status">Salvando Check-in…</p>}
        <ClinicalFooter loading={saving} disabled={uncertain} onCancel={() => navigate(back)} submitLabel="Salvar Check-in">
          <span aria-hidden="true">↗</span><div><strong>Depois de registrar</strong><p>Você retornará ao prontuário desta Pessoa, com a jornada atualizada no mesmo contexto.</p></div>
        </ClinicalFooter>
        {uncertain && <Button type="button" onClick={() => navigate(back)}>Consultar jornada antes de tentar novamente</Button>}
      </form>
    </>}
  </ClinicalPageLayout></div>;
}
