export default function ClinicalEventTypeCards({
  items = [],
  value,
  onChange,
  multiple = false,
}) {
  const valoresSelecionados = multiple
    ? Array.isArray(value)
      ? value
      : []
    : [];

  function estaSelecionado(valor) {
    return multiple
      ? valoresSelecionados.includes(valor)
      : value === valor;
  }

  function selecionar(valor) {
    if (!multiple) {
      onChange?.(valor);
      return;
    }

    const proximoValor = valoresSelecionados.includes(valor)
      ? valoresSelecionados.filter((item) => item !== valor)
      : [...valoresSelecionados, valor];

    onChange?.(proximoValor);
  }

  return (
    <div style={styles.grid}>
      {items.map((item) => {
        const selecionado = estaSelecionado(item.valor);

        return (
          <button
            key={item.valor}
            type="button"
            aria-pressed={selecionado}
            onClick={() => selecionar(item.valor)}
            style={{
              ...styles.card,
              borderColor: selecionado ? item.cor : "#e2e8f0",
              background: selecionado ? item.fundo : "#fff",
              boxShadow: selecionado
                ? `0 0 0 2px ${item.cor}18`
                : "none",
            }}
          >
            <div style={styles.icon}>{item.icone}</div>

            <div
              style={{
                ...styles.title,
                color: selecionado ? item.cor : "#0f172a",
              }}
            >
              {item.titulo}
            </div>

            <div style={styles.description}>
              {item.descricao}
            </div>

            <div
              style={{
                ...styles.footer,
                color: item.cor,
              }}
            >
              {selecionado ? "✓ Selecionado" : "Selecionar"}
            </div>
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 16,
  },

  card: {
    border: "1px solid",
    borderRadius: 16,
    padding: 20,
    cursor: "pointer",
    textAlign: "left",
    transition: ".2s",
    fontFamily: "inherit",
  },

  icon: {
    fontSize: 30,
  },

  title: {
    marginTop: 12,
    fontWeight: 700,
    fontSize: 18,
  },

  description: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.5,
    minHeight: 60,
  },

  footer: {
    marginTop: 14,
    fontWeight: 700,
    fontSize: 13,
  },
};