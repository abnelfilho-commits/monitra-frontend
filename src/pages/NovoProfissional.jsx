import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { criarProfissional } from "../services/profissionais";
import { listarOcupacoesProfissionais } from "../services/atividadesTerapeuticas";
import { listarClinicas } from "../services/clinicas";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";

const MODULOS = [
  { id: 1, nome: "Neurodesenvolvimento", descricao: "Módulo Neuro" },
  { id: 2, nome: "Cardiometabólico", descricao: "Módulo Cardiometabólico" },
];

function getPerfil(user) {
  return String(user?.perfil || "").trim().toUpperCase();
}

function isAdmin(user) {
  return ["ADMIN", "ADMIN_CLINICA", "ADMINISTRADOR"].includes(getPerfil(user));
}

export default function NovoProfissional() {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const isCardio = searchParams.get("modulo") === "cardiometabolico";
  const moduloInicial = isCardio ? 2 : 1;

  const { user, loading } = useAuth();
  const admin = useMemo(() => isAdmin(user), [user]);

  const [form, setForm] = useState({
    nome: "",
    email: "",
    ocupacao_id: "",
    especialidade: "",
    clinica_id: "",
    senha: "",
    modulo_ids: [moduloInicial],
  });

  const [clinicas, setClinicas] = useState([]);
  const [ocupacoes, setOcupacoes] = useState([]);
  const [loadingOcupacoes, setLoadingOcupacoes] = useState(false);
  const [loadingClinicas, setLoadingClinicas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleModulo(moduloId) {
    setForm((prev) => {
      const jaSelecionado = prev.modulo_ids.includes(moduloId);
      return {
        ...prev,
        modulo_ids: jaSelecionado
          ? prev.modulo_ids.filter((id) => id !== moduloId)
          : [...prev.modulo_ids, moduloId],
      };
    });
  }

  useEffect(() => {
    async function loadClinicas() {
      if (!admin) return;

      try {
        setLoadingClinicas(true);
        const data = await listarClinicas();
        setClinicas(Array.isArray(data) ? data : []);
      } catch (e) {
        setErro("Falha ao carregar clínicas.");
      } finally {
        setLoadingClinicas(false);
      }
    }

    loadClinicas();
  }, [admin]);

  useEffect(() => {
    async function loadOcupacoes() {
      try {
        setLoadingOcupacoes(true);

        const data = await listarOcupacoesProfissionais();

        const ocupacoesAtivas = Array.isArray(data)
          ? data.filter((item) => item.ativo !== false)
          : [];

        setOcupacoes(ocupacoesAtivas);
      } catch (e) {
        setErro("Falha ao carregar ocupações profissionais.");
      } finally {
        setLoadingOcupacoes(false);
      }
    }

    loadOcupacoes();
  }, []);

  useEffect(() => {
    if (!user) return;

    if (!admin && user?.clinica_id) {
      setForm((prev) => ({
        ...prev,
        clinica_id: String(user.clinica_id),
      }));
    }
  }, [user, admin]);

  async function onSubmit(e) {
    e.preventDefault();
    setErro("");

    if (!form.nome.trim()) {
      setErro("Informe o nome do profissional.");
      return;
    }

    if (!form.email.trim()) {
      setErro("Informe o email do profissional.");
      return;
    }

    if (!form.ocupacao_id) {
      setErro("Selecione a ocupação profissional.");
      return;
    }

    if (!form.senha.trim()) {
      setErro("Informe a senha temporária de acesso.");
      return;
    }

    if (form.senha.trim().length < 6) {
      setErro("A senha temporária deve ter pelo menos 6 caracteres.");
      return;
    }

    if (!form.modulo_ids.length) {
      setErro("Selecione pelo menos um módulo de acesso.");
      return;
    }

    const clinicaIdFinal = admin
      ? form.clinica_id
      : user?.clinica_id
      ? String(user.clinica_id)
      : "";

    if (!clinicaIdFinal) {
      setErro(admin ? "Selecione a clínica." : "Usuário sem clínica vinculada.");
      return;
    }

    setSaving(true);

    try {
      await criarProfissional({
        nome: form.nome.trim(),
        email: form.email.trim(),
        ocupacao_id: Number(form.ocupacao_id),
        especialidade: form.especialidade?.trim() || null,
        clinica_id: Number(clinicaIdFinal),
        senha: form.senha,
        modulo_ids: form.modulo_ids,
      });

      navigate(isCardio ? "/profissionais?modulo=cardiometabolico" : "/profissionais");
    } catch (e2) {
      const msg = e2?.response?.data?.detail || "Falha ao criar profissional.";
      setErro(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
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
            <h2 style={{ margin: 0 }}>Novo Profissional</h2>
            <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
              Cadastro do profissional, acesso à plataforma e módulos habilitados
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={() =>
              navigate(isCardio ? "/profissionais?modulo=cardiometabolico" : "/profissionais")
            }
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
          <form onSubmit={onSubmit} autoComplete="off">
            <SectionTitle
              title="Dados do profissional"
              description="Informe a identidade assistencial do profissional."
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Nome</label>
                <input
                  name="novo-profissional-nome"
                  autoComplete="off"
                  placeholder="Nome do profissional"
                  value={form.nome}
                  onChange={(e) => setField("nome", e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Email</label>
                <input
                  name="novo-profissional-email"
                  autoComplete="off"
                  type="email"
                  placeholder="Email de acesso"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Ocupação Profissional *</label>

                <select
                  name="novo-profissional-ocupacao"
                  value={form.ocupacao_id}
                  onChange={(e) => setField("ocupacao_id", e.target.value)}
                  style={inputStyle}
                  disabled={loadingOcupacoes}
                >
                  <option value="">
                    {loadingOcupacoes
                      ? "Carregando ocupações..."
                      : "Selecione uma ocupação"}
                  </option>

                  {ocupacoes.map((ocupacao) => (
                    <option key={ocupacao.id} value={ocupacao.id}>
                      {ocupacao.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Especialidade</label>

                <input
                  name="novo-profissional-especialidade"
                  autoComplete="off"
                  placeholder="Ex.: Neuropediatria, Integração Sensorial..."
                  value={form.especialidade}
                  onChange={(e) => setField("especialidade", e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Clínica</label>

                {admin ? (
                  <select
                    value={form.clinica_id}
                    onChange={(e) => setField("clinica_id", e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">
                      {loadingClinicas ? "Carregando clínicas..." : "Selecione"}
                    </option>
                    {clinicas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={`Clínica ID ${user?.clinica_id}`}
                    disabled
                    style={{ ...inputStyle, background: "#f3f4f6" }}
                  />
                )}
              </div>
            </div>

            <SectionTitle
              title="Acesso à plataforma"
              description="Será criado automaticamente um usuário PROFISSIONAL vinculado a este cadastro."
            />

            <div>
              <label style={labelStyle}>Senha temporária</label>
              <input
                name="nova-senha-profissional"
                autoComplete="new-password"
                type="password"
                placeholder="Senha temporária"
                value={form.senha}
                onChange={(e) => setField("senha", e.target.value)}
                style={inputStyle}
              />
              <div style={helpTextStyle}>
                Oriente o profissional a trocar a senha conforme o procedimento institucional.
              </div>
            </div>

            <SectionTitle
              title="Módulos habilitados"
              description="Selecione as linhas de cuidado que este profissional poderá acessar."
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 12,
              }}
            >
              {MODULOS.map((modulo) => {
                const selecionado = form.modulo_ids.includes(modulo.id);

                return (
                  <label
                    key={modulo.id}
                    style={{
                      border: selecionado ? "1px solid #0f8f5b" : "1px solid #e5e7eb",
                      background: selecionado ? "#ecfdf3" : "#fff",
                      borderRadius: 14,
                      padding: 14,
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selecionado}
                      onChange={() => toggleModulo(modulo.id)}
                      style={{ marginTop: 3 }}
                    />

                    <span>
                      <span style={{ display: "block", fontWeight: 800, color: "#111827" }}>
                        {modulo.nome}
                      </span>

                      <span style={{ display: "block", fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                        {modulo.descricao}
                      </span>
                    </span>
                  </label>
                );
              })}
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
                onClick={() =>
                  navigate(isCardio ? "/profissionais?modulo=cardiometabolico" : "/profissionais")
                }
              >
                Cancelar
              </Button>

              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, description }) {
  return (
    <div style={{ marginTop: 22, marginBottom: 14, paddingTop: 18, borderTop: "1px solid #eef2f7" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{title}</div>
      <div style={{ marginTop: 4, fontSize: 13, color: "#6b7280" }}>{description}</div>
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

const helpTextStyle = {
  marginTop: 6,
  fontSize: 12,
  color: "#6b7280",
};
