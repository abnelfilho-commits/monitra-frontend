import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import ClinicalPageLayout from "../../components/clinical/ClinicalPageLayout";
import ClinicalSection from "../../components/clinical/ClinicalSection";
import ClinicalFooter from "../../components/clinical/ClinicalFooter";
import { jornadaMental, erroMental, registrarIntervencaoMental } from "../../services/saudeMental";
import "./IntervencaoMental.css";

export default function IntervencaoMental() {
  const { pessoaId, contextoId } = useParams();
  const [search] = useSearchParams();
  const institution = search.get("instituicao_id") || "";
  return <InterventionPage key={`${institution}:${pessoaId}:${contextoId}`} {...{ institution, pessoaId, contextoId }} />;
}

function InterventionPage({ institution, pessoaId, contextoId }) {
  const navigate = useNavigate();
  const back = `/saude-mental/pessoas/${pessoaId}/contextos/${contextoId}?instituicao_id=${encodeURIComponent(institution)}`;
  const [jornada, setJornada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
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
  const update = event => setValues(current => ({ ...current, [event.target.name]: event.target.value }));
  async function save(event) {
    event.preventDefault();
    if (saving || uncertain || jornada.intervencoes?.pode_registrar !== true) return;
    if (!values.tipo?.trim() || !values.descricao?.trim() || !values.data_intervencao || !Number.isFinite(new Date(values.data_intervencao).getTime())) {
      setError("Informe tipo, data e horário e descrição da intervenção."); return;
    }
    setSaving(true); setError("");
    try {
      await registrarIntervencaoMental(jornada.instituicao_id, jornada.pessoa_id, jornada.contexto_assistencial_id, {
        tipo: values.tipo.trim(), descricao: values.descricao.trim(),
        data_intervencao: new Date(values.data_intervencao).toISOString(),
      });
      if (mounted.current) { navigate(back, { replace: true, state: { interventionSaved: true } }); }
    } catch (e) {
      if (mounted.current) {
        const status = e?.response?.status;
        setError(({401: "Sua sessão expirou. Entre novamente.", 403: "Registro não autorizado neste contexto.", 422: "Revise os campos da intervenção."})[status] || "Não foi possível confirmar o registro. Atualize a jornada antes de tentar novamente.");
        setUncertain(![401, 403, 422].includes(status));
      }
    } finally { if (mounted.current) setSaving(false); }
  }
  if (loading) return <main style={styles.pagina}><p role="status" style={styles.loading}>Preparando o registro clínico…</p></main>;
  if (loadError || jornada?.intervencoes?.pode_registrar !== true) return <main style={styles.pagina}>
    <p role="alert" style={styles.erro}>{loadError || "Registro não autorizado neste contexto."}</p>
    <Button variant="secondary" onClick={() => navigate(back)}>Voltar ao prontuário</Button>
  </main>;
  const valid = values.tipo?.trim() && values.descricao?.trim() && values.data_intervencao;
  return <div className="mental-intervention"><ClinicalPageLayout
    titulo="💬 Registrar Intervenção" badge="Jornada Assistencial"
    subtitulo="Registre uma ação assistencial que passa a integrar a jornada clínica da Pessoa.">
    <section className="mental-intervention__identity">
      <span aria-hidden="true">👤</span><div><small>Pessoa</small>
        <h2>{jornada.nome_social || jornada.nome_completo}</h2>
        <p>{jornada.instituicao_nome} · Contexto #{jornada.contexto_assistencial_id} · Saúde Mental</p>
      </div>
    </section>
    {error && <div role="alert" style={styles.erro}>{error}</div>}
    <form onSubmit={save}>
      <fieldset disabled={saving || uncertain} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <ClinicalSection numero={1} titulo="Qual intervenção foi realizada?" descricao="Identifique o tipo de intervenção realizada neste momento do cuidado.">
          <div className="mental-intervention__grid">
            <label><span>Tipo de intervenção *</span><input name="tipo" value={values.tipo || ""} onChange={update} maxLength={100} required />
              <small>Informe a abordagem ou natureza da intervenção.</small></label>
            <label><span>Data e horário *</span><input name="data_intervencao" type="datetime-local" value={values.data_intervencao || ""} onChange={update} required />
              <small>Momento em que a intervenção foi realizada, no horário local.</small></label>
          </div>
        </ClinicalSection>
        <ClinicalSection numero={2} titulo="O que foi realizado?" descricao="Registre de forma objetiva a ação realizada e os aspectos relevantes observados.">
          <label><span>Descrição da intervenção *</span><textarea name="descricao" value={values.descricao || ""} onChange={update} rows={9} maxLength={4000} required /></label>
          <small>{(values.descricao || "").length}/4000 · Registre apenas o necessário para que outro profissional compreenda esta intervenção.</small>
        </ClinicalSection>
        <ClinicalSection numero={3} titulo="Contexto do registro" descricao="Estas informações acompanham a intervenção na jornada clínica.">
          <div className="mental-intervention__grid">
            <div className="mental-intervention__context"><small>Pessoa</small><strong>{jornada.nome_social || jornada.nome_completo}</strong></div>
            <div className="mental-intervention__context"><small>Destino</small><strong>Jornada Saúde Mental · {jornada.instituicao_nome}</strong></div>
            <div className="mental-intervention__context"><small>Profissional registrador</small><strong>Identificado pela sessão autenticada</strong></div>
          </div>
        </ClinicalSection>
      </fieldset>
      <ClinicalFooter loading={saving} disabled={!valid || uncertain} onCancel={() => navigate(back)} submitLabel="💬 Registrar Intervenção">
        <span aria-hidden="true">↗</span><div><strong>Depois de registrar</strong>
          <p>A intervenção passará a integrar o histórico assistencial e a Timeline da Pessoa.</p>
        </div>
      </ClinicalFooter>
      {uncertain && <Button type="button" onClick={() => navigate(back)}>Consultar jornada antes de tentar novamente</Button>}
    </form>
  </ClinicalPageLayout></div>;
}
const styles = {
  pagina: { padding: "28px 24px", background: "#f8fafc" },
  loading: { color: "#475569" },
  erro: { padding: 15, marginBottom: 18, border: "1px solid #fecaca", borderRadius: 14, background: "#fef2f2", color: "#991b1b" },
};
