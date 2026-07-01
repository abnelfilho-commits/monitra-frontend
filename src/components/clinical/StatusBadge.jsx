export default function StatusBadge({ valor }) {
  const normalizado = String(valor ?? "").toUpperCase();

  const mapa = {
    SIM: { label: "Sim", icon: "🟢" },
    TRUE: { label: "Sim", icon: "🟢" },
    NAO: { label: "Não", icon: "🔴" },
    NÃO: { label: "Não", icon: "🔴" },
    FALSE: { label: "Não", icon: "🔴" },
    BAIXO: { label: "Baixo", icon: "🟢" },
    MODERADO: { label: "Moderado", icon: "🟡" },
    ALTO: { label: "Alto", icon: "🔴" },
    CRITICO: { label: "Crítico", icon: "🔴" },
    CRÍTICO: { label: "Crítico", icon: "🔴" },
  };

  const item = mapa[normalizado];

  return (
    <span style={styles.badge}>
      {item ? `${item.icon} ${item.label}` : valor ?? "-"}
    </span>
  );
}

const styles = {
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    border: "1px solid #e5e7eb",
    borderRadius: "999px",
    padding: "4px 10px",
    fontSize: "14px",
    fontWeight: "600",
  },
};