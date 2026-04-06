import Button from "../components/ui/Button";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { criarRegistroDiario } from "../services/registros";

const OPCOES_SONO = [
  { value: 1, label: "1 - Muito ruim" },
  { value: 2, label: "2 - Ruim" },
  { value: 3, label: "3 - Regular" },
  { value: 4, label: "4 - Bom" },
  { value: 5, label: "5 - Muito bom" },
];

const OPCOES_BRISTOL = [
  { value: 1, label: "1 - Muito ressecado" },
  { value: 2, label: "2 - Ressecado" },
  { value: 3, label: "3 - Tendendo a ressecado" },
  { value: 4, label: "4 - Normal" },
  { value: 5, label: "5 - Tendendo a pastoso" },
  { value: 6, label: "6 - Pastoso" },
  { value: 7, label: "7 - Líquido" },
];

const OPCOES_IRRITABILIDADE = [
  { value: 0, label: "0 - Nenhuma" },
  { value: 1, label: "1 - Leve" },
  { value: 2, label: "2 - Moderada" },
  { value: 3, label: "3 - Alta" },
  { value: 4, label: "4 - Muito alta" },
];

const OPCOES_CRISE_SENSORIAL = [
  { value: 0, label: "0 - Não" },
  { value: 1, label: "1 - Sim" },
  { value: 2, label: "2 - Moderada" },
  { value: 3, label: "3 - Alta" },
];

export default function NovoRegistroDiario() {
  const { id } = useParams();
  const pacienteId = Number(id);
  const navigate = useNavigate();

  const hoje = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [form, setForm] = useState({
    data: hoje,
    sono_qualidade: "",
    evacuacao: false,
    consistencia_fezes: "",
    irritabilidade: "",
    crise_sensorial: "",
    alimentacao: "",
    observacao: "",
  });

  const [erro, setErro] = useState("");
  const [saving, setSaving] = useState(false);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErro("");
    setSaving(true);

    try {
      await criarRegistroDiario({
        paciente_id: pacienteId,
        data: form.data,
        sono_qualidade:
          form.sono_qualidade === "" ? null : Number(form.sono_qualidade),
        evacuacao: form.evacuacao,
        consistencia_fezes:
          form.consistencia_fezes === "" ? null : Number(form.consistencia_fezes),
        irritabilidade:
          form.irritabilidade === "" ? null : Number(form.irritabilidade),
        crise_sensorial:
          form.crise_sensorial === "" ? null : Number(form.crise_sensorial),
        alimentacao: form.alimentacao?.trim() || null,
        observacao: form.observacao?.trim() || null,
      });

      navigate(`/pacientes/${pacienteId}`);
    } catch (e2) {
      const msg =
        e2?.response?.data?.detail ||
        e2?.message ||
        "Falha ao salvar registro diário.";
      setErro(String(msg));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h2>Novo Registro Diário</h2>

      <form onSubmit={onSubmit}>
        <div style={{ marginTop: 12 }}>
          <label>Data</label>
          <input
            type="date"
            value={form.data}
            onChange={(e) => setField("data", e.target.value)}
            required
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Qualidade do sono</label>
          <select
            value={form.sono_qualidade}
            onChange={(e) => setField("sono_qualidade", e.target.value)}
            style={{ width: "100%", padding: 10 }}
          >
            <option value="">(não informado)</option>
            {OPCOES_SONO.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Evacuação</label>
          <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
            <label>
              <input
                type="radio"
                name="evacuacao"
                checked={form.evacuacao === true}
                onChange={() => setField("evacuacao", true)}
              />
              {" "}Sim
            </label>

            <label>
              <input
                type="radio"
                name="evacuacao"
                checked={form.evacuacao === false}
                onChange={() => setField("evacuacao", false)}
              />
              {" "}Não
            </label>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Consistência das fezes (Bristol)</label>
          <select
            value={form.consistencia_fezes}
            onChange={(e) => setField("consistencia_fezes", e.target.value)}
            style={{ width: "100%", padding: 10 }}
          >
            <option value="">(não informado)</option>
            {OPCOES_BRISTOL.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Irritabilidade</label>
          <select
            value={form.irritabilidade}
            onChange={(e) => setField("irritabilidade", e.target.value)}
            style={{ width: "100%", padding: 10 }}
          >
            <option value="">(não informado)</option>
            {OPCOES_IRRITABILIDADE.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Crise sensorial</label>
          <select
            value={form.crise_sensorial}
            onChange={(e) => setField("crise_sensorial", e.target.value)}
            style={{ width: "100%", padding: 10 }}
          >
            <option value="">(não informado)</option>
            {OPCOES_CRISE_SENSORIAL.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Tipo de alimentação</label>
          <textarea
            value={form.alimentacao}
            onChange={(e) => setField("alimentacao", e.target.value)}
            rows={3}
            placeholder="Ex.: Retirada de glúten e leite nas últimas 48h"
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Observação</label>
          <textarea
            value={form.observacao}
            onChange={(e) => setField("observacao", e.target.value)}
            rows={4}
            placeholder="Observações clínicas relevantes..."
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        {erro && <p style={{ color: "red", marginTop: 12 }}>{erro}</p>}

        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate(-1)}
            disabled={saving}
          >
            ← Voltar
          </Button>

          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar registro"}
          </Button>
        </div>

      </form>
    </div>
  );
}
