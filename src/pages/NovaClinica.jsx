import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { criarClinica } from "../services/clinicas";
import Button from "../components/ui/Button";

export default function NovaClinica() {
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

  const navigate = useNavigate();

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
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Nova Clínica</h2>
          <small style={{ color: "#6b7280" }}>Cadastro de clínica</small>
        </div>

        <Button variant="secondary" onClick={() => navigate("/clinicas")}>
          ← Voltar
        </Button>
      </div>

      <div style={cardStyle}>
        <form onSubmit={onSubmit}>
          <div style={gridStyle}>
            <input
              placeholder="Nome"
              value={form.nome}
              onChange={(e) => setField("nome", e.target.value)}
              required
              style={{ ...inputStyle, gridColumn: "span 2" }}
            />

            <input
              placeholder="CNPJ"
              value={form.cnpj}
              onChange={(e) => setField("cnpj", mascararCNPJ(e.target.value))}
              style={inputStyle}
            />

            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              style={inputStyle}
            />

            <input
              placeholder="Telefone"
              value={form.telefone}
              onChange={(e) => setField("telefone", mascararTelefone(e.target.value))}
              style={{ ...inputStyle, gridColumn: "span 2" }}
            />
          </div>

          {erro && <div style={erroStyle}>{erro}</div>}

          <div style={actionsStyle}>
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
  );
}

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
  gap: 12,
  flexWrap: "wrap",
};

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 20,
  background: "white",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 14,
  outline: "none",
};

const erroStyle = {
  marginTop: 12,
  padding: 12,
  background: "#fee2e2",
  border: "1px solid #fecaca",
  borderRadius: 10,
  color: "#991b1b",
};

const actionsStyle = {
  marginTop: 16,
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
};
