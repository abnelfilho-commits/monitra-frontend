export default function ClinicalPageLayout({
  title,
  subtitle,
  titulo,
  subtitulo,
  badge,
  children,
}) {
  const tituloFinal = titulo ?? title;
  const subtituloFinal = subtitulo ?? subtitle;

  return (
    <main style={styles.pagina}>
      <div style={styles.container}>
        {(tituloFinal || subtituloFinal || badge) && (
          <header style={styles.cabecalho}>
            {badge && <span style={styles.badge}>{badge}</span>}

            {tituloFinal && (
              <h1 style={styles.titulo}>{tituloFinal}</h1>
            )}

            {subtituloFinal && (
              <p style={styles.subtitulo}>{subtituloFinal}</p>
            )}
          </header>
        )}

        <section style={styles.conteudo}>
          {children}
        </section>
      </div>
    </main>
  );
}

const styles = {
  pagina: {
    minHeight: "100%",
    padding: "28px 24px 48px",
    background: "#f8fafc",
  },

  container: {
    width: "100%",
    maxWidth: 1180,
    margin: "0 auto",
    boxSizing: "border-box",
  },

  cabecalho: {
    marginBottom: 22,
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 11px",
    marginBottom: 12,
    border: "1px solid #bfdbfe",
    borderRadius: 999,
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: ".3px",
  },

  titulo: {
    margin: 0,
    color: "#0f172a",
    fontSize: "clamp(28px, 4vw, 42px)",
    lineHeight: 1.12,
    fontWeight: 900,
    letterSpacing: "-.8px",
  },

  subtitulo: {
    maxWidth: 820,
    margin: "10px 0 0",
    color: "#64748b",
    fontSize: 16,
    lineHeight: 1.6,
  },

  conteudo: {
    width: "100%",
  },
};
