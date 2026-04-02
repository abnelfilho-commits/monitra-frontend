import { useEffect, useState } from "react";
import {
  criarResponsavel,
  listarPacientes,
  listarResponsaveis,
  vincularResponsavelPaciente,
} from "../services/responsaveis";

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  background: "#fff",
  padding: 16,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
};

const inputStyle = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
};

const labelStyle = {
  display: "grid",
  gap: 6,
  fontSize: 14,
  fontWeight: 600,
};

const buttonBaseStyle = {
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
};

const buttonPrimaryStyle = {
  ...buttonBaseStyle,
  border: "none",
  background: "#0f62fe",
  color: "#fff",
};

const buttonSecondaryStyle = {
  ...buttonBaseStyle,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
};

export default function Responsaveis() {
  const [responsaveis, setResponsaveis] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [formResponsavel, setFormResponsavel] = useState({
    nome: "",
    email: "",
    telefone: "",
    senha: "",
  });

  const [formVinculo, setFormVinculo] = useState({
    responsavel_id: "",
    paciente_id: "",
    parentesco: "Responsável",
    principal: true,
  });

  async function load() {
    setErro("");
    setLoading(true);

    try {
      const [listaResponsaveis, listaPacientes] = await Promise.all([
        listarResponsaveis(),
        listarPacientes(),
      ]);

      setResponsaveis(Array.isArray(listaResponsaveis) ? listaResponsaveis : []);
      setPacientes(Array.isArray(listaPacientes) ? listaPacientes : []);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Falha ao carregar dados de responsáveis.";
      setErro(String(msg));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function atualizarCampoResponsavel(e) {
    const { name, value } = e.target;
    setFormResponsavel((prev) => ({ ...prev, [name]: value }));
  }

  function atualizarCampoVinculo(e) {
    const { name, value, type, checked } = e.target;
    setFormVinculo((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function onCriarResponsavel(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");

    try {
      await criarResponsavel({
        nome: formResponsavel.nome.trim(),
        email: formResponsavel.email.trim(),
        telefone: formResponsavel.telefone.trim() || null,
        senha: formResponsavel.senha,
      });

      setMensagem("Responsável cadastrado com sucesso.");
      setFormResponsavel({
        nome: "",
        email: "",
        telefone: "",
        senha: "",
      });

      await load();
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Não foi possível cadastrar o responsável.";
      setErro(String(msg));
    }
  }

  async function onVincular(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");

    try {
      await vincularResponsavelPaciente({
        responsavel_id: Number(formVinculo.responsavel_id),
        paciente_id: Number(formVinculo.paciente_id),
        parentesco: formVinculo.parentesco,
        principal: formVinculo.principal,
      });

      setMensagem("Vínculo criado com sucesso.");
      setFormVinculo({
        responsavel_id: "",
        paciente_id: "",
        parentesco: "Responsável",
        principal: true,
      });

      await load();
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Não foi possível criar o vínculo.";
      setErro(String(msg));
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Responsáveis</h2>
          <p style={{ marginTop: 8, color: "#6b7280" }}>
            Cadastre responsáveis e vincule pacientes para uso do app da família.
          </p>
        </div>

        <button onClick={load} style={buttonSecondaryStyle}>
          ↻ Atualizar
        </button>
      </div>

      {mensagem ? (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 12px",
            borderRadius: 10,
            background: "#ecfdf3",
            border: "1px solid #abefc6",
            color: "#067647",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {mensagem}
        </div>
      ) : null}

      {erro ? (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 12px",
            borderRadius: 10,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {erro}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Novo responsável</h3>

          <form
            onSubmit={onCriarResponsavel}
            style={{ display: "grid", gap: 12 }}
          >
            <label style={labelStyle}>
              Nome
              <input
                name="nome"
                value={formResponsavel.nome}
                onChange={atualizarCampoResponsavel}
                required
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              E-mail
              <input
                type="email"
                name="email"
                value={formResponsavel.email}
                onChange={atualizarCampoResponsavel}
                required
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Telefone
              <input
                name="telefone"
                value={formResponsavel.telefone}
                onChange={atualizarCampoResponsavel}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Senha
              <input
                type="password"
                name="senha"
                value={formResponsavel.senha}
                onChange={atualizarCampoResponsavel}
                required
                style={inputStyle}
              />
            </label>

            <div style={{ marginTop: 4 }}>
              <button type="submit" style={buttonPrimaryStyle}>
                Salvar responsável
              </button>
            </div>
          </form>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Vincular paciente</h3>

          <form onSubmit={onVincular} style={{ display: "grid", gap: 12 }}>
            <label style={labelStyle}>
              Responsável
              <select
                name="responsavel_id"
                value={formVinculo.responsavel_id}
                onChange={atualizarCampoVinculo}
                required
                style={inputStyle}
              >
                <option value="">Selecione</option>
                {responsaveis.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome} — {r.email}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Paciente
              <select
                name="paciente_id"
                value={formVinculo.paciente_id}
                onChange={atualizarCampoVinculo}
                required
                style={inputStyle}
              >
                <option value="">Selecione</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — {p.clinica_nome || "Sem clínica"}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Parentesco
              <input
                name="parentesco"
                value={formVinculo.parentesco}
                onChange={atualizarCampoVinculo}
                required
                style={inputStyle}
              />
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                name="principal"
                checked={formVinculo.principal}
                onChange={atualizarCampoVinculo}
              />
              Definir como responsável principal
            </label>

            <div style={{ marginTop: 4 }}>
              <button type="submit" style={buttonPrimaryStyle}>
                Vincular paciente
              </button>
            </div>
          </form>
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Responsáveis cadastrados</h3>

        {loading ? (
          <p>Carregando...</p>
        ) : responsaveis.length === 0 ? (
          <p>Nenhum responsável cadastrado.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "10px 8px" }}>Nome</th>
                  <th style={{ padding: "10px 8px" }}>E-mail</th>
                  <th style={{ padding: "10px 8px" }}>Telefone</th>
                </tr>
              </thead>
              <tbody>
                {responsaveis.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 8px" }}>{r.nome}</td>
                    <td style={{ padding: "10px 8px" }}>{r.email}</td>
                    <td style={{ padding: "10px 8px" }}>{r.telefone || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
