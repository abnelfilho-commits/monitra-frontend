import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  obterRegistroLongitudinal,
  atualizarRegistroLongitudinal,
} from "../services/registros"; "../services/registros";

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

export default function EditarRegistroDiario() {
  const { id, registroId } = useParams();
  const pacienteId = Number(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    data: "",
    sono_qualidade: "",
    evacuacao: false,
    consistencia_fezes: "",
    irritabilidade: "",
    crise_sensorial: "",
    tempo_tela: "",
    seletividade_alimentar: "",
    aceitou_alimento_novo: false,
    observacao: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function load() {
    setErro("");
    setLoading(true);
    try {
      const r = await obterRegistroLongitudinal(registroId);
      const respostas = r.respostas || {};

      setForm({
        data: r?.data_registro || "",
        sono_qualidade: respostas.sono_qualidade ?? "",
        evacuacao: respostas.evacuacao ?? false,
        consistencia_fezes: respostas.consistencia_fezes ?? "",
        irritabilidade: respostas.irritabilidade ?? "",
        crise_sensorial: respostas.crise_sensorial ?? "",
        tempo_tela: respostas.tempo_tela ?? "",
        seletividade_alimentar: respostas.seletividade_alimentar ?? "",
        aceitou_alimento_novo: respostas.aceitou_alimento_novo ?? false,
        observacao: respostas.observacao ?? "",
      });
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Falha ao carregar registro diário.";
      setErro(String(msg));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!registroId) return;
    load();
  }, [registroId]);

  async function onSubmit(e) {
    e.preventDefault();
    setErro("");
    setSaving(true);

    try {
      await atualizarRegistroLongitudinal(registroId, {
        paciente_id: pacienteId,
        modulo_id: 1,
        formulario_id: 2,
        data_registro: form.data,
        origem: "PROFISSIONAL",
        respostas: [
          { campo_id: 34, valor: form.sono_qualidade === "" ? null : Number(form.sono_qualidade) },

          { campo_id: 41, valor: form.evacuacao },

          { campo_id: 42, valor: form.consistencia_fezes === "" ? null : Number(form.consistencia_fezes) },

          { campo_id: 35, valor: form.irritabilidade === "" ? null : Number(form.irritabilidade) },

          { campo_id: 36, valor: form.crise_sensorial === "" ? null : Number(form.crise_sensorial) },

          { campo_id: 37, valor: form.tempo_tela || null },

          { campo_id: 38, valor: form.seletividade_alimentar || null },

          { campo_id: 39, valor: form.aceitou_alimento_novo },

          { campo_id: 40, valor: form.observacao?.trim() || null },
        ]
      });

      console.log("PAYLOAD PATCH:", payload);

      await atualizarRegistroLongitudinal(registroId, payload);

      navigate(`/pacientes/${pacienteId}`);
    } catch (e2) {
      const msg =
        e2?.response?.data?.detail ||
        e2?.message ||
        "Falha ao atualizar registro diário.";
      setErro(String(msg));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Carregando registro...</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h2>Editar Registro Diário</h2>

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

        <label>Tempo de tela</label>
        <select
          value={form.tempo_tela}
          onChange={(e) => setField("tempo_tela", e.target.value)}
          style={{ width: "100%", padding: 10 }}
        >
          <option value="">Selecione</option>
          <option value="MENOS_1H">Menos de 1 hora</option>
          <option value="1_2H">1 a 2 horas</option>
          <option value="2_4H">2 a 4 horas</option>
          <option value="MAIS_4H">Mais de 4 horas</option>
        </select>

        <label>Seletividade alimentar</label>
        <select
          value={form.seletividade_alimentar}
          onChange={(e) => setField("seletividade_alimentar", e.target.value)}
          style={{ width: "100%", padding: 10 }}
        >
          <option value="">Selecione</option>
          <option value="NENHUMA">Nenhuma</option>
          <option value="LEVE">Leve</option>
          <option value="MODERADA">Moderada</option>
          <option value="GRAVE">Grave</option>
        </select>

        <label>
          <input
            type="checkbox"
            checked={form.aceitou_alimento_novo}
            onChange={(e) => setField("aceitou_alimento_novo", e.target.checked)}
          />
          Aceitou novo alimento
        </label>

        <div style={{ marginTop: 12 }}>
          <label>Observações clínicas (opcional)</label>
          <textarea
            value={form.observacao}
            onChange={(e) => setField("observacao", e.target.value)}
            rows={4}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        {erro && <p style={{ color: "red", marginTop: 12 }}>{erro}</p>}

        <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={saving}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ← Voltar
          </button>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
