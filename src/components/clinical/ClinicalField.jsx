export default function ClinicalField({ titulo, valor }) {
  return (
    <div style={styles.field}>
      <span style={styles.titulo}>{titulo}</span>
      <span style={styles.valor}>{valor ?? "-"}</span>
    </div>
  );
}

const styles = {
  field: {
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: "12px",
  },
  titulo: {
    display: "block",
    fontWeight: "600",
  },
  valor: {
    display: "block",
    marginTop: "4px",
  },
};