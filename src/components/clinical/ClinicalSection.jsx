export default function ClinicalSection({
  numero,
  titulo,
  descricao,
  children,
}) {
  return (
    <section style={styles.secao}>
      {numero && (
        <div style={styles.numeroEtapa}>
          {numero}
        </div>
      )}

      <div style={styles.conteudo}>
        {titulo && (
          <h2 style={styles.titulo}>
            {titulo}
          </h2>
        )}

        {descricao && (
          <p style={styles.descricao}>
            {descricao}
          </p>
        )}

        {children}
      </div>
    </section>
  );
}

const styles = {
  secao: {
    display: "flex",
    gap: 16,
    padding: 22,
    marginTop: 16,
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    background: "#fff",
    boxShadow: "0 8px 24px rgba(15,23,42,.05)",
  },

  numeroEtapa: {
    flex: "0 0 34px",
    width: 34,
    height: 34,
    display: "grid",
    placeItems: "center",
    borderRadius: 11,
    background: "#0f172a",
    color: "#fff",
    fontWeight: 900,
  },

  conteudo: {
    flex: 1,
    minWidth: 0,
  },

  titulo: {
    margin: 0,
    fontSize: 20,
    color: "#0f172a",
  },

  descricao: {
    margin: "6px 0 18px",
    color: "#64748b",
    lineHeight: 1.5,
  },
};