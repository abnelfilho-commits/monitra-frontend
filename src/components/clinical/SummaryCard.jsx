export default function SummaryCard({ titulo, valor, icone }) {
  return (
    <div style={styles.card}>
      <span style={styles.titulo}>
        {icone && <span style={styles.icone}>{icone}</span>}
        {titulo}
      </span>

      <strong style={styles.valor}>{valor ?? "-"}</strong>
    </div>
  );
}

const styles = {
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "16px",
    background: "#ffffff",
  },
  titulo: {
    display: "block",
    fontSize: "14px",
    color: "#6b7280",
  },
  icone: {
    marginRight: "6px",
  },
  valor: {
    display: "block",
    fontSize: "24px",
    marginTop: "8px",
  },
};