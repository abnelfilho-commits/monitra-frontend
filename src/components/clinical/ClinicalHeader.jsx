export default function ClinicalHeader({
  titulo,
  paciente,
  data,
  profissional,
  origem,
}) {
  return (
    <div style={styles.header}>
      <h1 style={styles.titulo}>{titulo}</h1>

      <div style={styles.pacienteBox}>
        <span style={styles.label}>Paciente</span>
        <strong style={styles.paciente}>{paciente || "-"}</strong>
      </div>

      <div style={styles.meta}>
        <span><strong>Data:</strong> {data || "-"}</span>
        <span><strong>Profissional:</strong> {profissional || "-"}</span>
        <span><strong>Origem:</strong> {origem || "-"}</span>
      </div>
    </div>
  );
}

const styles = {
  header: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },
  titulo: {
    fontSize: "52px",
    margin: "0 0 24px",
  },
  pacienteBox: {
    marginBottom: "18px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    color: "#6b7280",
    marginBottom: "4px",
  },
  paciente: {
    fontSize: "18px",
  },
  meta: {
    display: "flex",
    gap: "24px",
    flexWrap: "wrap",
  },
};