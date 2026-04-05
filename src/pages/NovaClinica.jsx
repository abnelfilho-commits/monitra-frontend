import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { criarClinica } from "../services/clinicas";
import Button from "../components/ui/Button";

export default function NovaClinica() {
  const navigate = useNavigate();

  function mascararCNPJ(valor) {
    const numeros = String(valor || "").replace(/\D/g, "").slice(0, 14);

    return numeros
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  function mascararTelefone(valor) {
    const numeros = String(valor || "").replace(/\D/g, "").slice(0, 11);

    if (numeros.length <= 10) {
      return numeros
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }

    return numeros
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    email: "",
    telefone: "",
  });

  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErro("");

    if (!form.nome.trim()) {
      setErro("Informe o nome da clínica.");
      return;
    }

    setSaving(true);

    try {
      const nova = await criarClinica({
        nome: form.nome.trim(),
        cnpj: form.cnpj?.trim() || null,
        email: form.email?.trim() || null,
        telefone: form.telefone?.trim() || null,
      });

      navigate(`/clinicas/${nova.id}`);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Falha ao criar clínica.";
      setErro(String(msg));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Nova Clínica</h2>
            <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
              Cadastro de clínica
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={() => navigate("/clinicas")}
          >
            ← Voltar
          </Button>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 24,
            background: "#fff",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
          }}
        >
          <form onSubmit={onSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Nome</label>
                <input
                  placeholder="Nome da clínica"
                  value={form.nome}
                  onChange={(e) => setField("nome", e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>CNPJ</label>
                <input
                  placeholder="00.000.000/0000-00"
                  value={form.cnpj}
                  onChange={(e) => setField("cnpj", mascararCNPJ(e.target.value))}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Telefone</label>
                <input
                  placeholder="(00) 00000-0000"
                  value={form.telefone}
                  onChange={(e) => setField("telefone", mascararTelefone(e.target.value))}
                  style={inputStyle}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  placeholder="email@clinica.com"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {erro && (
              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 10,
                  background: "#fee2e2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                }}
              >
                {erro}
              </div>
            )}

            <div
              style={{
                marginTop: 20,
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Button
                variant="secondary"
                type="button"
                onClick={() => navigate("/clinicas")}
                disabled={saving}
              >
                Cancelar
              </Button>

              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Criar Clínica"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  color: "#374151",
};
