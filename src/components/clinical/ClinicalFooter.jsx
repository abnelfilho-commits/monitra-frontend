import Button from "../ui/Button";

export default function ClinicalFooter({
  children,
  loading,
  disabled,
  onCancel,
  submitLabel,
}) {
  return (
    <footer style={styles.rodape}>
      <div style={styles.destino}>
        {children}
      </div>

      <div style={styles.acoes}>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>

        <Button
          type="submit"
          disabled={disabled || loading}
        >
          {loading ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </footer>
  );
}

const styles = {
  rodape: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
    padding: 20,
    marginTop: 18,
    border: "1px solid #dbeafe",
    borderRadius: 18,
    background: "linear-gradient(135deg,#eff6ff 0%,#ffffff 82%)",
  },

  destino: {
    flex: "1 1 480px",
    display: "flex",
    alignItems: "flex-start",
    gap: 11,
    color: "#1e3a8a",
  },

  acoes: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
};