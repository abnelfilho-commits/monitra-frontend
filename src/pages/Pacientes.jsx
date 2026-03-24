import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listarPacientes } from "../services/pacientes";
import { getApiErrorMessage } from "../utils/errors";

function formatarDataBR(data) {
  if (!data) return "-";

  const [ano, mes, dia] = String(data).split("-");
  if (!ano || !mes || !dia) return data;

  return `${dia}/${mes}/${ano}`;
}

function formatarGenero(genero) {
  if (!genero) return "-";
  if (genero === "M") return "Masculino";
  if (genero === "F") return "Feminino";
  return genero;
}

export default function Pacientes() {
  const navigate = useNavigate();

  const [pacientes, setPacientes] = useState([]);
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setErro(null);
    try {
      setLoading(true);
      const data = await listarPacientes();
      setPacientes(Array.isArray(data) ? data : []);
    } catch (e) {
      setErro(getApiErrorMessage(e, "Falha ao carregar pacientes."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Pacientes</h2>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate("/pacientes/novo")}>
            + Novo Paciente
          </button>

          <button onClick={load} disabled={loading}>
            ↻ Atualizar
          </button>
        </div>
      </div>

      {loading && <p>Carregando...</p>}

      {erro && (
        <div style={{ background: "#fee2e2", padding: 12, borderRadius: 8, marginTop: 12 }}>
          {erro}
          <div style={{ marginTop: 10 }}>
            <button onClick={load}>Tentar novamente</button>
          </div>
        </div>
      )}

      {!loading && !erro && pacientes.length === 0 && (
        <p>Nenhum paciente cadastrado.</p>
      )}

      {!loading && !erro && pacientes.length > 0 && (
        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {pacientes.map((p) => (
            <div
              key={p.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{p.nome}</div>

                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Nasc.: {formatarDataBR(p.data_nascimento)}{" "}
                  {p.idade != null ? `• ${p.idade} anos` : ""}
                  {" • "}Gênero: {formatarGenero(p.genero)}
                </div>

                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Profissional: {p.profissional_nome || "-"} {" • "}
                  Clínica: {p.clinica_nome || "-"}
                </div>
              </div>

              <button onClick={() => navigate(`/pacientes/${p.id}`)}>Ver</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
