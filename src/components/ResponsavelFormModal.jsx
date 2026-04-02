import { useState } from "react";
import { criarResponsavel } from "../services/responsaveis";

const estadoInicial = {
  nome: "",
  email: "",
  telefone: "",
  senha: "",
};

export default function ResponsavelFormModal({ aberto, onClose, onSuccess }) {
  const [form, setForm] = useState(estadoInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  if (!aberto) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");

    try {
      setSalvando(true);
      const payload = {
        nome: form.nome.trim(),
        email: form.email.trim(),
        telefone: form.telefone.trim() || null,
        senha: form.senha,
      };

      const novoResponsavel = await criarResponsavel(payload);

      setForm(estadoInicial);
      onSuccess?.(novoResponsavel);
      onClose?.();
    } catch (err) {
      setErro(
        err?.response?.data?.detail || "Não foi possível cadastrar o responsável."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h2>Cadastrar responsável</h2>

        <form onSubmit={handleSubmit}>
          <label>
            Nome
            <input
              name="nome"
              value={form.nome}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            E-mail
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Telefone
            <input
              name="telefone"
              value={form.telefone}
              onChange={handleChange}
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              name="senha"
              value={form.senha}
              onChange={handleChange}
              required
            />
          </label>

          {erro ? <p className="erro">{erro}</p> : null}

          <div className="acoes">
            <button type="button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
