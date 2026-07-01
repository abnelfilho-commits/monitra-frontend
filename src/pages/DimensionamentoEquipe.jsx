import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";

export default function DimensionamentoEquipe() {
  const [dados, setDados] = useState([]);
  const [capacidade, setCapacidade] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  const isCardio = searchParams.get("modulo") === "cardiometabolico";

  useEffect(() => {
    carregarDados();
  }, [isCardio]);

  const carregarDados = async () => {
    try {
        const moduloId = isCardio ? 2 : 1;

        const dimensionamentoResponse = await api.get(
          `/dimensionamento/ocupacoes?modulo_id=${moduloId}`
        );

        setDados(
          Array.isArray(dimensionamentoResponse.data)
            ? dimensionamentoResponse.data
            : []
        );

        try {
          const capacidadeResponse = await api.get(
            `/capacidade-instalada/demanda-capacidade?modulo_id=${moduloId}`
          );

          setCapacidade(
            Array.isArray(capacidadeResponse.data)
              ? capacidadeResponse.data
              : []
          );
        } catch (capacidadeError) {
          console.warn("Capacidade instalada indisponível:", capacidadeError);
          setCapacidade([]);
        }

  const totalPlanejamentos = dados.reduce(
    (acc, item) => acc + Number(item.total_planejamentos || 0),
    0
  );

  const totalMinutos = dados.reduce(
    (acc, item) => acc + Number(item.minutos_semanais || 0),
    0
  );

  const totalHoras = dados.reduce(
    (acc, item) => acc + Number(item.horas_semanais || 0),
    0
  );

  const totalHorasMensais = dados.reduce(
    (acc, item) => acc + Number(item.horas_mensais || 0),
    0
  );

  const totalHorasAnuais = dados.reduce(
    (acc, item) => acc + Number(item.horas_anuais || 0),
    0
  );

  const totalFte = dados.reduce(
    (acc, item) => acc + Number(item.fte || 0),
    0
  );

  const maiorDemanda = dados.length > 0
  ? [...dados].sort(
      (a, b) => Number(b.horas_anuais || 0) - Number(a.horas_anuais || 0)
    )[0]
  : null;

const maiorHorasAnuais = maiorDemanda
  ? Number(maiorDemanda.horas_anuais || 0)
  : 0;

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>Carregando dimensionamento...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0 }}>Dimensionamento de Equipe</h2>
            <div style={subtitleStyle}>
              Demanda assistencial planejada a partir dos Planos Terapêuticos Singulares.
            </div>
          </div>
        </div>

        <div style={infoGridStyle}>
          <div style={cardResumoStyle}>
            <div style={smallLabelStyle}>Planejamentos</div>
            <div style={numeroResumoStyle}>{totalPlanejamentos}</div>
          </div>

          <div style={cardResumoStyle}>
            <div style={smallLabelStyle}>Horas Semanais</div>
            <div style={numeroResumoStyle}>
              {totalHoras.toFixed(2)} h
            </div>
          </div>

          <div style={cardResumoStyle}>
            <div style={smallLabelStyle}>Horas Mensais</div>
            <div style={numeroResumoStyle}>
              {totalHorasMensais.toFixed(2)} h
            </div>
          </div>

          <div style={cardResumoStyle}>
            <div style={smallLabelStyle}>Equipe Necessária</div>

            <div style={numeroResumoStyle}>
              {totalFte.toFixed(2)} FTE
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              (~{Math.round(totalFte * 100)}% de um profissional)
            </div>
          </div>
        </div>

        {dados.length > 0 && (
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Carga Assistencial Anual por Ocupação</h3>

            <div style={{ marginTop: 20 }}>
              {dados.map((item) => {
                const horasAnuais = Number(item.horas_anuais || 0);
                const percentual = maiorHorasAnuais > 0
                  ? (horasAnuais / maiorHorasAnuais) * 100
                  : 0;

                return (
                  <div key={item.ocupacao_id} style={{ marginBottom: 18 }}>
                    <div style={graficoLinhaHeaderStyle}>
                      <span style={graficoLabelStyle}>
                        {item.ocupacao_nome}
                      </span>

                      <span style={graficoValorStyle}>
                        {horasAnuais.toFixed(2)} h/ano
                      </span>
                    </div>

                    <div style={graficoBarraFundoStyle}>
                      <div
                        style={{
                          ...graficoBarraStyle,
                          width: `${percentual}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {maiorDemanda && (
          <div style={insightStyle}>
            <div>
              <div style={smallLabelStyle}>Insight Executivo</div>

              <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800 }}>
                Maior demanda assistencial: {maiorDemanda.ocupacao_nome}
              </div>

              <div style={{ marginTop: 6, color: "#4b5563" }}>
                {Number(maiorDemanda.horas_anuais || 0).toFixed(2)} h/ano •{" "}
                {Number(maiorDemanda.horas_semanais || 0).toFixed(2)} h/semana •{" "}
                {Number(maiorDemanda.fte || 0).toFixed(2)} FTE
              </div>
            </div>
          </div>
        )}

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Carga por Ocupação</h3>

          {dados.length === 0 ? (
            <p style={{ color: "#6b7280" }}>
              Nenhum planejamento encontrado para dimensionamento.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Ocupação</th>
                    <th style={thStyle}>Planejamentos</th>
                    <th style={thStyle}>Horas/Semana</th>
                    <th style={thStyle}>Horas/Mês</th>
                    <th style={thStyle}>Horas/Ano</th>
                    <th style={thStyle}>FTE</th>
                  </tr>
                </thead>

                <tbody>
                  {dados.map((item) => (
                    <tr key={item.ocupacao_id}>
                      <td style={tdStyle}>{item.ocupacao_nome}</td>
                      <td style={tdStyle}>{item.total_planejamentos}</td>
                      <td style={tdStyle}>{item.horas_semanais}</td>
                      <td style={tdStyle}>{item.horas_mensais}</td>
                      <td style={tdStyle}>{item.horas_anuais}</td>
                      <td style={tdStyle}>{item.fte}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>
              Demanda x Capacidade Instalada
            </h3>

            {capacidade.length === 0 ? (
              <p style={{ color: "#6b7280" }}>
                Nenhuma capacidade instalada cadastrada.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Ocupação</th>
                      <th style={thStyle}>Demanda/Ano</th>
                      <th style={thStyle}>Capacidade/Ano</th>
                      <th style={thStyle}>Saldo</th>
                      <th style={thStyle}>Utilização</th>
                      <th style={thStyle}>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {capacidade.map((item) => {
                      const saldo = Number(item.saldo_horas || 0);
                      const utilizacao = Number(item.percentual_utilizacao || 0);

                      const status =
                        saldo < 0
                          ? "DÉFICIT"
                          : utilizacao >= 90
                          ? "CRÍTICO"
                          : utilizacao >= 70
                          ? "ATENÇÃO"
                          : "OK";

                      return (
                        <tr key={item.ocupacao_id}>
                          <td style={tdStyle}>{item.ocupacao_nome}</td>

                          <td style={tdStyle}>
                            {Number(item.demanda_horas_ano || 0).toFixed(2)}
                          </td>

                          <td style={tdStyle}>
                            {Number(item.capacidade_horas_ano || 0).toFixed(2)}
                          </td>

                          <td style={tdStyle}>
                            {saldo.toFixed(2)}
                          </td>

                          <td style={tdStyle}>
                            {utilizacao.toFixed(2)}%
                          </td>

                          <td style={tdStyle}>
                            {status}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 18,
};

const subtitleStyle = {
  fontSize: 15,
  color: "#6b7280",
  marginTop: 6,
};

const infoGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
  marginBottom: 24,
};

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 24,
  background: "#fff",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
  marginBottom: 18,
};

const cardResumoStyle = {
  ...cardStyle,
  marginBottom: 0,
};

const smallLabelStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#374151",
};

const numeroResumoStyle = {
  marginTop: 14,
  fontSize: 30,
  fontWeight: 800,
  color: "#1f2937",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 12,
};

const thStyle = {
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
  textAlign: "left",
  fontSize: 14,
  fontWeight: 800,
  color: "#374151",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: 14,
  color: "#374151",
  whiteSpace: "nowrap",
};

const graficoLinhaHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  marginBottom: 8,
};

const graficoLabelStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#374151",
};

const graficoValorStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: "#6b7280",
};

const graficoBarraFundoStyle = {
  width: "100%",
  height: 14,
  borderRadius: 999,
  background: "#e5e7eb",
  overflow: "hidden",
};

const graficoBarraStyle = {
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg, #16a34a, #22c55e)",
};

const insightStyle = {
  border: "1px solid #bbf7d0",
  borderRadius: 16,
  padding: 20,
  background: "#f0fdf4",
  marginBottom: 18,
};