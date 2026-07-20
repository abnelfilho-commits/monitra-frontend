export default function ClinicalContextCard({
  profissional,
  data,
  unidade,
}) {
  const itens = [
    {
      rotulo: "Profissional",
      valor: profissional || "Não informado",
    },
    {
      rotulo: "Data",
      valor: data || "Não informada",
    },
    {
      rotulo: "Unidade",
      valor: unidade || "Não informada",
    },
  ];

  return (
    <section style={styles.card}>
      <div style={styles.cabecalho}>
        <div style={styles.icone}>🩺</div>

        <div>
          <h2 style={styles.titulo}>Contexto Assistencial</h2>

          <p style={styles.descricao}>
            Informações relacionadas ao momento deste registro clínico.
          </p>
        </div>
      </div>

      <div style={styles.grade}>
        {itens.map((item) => (
          <div key={item.rotulo} style={styles.item}>
            <span style={styles.rotulo}>{item.rotulo}</span>
            <strong style={styles.valor}>{item.valor}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

const styles = {
  card: {
    padding: 20,
    marginTop: 18,
    marginBottom: 18,
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    background: "#ffffff",
    boxShadow: "0 8px 24px rgba(15,23,42,.05)",
  },

  cabecalho: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },

  icone: {
    flex: "0 0 42px",
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "#eff6ff",
    fontSize: 21,
  },

  titulo: {
    margin: 0,
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 850,
  },

  descricao: {
    margin: "5px 0 0",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
  },

  grade: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
    gap: 12,
  },

  item: {
    minWidth: 0,
    padding: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    background: "#f8fafc",
  },

  rotulo: {
    display: "block",
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".4px",
  },

  valor: {
    display: "block",
    marginTop: 5,
    color: "#0f172a",
    fontSize: 15,
    lineHeight: 1.45,
    overflowWrap: "anywhere",
  },
};
