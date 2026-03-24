import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { criarClinica } from "../services/clinicas";

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
    <div style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      <h2>Nova Clínica</h2>

      <form onSubmit={onSubmit}>
        <div style={{ marginTop: 12 }}>
          <label>Nome</label>
          <input
            value={form.nome}
            onChange={(e) => setField("nome", e.target.value)}
            required
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label>CNPJ</label>
          <input
            value={form.cnpj}
            onChange={(e) => setField("cnpj", mascararCNPJ(e.target.value))}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Telefone</label>
          <input
            value={form.telefone}
            onChange={(e) => setField("telefone", mascararTelefone(e.target.value))}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        {erro && <p style={{ color: "red" }}>{erro}</p>}

        <div style={{ marginTop: 16 }}>
          <button disabled={saving}>
            {saving ? "Salvando..." : "Criar Clínica"}
          </button>
        </div>
      </form>
    </div>
  );
}
