export default function ClinicalSummaryCard({ paciente, pacienteId }) {
  const nome = paciente?.nome || `Paciente #${pacienteId}`;

  const idade =
    paciente?.idade != null && paciente?.idade !== ""
      ? `${paciente.idade} anos`
      : null;

  const clinica =
    paciente?.clinica_nome ||
    paciente?.clinica?.nome ||
    paciente?.unidade_nome ||
    null;

  const modulo =
    paciente?.modulo_nome ||
    paciente?.modulo?.nome ||
    paciente?.linha_cuidado ||
    null;

  const metadados = [
    idade
      ? {
          icone: "🎂",
          valor: idade,
        }
      : null,
    clinica
      ? {
          icone: "🏥",
          valor: clinica,
        }
      : null,
    modulo
      ? {
          icone: "🧩",
          valor: modulo,
        }
      : null,
  ].filter(Boolean);

  return (
    <section style={styles.resumoPaciente}>
      <div style={styles.identidade}>
        <div style={styles.avatar}>👤</div>

        <div style={styles.conteudo}>
          <div style={styles.rotulo}>Paciente</div>

          <div style={styles.nomePaciente}>
            {nome}
          </div>

          {metadados.length > 0 && (
            <div style={styles.metadados}>
              {metadados.map((item) => (
                <span
                  key={`${item.icone}-${item.valor}`}
                  style={styles.metadado}
                >
                  <span aria-hidden="true">
                    {item.icone}
                  </span>

                  <span>
                    {item.valor}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={styles.automatico}>
        ✓ Identificado automaticamente
      </div>
    </section>
  );
}

const styles = {
  resumoPaciente: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
    padding: 20,
    marginBottom: 18,
    border: "1px solid #dbeafe",
    borderRadius: 18,
    background: "linear-gradient(135deg,#eff6ff 0%,#ffffff 72%)",
    boxShadow: "0 8px 24px rgba(15,23,42,.05)",
  },

  identidade: {
    display: "flex",
    alignItems: "center",
    gap: 15,
    minWidth: 0,
    flex: "1 1 520px",
  },

  avatar: {
    flex: "0 0 52px",
    width: 52,
    height: 52,
    display: "grid",
    placeItems: "center",
    borderRadius: 15,
    background: "#dbeafe",
    fontSize: 25,
  },

  conteudo: {
    minWidth: 0,
    flex: 1,
  },

  rotulo: {
    fontSize: 12,
    fontWeight: 800,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: ".5px",
  },

  nomePaciente: {
    marginTop: 3,
    fontSize: 21,
    fontWeight: 900,
    color: "#0f172a",
    lineHeight: 1.25,
    overflowWrap: "anywhere",
  },

  metadados: {
    display: "flex",
    alignItems: "center",
    gap: "8px 14px",
    flexWrap: "wrap",
    marginTop: 9,
  },

  metadado: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    color: "#475569",
    fontSize: 13,
    fontWeight: 650,
  },

  automatico: {
    flex: "0 0 auto",
    padding: "8px 12px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
};
