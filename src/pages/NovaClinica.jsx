import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { criarClinica } from "../services/clinicas";
import Button from "../components/ui/Button";

export default function NovaClinica() {
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
    setSaving(true);
    setErro("");

    try {
      const nova = await criarClinica(form);
      navigate(`/clinicas/${nova.id}`);
    } catch (e) {
      setErro("Falha ao criar clínica.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Nova Clínica</h2>
          <small style={{ color: "#6b7280" }}>
            Cadastro de clínica
          </small>
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
              style={inputStyle}
              required
            />

            <input
              placeholder="CNPJ"
              value={form.cnpj}
              onChange={(e) => setField("cnpj", e.target.value)}
              style={inputStyle}
            />

            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              style={inputStyle}
            />

            <input
              placeholder="Telefone"
              value={form.telefone}
              onChange={(e) => setField("telefone", e.target.value)}
              style={inputStyle}
            />
          </div>

          {erro && <div style={erroStyle}>{erro}</div>}

          <div style={actionsStyle}>
            <Button variant="secondary" onClick={() => navigate("/clinicas")}>
              Cancelar
            </Button>

            <Button type="submit">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
