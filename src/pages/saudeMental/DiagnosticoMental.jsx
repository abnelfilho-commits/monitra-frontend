import { useEffect, useRef, useState } from "react";
import Button from "../../components/ui/Button";
import ClinicalSection from "../../components/clinical/ClinicalSection";
import { registrarDiagnosticoMental } from "../../services/saudeMental";

export default function DiagnosticoMental({ jornada, open, setOpen, onSaved }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const form = useRef(null);
  useEffect(() => { if (open) form.current?.scrollIntoView({ block: "start" }); }, [open]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
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
      if (mounted.current) { setOpen(false); setValues({}); onSaved("Diagnóstico registrado com sucesso."); }
    } catch (e) {
      if (mounted.current) {
        const status = e?.response?.status;
        setError(({401: "Sua sessão expirou. Entre novamente.", 403: "Registro não autorizado neste contexto.", 422: "Revise os campos do diagnóstico."})[status] || "Não foi possível confirmar o registro. Atualize a jornada antes de tentar novamente.");
        setUncertain(![401, 403, 422].includes(status));
      }
    } finally { if (mounted.current) setSaving(false); }
  }
  if (!open) return null;
  return <ClinicalSection titulo="Registrar Diagnóstico">
    <p>{jornada.nome_social || jornada.nome_completo} · {jornada.instituicao_nome} · Saúde Mental</p>
    <p>Registro profissional. Hipótese e rastreio não equivalem a diagnóstico confirmado.</p>
    <form ref={form} onSubmit={save}>
      <fieldset disabled={saving || uncertain} style={{ border: 0, padding: 0, display: "grid", gap: 12 }}>
        <label>Tipo<select aria-label="Tipo" name="tipo" value={values.tipo || ""} onChange={update} required>
          <option value="">Selecione</option><option value="HIPOTESE">Hipótese</option><option value="DIAGNOSTICO">Diagnóstico</option><option value="REVISAO">Revisão</option>
        </select></label>
        <label>Data do diagnóstico<input type="date" name="data_diagnostico" value={values.data_diagnostico || ""} onChange={update} required /></label>
        <label>Descrição clínica<textarea name="descricao_clinica" value={values.descricao_clinica || ""} onChange={update} minLength={3} required style={{ display: "block", width: "100%" }} /></label>
        <label>CID (opcional)<input name="cid" maxLength={20} value={values.cid || ""} onChange={update} /></label>
        <label>Nome do médico<input name="medico_nome" minLength={3} maxLength={200} value={values.medico_nome || ""} onChange={update} required /></label>
        <label>Especialidade (opcional)<input name="medico_especialidade" maxLength={150} value={values.medico_especialidade || ""} onChange={update} /></label>
        <label>CRM (opcional)<input name="medico_crm" maxLength={50} value={values.medico_crm || ""} onChange={update} /></label>
        <label>Observações (opcional)<textarea name="observacoes" value={values.observacoes || ""} onChange={update} style={{ display: "block", width: "100%" }} /></label>
      </fieldset>
      <p>A conta e o profissional registradores são identificados automaticamente pela sessão.</p>
      {error && <p role="alert">{error}</p>}
      {saving && <p role="status">Salvando diagnóstico…</p>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button type="submit" disabled={saving || uncertain}>Salvar diagnóstico</Button>
        <Button type="button" variant="secondary" disabled={saving} onClick={() => setOpen(false)}>Cancelar</Button>
        {uncertain && <Button type="button" onClick={() => window.location.reload()}>Atualizar jornada</Button>}
      </div>
    </form>
  </ClinicalSection>;
}
