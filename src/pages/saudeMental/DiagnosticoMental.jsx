import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import ClinicalSection from "../../components/clinical/ClinicalSection";
import ClinicalEventTypeCards from "../../components/clinical/ClinicalEventTypeCards";
import ClinicalFooter from "../../components/clinical/ClinicalFooter";
import { jornadaMental, erroMental, registrarDiagnosticoMental } from "../../services/saudeMental";
import "./DiagnosticoMental.css";

const TIPOS_DIAGNOSTICO = [
  {
    valor: "HIPOTESE",
    icone: "🟡",
    titulo: "Hipótese",
    descricao: "Registre uma possibilidade clínica que ainda será investigada.",
    cor: "#ca8a04",
    fundo: "#fefce8",
    borda: "#fde68a",
  },
  {
    valor: "DIAGNOSTICO",
    icone: "🟢",
    titulo: "Diagnóstico",
    descricao: "Registre uma conclusão clínica estabelecida para a Pessoa.",
    cor: "#15803d",
    fundo: "#f0fdf4",
    borda: "#bbf7d0",
  },
  {
    valor: "REVISAO",
    icone: "🔵",
    titulo: "Revisão",
    descricao: "Atualize ou reavalie um diagnóstico já registrado na jornada.",
    cor: "#1d4ed8",
    fundo: "#eff6ff",
    borda: "#bfdbfe",
  },
];

export default function DiagnosticoMental() {
  const { pessoaId, contextoId } = useParams();
  const [search] = useSearchParams();
  const institution = search.get("instituicao_id") || "";
  return <DiagnosisPage key={`${institution}:${pessoaId}:${contextoId}`} {...{ institution, pessoaId, contextoId }} />;
}

function DiagnosisPage({ institution, pessoaId, contextoId }) {
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
    if (saving || uncertain || jornada.diagnosticos?.pode_registrar !== true) return;
    if (!values.tipo || !values.data_diagnostico || (values.descricao_clinica || "").trim().length < 3 || (values.medico_nome || "").trim().length < 3) {
      setError("Informe tipo, data, descrição clínica e nome do médico."); return;
    }
    setSaving(true); setError("");
    try {
      await registrarDiagnosticoMental(jornada.instituicao_id, jornada.pessoa_id, jornada.contexto_assistencial_id, {
        ...values, descricao_clinica: values.descricao_clinica.trim(), medico_nome: values.medico_nome.trim(),
      });
      if (mounted.current) { navigate(back, { replace: true, state: { diagnosisSaved: true } }); }
    } catch (e) {
      if (mounted.current) {
        const status = e?.response?.status;
        setError(({401: "Sua sessão expirou. Entre novamente.", 403: "Registro não autorizado neste contexto.", 422: "Revise os campos do diagnóstico."})[status] || "Não foi possível confirmar o registro. Atualize a jornada antes de tentar novamente.");
        setUncertain(![401, 403, 422].includes(status));
      }
    } finally { if (mounted.current) setSaving(false); }
  }
  if (loading) return <main style={styles.pagina}><p role="status" style={styles.loading}>Preparando o registro clínico…</p></main>;
  if (loadError || jornada?.diagnosticos?.pode_registrar !== true) return <main style={styles.pagina}>
    <p role="alert" style={styles.erro}>{loadError || "Registro não autorizado neste contexto."}</p>
    <Button variant="secondary" onClick={() => navigate(back)}>Voltar ao prontuário</Button>
  </main>;
  const valid = values.tipo && values.data_diagnostico && values.descricao_clinica?.trim().length >= 3 && values.medico_nome?.trim().length >= 3;
  const field = (name, label, extra = {}) => <label style={styles.campo}><span style={styles.label}>{label}</span>
    <input name={name} value={values[name] || ""} onChange={update} style={styles.input} {...extra} /></label>;
  return <main className="mental-diagnosis" style={styles.pagina}><div style={styles.conteudo}>
    <header style={styles.cabecalho}><div>
      <div style={styles.sobretitulo}>REGISTRO CLÍNICO INTELIGENTE</div>
      <h1 style={styles.titulo}>🩺 Registrar Diagnóstico</h1>
      <p style={styles.subtitulo}>Registre um novo marco na jornada clínica da Pessoa.</p>
    </div><div style={styles.etapa}>Jornada Assistencial</div></header>
    <section className="mental-diagnosis__identity">
      <span aria-hidden="true" className="mental-diagnosis__avatar">👤</span><div>
        <div style={styles.rotuloContexto}>Pessoa</div>
        <h2>{jornada.nome_social || jornada.nome_completo}</h2>
        <p>{jornada.instituicao_nome} · Contexto #{jornada.contexto_assistencial_id} · Saúde Mental</p>
      </div>
    </section>
    {error && <div role="alert" style={styles.erro}>{error}</div>}
    <form onSubmit={save}>
      <fieldset disabled={saving || uncertain} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <ClinicalSection numero={1} titulo="Qual evento clínico está sendo registrado?" descricao="Escolha o tipo que melhor representa este momento da jornada.">
          <ClinicalEventTypeCards items={TIPOS_DIAGNOSTICO} value={values.tipo} onChange={tipo => setValues(current => ({ ...current, tipo }))} />
        </ClinicalSection>
        <ClinicalSection numero={2} titulo="Informações clínicas" descricao="Descreva o que foi identificado neste momento do cuidado.">
          {field("cid", "CID", { maxLength: 20, placeholder: "Código CID (opcional)" })}
          <label style={{ ...styles.campo, marginTop: 18 }}><span style={styles.label}>Descrição clínica *</span>
            <textarea name="descricao_clinica" value={values.descricao_clinica || ""} onChange={update} rows={6} minLength={3} required style={styles.textarea} />
          </label>
        </ClinicalSection>
        <ClinicalSection numero={3} titulo="Contexto Assistencial" descricao="Informações que acompanham este evento clínico.">
          <div className="mental-diagnosis__context" style={styles.gradeContexto}>
            <div style={styles.cardContexto}>{field("data_diagnostico", "Data do diagnóstico", { type: "date", required: true })}</div>
            <div style={styles.cardContexto}><span style={styles.iconeContexto}>🧑‍⚕️</span><div>
              <div style={styles.rotuloContexto}>Profissional registrador</div>
              <div style={styles.valorContexto}>Identificado pela sessão autenticada</div>
            </div></div>
          </div>
          <div style={{ marginTop: 18 }}>
            {field("medico_nome", "Nome do médico relacionado ao diagnóstico *", { minLength: 3, maxLength: 200, required: true })}
            <p style={styles.ajuda}>Informação clínica exigida pelo registro. Não substitui a autoria autenticada.</p>
            <details><summary>Informações complementares do médico (opcional)</summary><div style={{ ...styles.gradeCampos, marginTop: 12 }}>
              {field("medico_especialidade", "Especialidade", { maxLength: 150 })}
              {field("medico_crm", "CRM", { maxLength: 50 })}
            </div></details>
          </div>
          <label style={{ ...styles.campo, marginTop: 18 }}><span style={styles.label}>Observações</span>
            <textarea name="observacoes" value={values.observacoes || ""} onChange={update} rows={4} style={styles.textarea} />
          </label>
        </ClinicalSection>
      </fieldset>
      <ClinicalFooter loading={saving} disabled={!valid || uncertain} onCancel={() => navigate(back)} submitLabel="🩺 Registrar Diagnóstico">
        <span style={{ fontSize: 20 }}>↗</span><div><strong>Depois de registrar</strong>
          <div style={styles.destinoTexto}>Você retornará ao prontuário desta Pessoa, com o diagnóstico na Timeline Clínica do mesmo contexto.</div>
        </div>
      </ClinicalFooter>
      {uncertain && <Button type="button" onClick={() => navigate(back)}>Consultar jornada antes de tentar novamente</Button>}
    </form>
  </div></main>;
}

