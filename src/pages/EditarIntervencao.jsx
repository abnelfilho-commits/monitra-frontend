import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  obterIntervencao,
  atualizarIntervencao,
} from "../services/intervencoes";

function toDatetimeLocalValue(value) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");

  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function EditarIntervencao() {
  const { id, intervencaoId } = useParams();
  const pacienteId = Number(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    tipo: "",
    descricao: "",
    data_intervencao: "",
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
      const i = await obterIntervencao(intervencaoId);

      setForm({
        tipo: i?.tipo || "",
        descricao: i?.descricao || "",
        data_intervencao: toDatetimeLocalValue(i?.data_intervencao),
      });
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Falha ao carregar intervenção.";
      setErro(String(msg));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!intervencaoId) return;
    load();
  }, [intervencaoId]);

  async function onSubmit(e) {
    e.preventDefault();
    setErro("");
    setSaving(true);

    try {
      const dataHora =
        form.data_intervencao.length === 16
          ? `${form.data_intervencao}:00`
          : form.data_intervencao;

      await atualizarIntervencao(intervencaoId, {
        paciente_id: pacienteId,
        tipo: form.tipo.trim(),
        descricao: form.descricao?.trim() || null,
        data_intervencao: dataHora,
      });

      navigate(`/pacientes/${pacienteId}`);
    } catch (e2) {
      const msg =
        e2?.response?.data?.detail ||
        e2?.message ||
        "Falha ao atualizar intervenção.";
      setErro(String(msg));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Carregando intervenção...</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h2>Editar Intervenção</h2>

      <form onSubmit={onSubmit}>
        <div style={{ marginTop: 12 }}>
          <label>Tipo</label>
          <input
            value={form.tipo}
            onChange={(e) => setField("tipo", e.target.value)}
            required
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Data/Hora</label>
          <input
            type="datetime-local"
            value={form.data_intervencao}
            onChange={(e) => setField("data_intervencao", e.target.value)}
            required
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Descrição</label>
          <textarea
            value={form.descricao}
            onChange={(e) => setField("descricao", e.target.value)}
            rows={4}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        {erro && <p style={{ color: "red", marginTop: 12 }}>{erro}</p>}

        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          <button type="button" onClick={() => navigate(-1)} disabled={saving}>
            Voltar
          </button>

          <button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
