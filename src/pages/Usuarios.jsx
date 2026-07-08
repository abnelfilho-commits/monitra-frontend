import { useEffect, useMemo, useState } from "react";
import { listarUsuarios, criarUsuario, atualizarUsuario } from "../services/usuarios";
import { listarClinicas } from "../services/clinicas";
import Button from "../components/ui/Button";

const perfisNovoUsuario = ["ADMIN", "ADMIN_CLINICA", "SUPORTE"];

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [clinicas, setClinicas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);

  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    perfil: "ADMIN_CLINICA",
    clinica_id: "",
    ativo: true,
  });

  const clinicasMap = useMemo(() => {
    const map = {};
    clinicas.forEach((c) => {
      map[c.id] = c.nome;
    });
    return map;
  }, [clinicas]);

  async function load() {
    setErro("");
    setLoading(true);
    try {
      const [usuariosData, clinicasData] = await Promise.all([
        listarUsuarios(),
        listarClinicas(),
      ]);
      setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
      setClinicas(Array.isArray(clinicasData) ? clinicasData : []);
    } catch (e) {
      setErro(e?.response?.data?.detail || e?.message || "Falha ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function abrirNovo() {
    setEditando(null);
    setForm({
      nome: "",
      email: "",
      senha: "",
      perfil: "ADMIN_CLINICA",
      clinica_id: "",
      ativo: true,
    });
    setModalAberto(true);
  }

  function abrirEditar(usuario) {
    setEditando(usuario);
    setForm({
      nome: usuario.nome || "",
      email: usuario.email || "",
      senha: "",
      perfil: usuario.perfil || "PROFISSIONAL",
      clinica_id: usuario.clinica_id || "",
      ativo: usuario.ativo ?? true,
    });
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setErro("");

    try {
      const payload = {
        nome: form.nome,
        email: form.email,
        perfil: form.perfil,
        clinica_id: form.clinica_id ? Number(form.clinica_id) : null,
        ativo: Boolean(form.ativo),
      };

      if (!editando) {
        payload.senha = form.senha;
        await criarUsuario(payload);
      } else {
        await atualizarUsuario(editando.id, payload);
      }

      setModalAberto(false);
      await load();
    } catch (e) {
      setErro(e?.response?.data?.detail || e?.message || "Falha ao salvar usuário.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(usuario) {
    const novoStatus = !usuario.ativo;
    const ok = window.confirm(
      `Deseja realmente ${novoStatus ? "ativar" : "inativar"} o usuário "${usuario.nome}"?`
    );
    if (!ok) return;

    try {
      await atualizarUsuario(usuario.id, {
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        clinica_id: usuario.clinica_id,
        ativo: novoStatus,
      });
      await load();
    } catch (e) {
      setErro(e?.response?.data?.detail || e?.message || "Falha ao alterar status.");
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1220, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Usuários</h2>
          <p style={{ marginTop: 4, color: "#4b5563" }}>
            Gestão de acessos da plataforma Integra Care.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Button
            onClick={abrirNovo}
            style={{ padding: "8px 12px", fontSize: 14 }}
          >
            + Novo Usuário
          </Button>

          <Button
            variant="secondary"
            onClick={load}
            disabled={loading}
            style={{ padding: "8px 12px", fontSize: 14 }}
          >
            ↻ Atualizar
          </Button>
        </div>
      </div>

      {loading && <p>Carregando usuários...</p>}

      {erro && (
        <div style={{ background: "#fee2e2", border: "1px solid #fecaca", padding: 14, borderRadius: 12, marginTop: 16, color: "#991b1b" }}>
          {erro}
        </div>
      )}

      {!loading && !erro && (
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
          {usuarios.map((u) => (
            <div key={u.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, background: "#fff" }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{u.nome}</div>

              <div style={{ marginTop: 10, fontSize: 14, color: "#4b5563" }}>
                <div><b>Email:</b> {u.email || "-"}</div>
                <div><b>Perfil:</b> {u.perfil || "-"}</div>
                <div><b>Clínica:</b> {clinicasMap[u.clinica_id] || u.clinica_id || "-"}</div>
                <div><b>Status:</b> {u.ativo ? "Ativo" : "Inativo"}</div>
              </div>

              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button variant="secondary" onClick={() => abrirEditar(u)}>Editar</Button>
                <Button variant={u.ativo ? "danger" : "secondary"} onClick={() => alternarAtivo(u)}>
                  {u.ativo ? "Inativar" : "Ativar"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <form
            onSubmit={salvar}
            autoComplete="off"
            style={{
              width: 520,
              maxWidth: "100%",
              maxHeight: "calc(100vh - 64px)",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 14,
              padding: 20,
              boxSizing: "border-box",
            }}
          >
            <h3 style={{ marginTop: 0 }}>{editando ? "Editar Usuário" : "Novo Usuário"}</h3>

            <label style={labelStyle}>
              Nome
              <input
                name="novo-usuario-nome"
                autoComplete="off"
                placeholder="Digite o nome"
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Email
              <input
                name="novo-usuario-email"
                autoComplete="off"
                placeholder="Digite o email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={inputStyle}
              />
            </label>

            {!editando && (
              <label style={labelStyle}>
                Senha
                <input
                  name="nova-senha-usuario"
                  autoComplete="new-password"
                  placeholder="Digite a senha"
                  type="password"
                  required
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  style={inputStyle}
                />
              </label>
            )}

            {!editando && (
              <div style={professionalNoticeStyle}>
                <strong>Profissionais de saúde</strong>
                <span>
                  Para criar um acesso com perfil PROFISSIONAL, utilize o menu Profissionais.
                  O cadastro integrado cria o profissional, o usuário de acesso e os módulos habilitados.
                </span>
              </div>
            )}

            {editando?.perfil === "PROFISSIONAL" && (
              <div style={professionalNoticeStyle}>
                <strong>Usuário profissional</strong>
                <span>
                  Este acesso está vinculado a um cadastro assistencial. Módulos e vínculo profissional
                  devem ser administrados pelo menu Profissionais.
                </span>
              </div>
            )}

            <label style={labelStyle}>
              Perfil
              <select
                value={form.perfil}
                onChange={(e) => setForm({ ...form, perfil: e.target.value })}
                style={inputStyle}
                disabled={editando?.perfil === "PROFISSIONAL"}
              >
                {editando?.perfil === "PROFISSIONAL" ? (
                  <option value="PROFISSIONAL">PROFISSIONAL</option>
                ) : (
                  perfisNovoUsuario.map((p) => <option key={p} value={p}>{p}</option>)
                )}
              </select>
            </label>

            <label style={labelStyle}>
              Clínica
              <select value={form.clinica_id} onChange={(e) => setForm({ ...form, clinica_id: e.target.value })} style={inputStyle}>
                <option value="">Sem clínica</option>
                {clinicas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>

            <label style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
              Usuário ativo
            </label>

            <div style={{ marginTop: 18, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button type="button" variant="secondary" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 12,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  marginTop: 10,
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  marginTop: 12,
  fontWeight: 700,
  color: "#344054",
};

const professionalNoticeStyle = {
  marginTop: 16,
  padding: 12,
  borderRadius: 10,
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e3a5f",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 13,
  lineHeight: 1.45,
};
