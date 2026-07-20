function formatarData(valor) {
  if (!valor) return "-";

  return new Date(`${valor}T00:00:00`).toLocaleDateString("pt-BR");
}

export default function SummaryCard({ resumo }) {
  if (!resumo) return null;

  const textoAvaliacoes =
    resumo.avaliacoes_realizadas === 0
      ? "Nenhuma avaliação realizada nesta sessão"
      : `${resumo.avaliacoes_realizadas} avaliação${
          resumo.avaliacoes_realizadas === 1 ? "" : "ões"
        } realizada${
          resumo.avaliacoes_realizadas === 1 ? "" : "s"
        }`;

  const textoIntervencoes =
    resumo.intervencoes === 0
      ? "Nenhuma intervenção recente encontrada"
      : `${resumo.intervencoes} intervenção${
          resumo.intervencoes === 1 ? "" : "ões"
        } recente${
          resumo.intervencoes === 1 ? "" : "s"
        } no contexto do paciente`;

  return (
    <section
      style={{
        marginBottom: 16,
        border: "1px solid #bbf7d0",
        borderRadius: 18,
        padding: 20,
        background:
          "linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: "#15803d",
        }}
      >
        Resumo da sessão
      </div>

      <h2
        style={{
          margin: "8px 0 0",
          fontSize: 22,
          color: "#14532d",
        }}
      >
        ✅ {resumo.titulo}
      </h2>

      <p
        style={{
          margin: "10px 0 0",
          color: "#334155",
          fontSize: 15,
          lineHeight: 1.6,
        }}
      >
        {resumo.descricao}
      </p>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 10,
        }}
      >
        <div style={itemStyle}>
          <span>📝</span>
          <span>
            {resumo.registro_realizado
              ? "Registro Longitudinal realizado"
              : "Registro Longitudinal ainda não realizado"}
          </span>
        </div>

        <div style={itemStyle}>
          <span>📊</span>
          <span>{textoAvaliacoes}</span>
        </div>

        <div style={itemStyle}>
          <span>💬</span>
          <span>{textoIntervencoes}</span>
        </div>

        <div style={itemStyle}>
          <span>📅</span>
          <span>
            Próxima sessão:{" "}
            <strong>
              {formatarData(resumo.proxima_sessao)}
            </strong>
          </span>
        </div>
      </div>
    </section>
  );
}

const itemStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #dcfce7",
  background: "rgba(255, 255, 255, 0.9)",
  color: "#334155",
  fontSize: 14,
  lineHeight: 1.5,
};