// Same visual tokens as RegistrarDiagnostico; no legacy data dependencies.
const styles = {
  pagina: {
    minHeight: "100%",
    padding: "28px 24px 48px",
    background: "#f8fafc",
  },
  conteudo: {
    width: "100%",
    maxWidth: 1180,
    margin: "0 auto",
  },
  loading: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: 18,
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    background: "#ffffff",
    color: "#475569",
  },
  cabecalho: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 20,
  },
  sobretitulo: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.8,
    color: "#2563eb",
  },
  titulo: {
    margin: "6px 0 0",
    color: "#0f172a",
    fontSize: "clamp(28px, 4vw, 40px)",
    lineHeight: 1.15,
  },
  subtitulo: {
    margin: "10px 0 0",
    color: "#64748b",
    fontSize: 16,
  },
  etapa: {
    padding: "9px 14px",
    borderRadius: 999,
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: 800,
  },
  erro: {
    marginBottom: 18,
    padding: 15,
    border: "1px solid #fecaca",
    borderRadius: 14,
    background: "#fef2f2",
    color: "#991b1b",
  },
  gradeCampos: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
  },
  campo: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: 800,
    color: "#334155",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    outline: "none",
    fontSize: 15,
    color: "#0f172a",
    background: "#ffffff",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px 28px",
    border: "1px solid #cbd5e1",
    borderRadius: 13,
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    fontSize: 15,
    lineHeight: 1.55,
    color: "#0f172a",
    background: "#ffffff",
  },
  ajuda: {
    color: "#94a3b8",
    fontSize: 12,
  },
  gradeContexto: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 14,
  },
  cardContexto: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 15,
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    background: "#f8fafc",
  },
  iconeContexto: {
    fontSize: 24,
  },
  rotuloContexto: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 700,
  },
  valorContexto: {
    marginTop: 3,
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 850,
  },
  destinoTexto: {
    marginTop: 4,
    color: "#475569",
    fontSize: 13,
    lineHeight: 1.5,
  },
};
