import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import api from "../../services/api";

export default function MapaRiscoCardiometabolico() {
  const navigate = useNavigate();

  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  async function carregar() {
    try {
      setLoading(true);
      setErro(null);

      const response = await api.get(
        "/cardiometabolico/mapa-risco"
      );

      setDados(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setErro("Falha ao carregar mapa de risco.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>
            Mapa de Risco Cardiometabólico
          </h2>

          <p style={{ color: "#64748b", marginTop: 6 }}>
            Visão territorial da carteira assistencial por clínica.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="secondary"
            onClick={() => navigate("/cardiometabolico")}
          >
            ← Voltar
          </Button>

          <Button variant="secondary" onClick={carregar}>
            Atualizar
          </Button>
        </div>
      </div>

      {loading && <p>Carregando mapa de risco...</p>}

      {erro && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 14,
            borderRadius: 12,
          }}
        >
          {erro}
        </div>
      )}

      {!loading && !erro && dados.length === 0 && (
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            padding: 18,
            borderRadius: 16,
          }}
        >
          Nenhum dado encontrado para o mapa de risco.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {dados.map((item) => {
          const total = item.total || 1;
          const percAlto = Math.round((item.alto / total) * 100);
          const percModerado = Math.round((item.moderado / total) * 100);
          const percBaixo = Math.round((item.baixo / total) * 100);

          return (
            <div
              key={item.clinica}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 20,
                padding: 20,
                boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 22 }}>
                {item.clinica}
              </h3>

              <p style={{ marginTop: 8, color: "#64748b" }}>
                {item.total} paciente(s) monitorado(s)
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                  marginTop: 18,
                }}
              >
                <MiniCard label="Alto" valor={item.alto} cor="#b91c1c" />
                <MiniCard label="Moderado" valor={item.moderado} cor="#92400e" />
                <MiniCard label="Baixo" valor={item.baixo} cor="#166534" />
              </div>

              <div style={{ marginTop: 18 }}>
                <div
                  style={{
                    display: "flex",
                    height: 14,
                    borderRadius: 999,
                    overflow: "hidden",
                    background: "#e5e7eb",
                  }}
                >
                  <div style={{ width: `${percAlto}%`, background: "#ef4444" }} />
                  <div style={{ width: `${percModerado}%`, background: "#f59e0b" }} />
                  <div style={{ width: `${percBaixo}%`, background: "#22c55e" }} />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 8,
                    fontSize: 12,
                    color: "#64748b",
                  }}
                >
                  <span>🔴 {percAlto}% alto</span>
                  <span>🟡 {percModerado}% mod.</span>
                  <span>🟢 {percBaixo}% baixo</span>
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  padding: 12,
                  borderRadius: 14,
                  background: item.score_medio >= 7 ? "#fef2f2" : "#f8fafc",
                  color: item.score_medio >= 7 ? "#991b1b" : "#334155",
                  fontWeight: 700,
                }}
              >
                Score médio da carteira: {item.score_medio}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniCard({ label, valor, cor }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        borderRadius: 14,
        padding: 12,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: cor }}>
        {valor || 0}
      </div>
    </div>
  );
}