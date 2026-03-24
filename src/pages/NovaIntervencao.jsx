import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { criarIntervencao } from "../services/intervencoes";

function toLocalDatetimeInputValue(date = new Date()) {
  // yyyy-MM-ddTHH:mm  (input datetime-local)
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function NovaIntervencao() {
  const { id } = useParams();
  const pacienteId = Number(id);
  const navigate = useNavigate();

  const agora = useMemo(() => toLocalDatetimeInputValue(new Date()), []);

  const [tipo, setTipo] = useState("ABA");
  const [descricao, setDescricao] = useState("");
  const [dataHora, setDataHora] = useState(agora);

  const [erro, setErro] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErro("");
    setSaving(true);

    try {
      // Importante: o backend espera date-time ISO.
      // datetime-local retorna "YYYY-MM-DDTHH:mm" (sem timezone).
      // Vamos enviar como "YYYY-MM-DDTHH:mm:00"
      const iso = dataHora.length === 16 ? `${dataHora}:00` : dataHora;

      await criarIntervencao({
        paciente_id: pacienteId,
        tipo,
        descricao: descricao?.trim() ? descricao.trim() : null,
        data_intervencao: iso,
      });

      // volta para a tela do paciente (hub) ou timeline, ajuste conforme seu app
      navigate(`/pacientes/${pacienteId}`);
    } catch (e2) {
      const msg =
        e2?.response?.data?.detail ||
        e2?.message ||
        "Falha ao salvar intervenção.";
      setErro(String(msg));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h2>Nova Intervenção</h2>

      <form onSubmit={onSubmit}>
        <div style={{ marginTop: 12 }}>
          <label>Tipo</label>
          <input
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            placeholder="Ex.: ABA, TO, Fono..."
            required
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Data/Hora</label>
          <input
            type="datetime-local"
            value={dataHora}
            onChange={(e) => setDataHora(e.target.value)}
            required
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Descrição (opcional)</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={4}
            placeholder="Resumo clínico da sessão..."
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        {erro && <p style={{ color: "red", marginTop: 12 }}>{erro}</p>}

        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          <button type="button" onClick={() => navigate(-1)} disabled={saving}>
            Voltar
          </button>

          <button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar intervenção"}
          </button>
        </div>
      </form>
    </div>
  );
}
