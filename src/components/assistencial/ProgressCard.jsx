export default function ProgressCard({ resumo }) {
  if (!resumo) return null;

  const percentual = Number(
    resumo.percentual_conclusao || 0
  );

  return (
    <section
      style={{
        marginBottom: 20,
        border: "1px solid #bfdbfe",
        borderRadius: 18,
        padding: 20,
        background:
          "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: "#1d4ed8",
            }}
          >
            Progresso assistencial
          </div>

          <h3
            style={{
              margin: "8px 0 0",
              fontSize: 18,
              color: "#0f172a",
            }}
          >
            Evolução do Plano Terapêutico
          </h3>

          <p
            style={{
              margin: "6px 0 0",
              color: "#64748b",
              fontSize: 14,
            }}
          >
            Sessão {resumo.sessoes_realizadas} de{" "}
            {resumo.total_sessoes}
          </p>
          <p
            style={{
                margin: "4px 0 0",
                color: "#64748b",
                fontSize: 13,
            }}
          >
            {resumo.sessoes_realizadas} sessões realizadas
          </p>
        </div>

        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#1d4ed8",
          }}
        >
          {percentual.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}
          %
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          width: "100%",
          height: 14,
          borderRadius: 999,
          background: "#dbeafe",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(
              Math.max(percentual, 0),
              100
            )}%`,
            height: "100%",
            borderRadius: 999,
            background:
              "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)",
            transition: "width 300ms ease",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 10,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 12,
          color: "#64748b",
        }}
      >
        <span>Início do plano</span>
        <span>Conclusão</span>
      </div>
    </section>
  );
}