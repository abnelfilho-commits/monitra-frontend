import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listarClinicas } from "../services/clinicas";

export default function Clinicas() {
  const navigate = useNavigate();

  const [clinicas, setClinicas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  async function load() {
    setErro("");
    setLoading(true);

    try {
      const data = await listarClinicas();
      setClinicas(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Falha ao carregar clínicas.";
      setErro(String(msg));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Clínicas</h2>
          <p style={{ marginTop: 6, color: "#4b5563" }}>
            Gestão das clínicas monitoradas pela plataforma Monitra.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => navigate("/clinicas/nova")}>
            + Nova Clínica
          </button>
          <button onClick={load}>↻ Atualizar</button>
        </div>
      </div>

      {loading && <p style={{ marginTop: 16 }}>Carregando clínicas...</p>}

      {erro && <p style={{ color: "red", marginTop: 16 }}>{erro}</p>}

      {!loading && !erro && clinicas.length === 0 && (
        <p style={{ marginTop: 16 }}>Nenhuma clínica cadastrada.</p>
      )}

      {!loading && !erro && clinicas.length > 0 && (
        <div
          style={{
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 14,
          }}
        >
          {clinicas.map((c) => (
            <div
              key={c.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 16,
                background: "white",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 800 }}>{c.nome}</div>

              <div style={{ marginTop: 10, fontSize: 14, color: "#4b5563" }}>
                <div><b>CNPJ:</b> {c.cnpj || "-"}</div>
                <div style={{ marginTop: 4 }}><b>Email:</b> {c.email || "-"}</div>
                <div style={{ marginTop: 4 }}><b>Telefone:</b> {c.telefone || "-"}</div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button onClick={() => navigate(`/clinicas/${c.id}`)}>
                  Abrir
                </button>

                <button onClick={() => navigate(`/clinicas/${c.id}/editar`)}>
                  Editar
                </button>

                <button onClick={() => navigate(`/clinicas/${c.id}/mapa-risco`)}>
                  Mapa de Risco
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
