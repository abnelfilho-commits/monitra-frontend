export default function ClinicalSection({ titulo, children }) {
  return (
    <section style={styles.section}>
      {titulo && <h2 style={styles.titulo}>{titulo}</h2>}
      {children}
    </section>
  );
}

const styles = {
  section: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
  },
  titulo: {
    marginTop: 0,
    marginBottom: "20px",
    fontSize: "24px",
  },
};