import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listarClinicas } from "../services/clinicas";
import Button from "../components/ui/Button";

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
    <div
      style={{
        padding: 24,
        maxWidth: 1220,
        margin: "0 auto",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "flex-start",
          marginBottom: 8,
        }}
      >
        <div style={{ flex: "1 1 320px", minWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Button variant="secondary" onClick={() => navigate("/dashboard")}>
              ← Voltar
            </Button>

            <div>
              <h2 style={{ margin: 0 }}>Clínicas</h2>
              <p style={{ marginTop: 4, color: "#4b5563" }}>
                Gestão das clínicas monitoradas pela plataforma Monitra.
              </p>
            </div>
          </div>
        </div>

        <div style={{ flex: "1 1 320px", minWidth: 260 }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <Button onClick={() => navigate("/clinicas/nova")}>
              + Nova Clínica
            </Button>

            <Button variant="secondary" onClick={load}>
              ↻ Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            color: "#475467",
          }}
        >
          Carregando clínicas...
        </div>
      )}

      {/* ERRO */}
      {erro && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #fecaca",
            padding: 14,
            borderRadius: 12,
            marginTop: 16,
            color: "#991b1b",
          }}
        >
          <div>{erro}</div>

          <div style={{ marginTop: 10 }}>
            <Button variant="secondary" onClick={load}>
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {/* VAZIO */}
      {!loading && !erro && clinicas.length === 0 && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            color: "#475467",
          }}
        >
          Nenhuma clínica cadastrada.
        </div>
      )}

      {/* LISTA */}
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
                background: "#fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
                {c.nome}
              </div>

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
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/clinicas/${c.id}`)}
                >
                  Abrir
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => navigate(`/clinicas/${c.id}/editar`)}
                >
                  Editar
                </Button>

                <Button
                  onClick={() => navigate(`/clinicas/${c.id}/mapa-risco`)}
                >
                  Mapa de Risco
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
