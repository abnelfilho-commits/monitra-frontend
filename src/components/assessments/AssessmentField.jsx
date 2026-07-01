import React from "react";

export default function AssessmentField({ campo, numero, valor, onChange }) {
  if (!["radio", "select"].includes(campo.tipo_campo)) return null;

  const respondido = valor !== undefined && valor !== null && valor !== "";

  return (
    <div
      style={{
        marginBottom: 18,
        padding: 18,
        borderRadius: 16,
        border: respondido ? "2px solid #2563eb" : "1px solid #e5e7eb",
        background: respondido ? "#eff6ff" : "#ffffff",
        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            background: "#2563eb",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
          }}
        >
          {numero}
        </div>

        {respondido && (
          <span style={{ color: "#16a34a", fontWeight: 700, fontSize: 13 }}>
            ✓ Respondida
          </span>
        )}
      </div>

      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: "#1f2937",
          marginBottom: 16,
          lineHeight: 1.5,
        }}
      >
        {campo.label}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {campo.opcoes?.map((opcao) => {
          const selecionado = valor === opcao.valor;

          return (
            <label
              key={opcao.valor}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 12,
                cursor: "pointer",
                border: selecionado ? "2px solid #2563eb" : "1px solid #e5e7eb",
                background: selecionado ? "#dbeafe" : "#fff",
                fontWeight: 700,
              }}
            >
              <input
                type="radio"
                name={campo.nome_campo}
                value={opcao.valor}
                checked={selecionado}
                onChange={(e) => onChange(campo.nome_campo, e.target.value)}
              />

              {opcao.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}