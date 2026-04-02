import { useEffect, useState } from "react";
import {
  listarResponsaveis,
  vincularResponsavelPaciente,
} from "../services/responsaveis";

export default function VincularResponsavelModal({
  aberto,
  pacienteId,
  onClose,
  onSuccess,
}) {
  const [responsaveis, setResponsaveis] = useState([]);
  const [responsavelId, setResponsavelId] = useState("");
  const [parentesco, setParentesco] = useState("Responsável");
  const [principal, setPrincipal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!aberto) return;

    async function carregar() {
      try {
        setLoading(true);
        setErro("");
        const data = await listarResponsaveis();
        setResponsaveis(Array.isArray(data) ? data : []);
      } catch (err) {
        setErro("Não foi possível carregar os responsáveis.");
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [aberto]);

  if (!aberto) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");

    try {
      setSalvando(true);

      await vincularResponsavelPaciente({
        responsavel_id: Number(responsavelId),
        paciente_id: Number(pacienteId),
        parentesco,
        principal,
      });

      onSuccess?.();
      onClose?.();
    } catch (err) {
      setErro(
        err?.response?.data?.detail || "Não foi possível criar o vínculo."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h2>Vincular responsável</h2>

        {loading ? (
          <p>Carregando responsáveis...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>
              Responsável
              <select
                value={responsavelId}
                onChange={(e) => setResponsavelId(e.target.value)}
                required
              >
                <option value="">Selecione</option>
                {responsaveis.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome} — {r.email}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Parentesco
              <input
                value={parentesco}
                onChange={(e) => setParentesco(e.target.value)}
                required
              />
            </label>

            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={principal}
                onChange={(e) => setPrincipal(e.target.checked)}
              />
              Responsável principal
            </label>

            {erro ? <p className="erro">{erro}</p> : null}

            <div className="acoes">
              <button type="button" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Vincular"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
