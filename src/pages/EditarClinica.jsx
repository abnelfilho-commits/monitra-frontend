import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { obterClinica, atualizarClinica } from "../services/clinicas";

export default function EditarClinica() {

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

  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    email: "",
    telefone: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function load() {
    try {
      const c = await obterClinica(id);

      setForm({
        nome: c?.nome || "",
        cnpj: c?.cnpj || "",
        email: c?.email || "",
        telefone: c?.telefone || "",
      });
    } catch (e) {
      setErro("Erro ao carregar clínica");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErro("");

    try {
      await atualizarClinica(id, {
        nome: form.nome.trim(),
        cnpj: form.cnpj?.trim() || null,
        email: form.email?.trim() || null,
        telefone: form.telefone?.trim() || null,
      });

      navigate(`/clinicas/${id}`);
    } catch {
      setErro("Falha ao atualizar clínica.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Carregando...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      <h2>Editar Clínica</h2>

      <form onSubmit={onSubmit}>
        <div style={{ marginTop: 12 }}>
          <label>Nome</label>
          <input
            value={form.nome}
            onChange={(e) => setField("nome", e.target.value)}
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
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
