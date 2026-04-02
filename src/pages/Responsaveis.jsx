import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  criarResponsavel,
  listarPacientes,
  listarResponsaveis,
  vincularResponsavelPaciente,
} from "../services/responsaveis";

const buttonBaseStyle = {
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
};

const buttonSecondaryStyle = {
  ...buttonBaseStyle,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
};

const buttonPrimaryStyle = {
  ...buttonBaseStyle,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
};

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  background: "#fff",
  padding: 16,
};

const inputStyle = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  boxSizing: "border-box",
};

const labelStyle = {
  display: "grid",
  gap: 6,
  fontSize: 14,
  fontWeight: 600,
};

export default function Responsaveis() {
  const navigate = useNavigate();

  const [responsaveis, setResponsaveis] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [busca, setBusca] = useState("");
  const [mostrarNovoResponsavel, setMostrarNovoResponsavel] = useState(false);

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

  const responsaveisFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return responsaveis;

    return responsaveis.filter((r) => {
      const nome = (r.nome || "").toLowerCase();
      const email = (r.email || "").toLowerCase();
      const telefone = (r.telefone || "").toLowerCase();

      return (
        nome.includes(termo) ||
        email.includes(termo) ||
        telefone.includes(termo)
      );
    });
  }, [responsaveis, busca]);

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
      setMostrarNovoResponsavel(false);

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
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button onClick={() => navigate(-1)} style={buttonSecondaryStyle}>
            ← Voltar
          </button>
          <h2 style={{ margin: 0 }}>Responsáveis</h2>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => setMostrarNovoResponsavel((prev) => !prev)}
            style={buttonPrimaryStyle}
          >
            + Novo Responsável
          </button>

          <button onClick={load} style={buttonSecondaryStyle}>
            ↻ Atualizar
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Buscar responsável por nome, e-mail ou telefone..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{
            ...inputStyle,
            maxWidth: 580,
          }}
        />
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

      {mostrarNovoResponsavel && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Novo responsável</h3>

          <form
            onSubmit={onCriarResponsavel}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              alignItems: "end",
            }}
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

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" style={buttonPrimaryStyle}>
                Salvar Responsável
              </button>

              <button
                type="button"
                onClick={() => setMostrarNovoResponsavel(false)}
                style={buttonSecondaryStyle}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Lista de responsáveis cadastrados</h3>

        {loading ? (
          <p>Carregando...</p>
        ) : responsaveisFiltrados.length === 0 ? (
          <p>Nenhum responsável encontrado.</p>
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
                {responsaveisFiltrados.map((r) => (
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

      <div style={{ ...cardStyle, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Vincular paciente a responsável</h3>

        <form
          onSubmit={onVincular}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            alignItems: "end",
          }}
        >
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
              minHeight: 42,
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

          <div>
            <button type="submit" style={buttonPrimaryStyle}>
              Vincular Paciente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
