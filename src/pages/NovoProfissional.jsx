import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { criarProfissional } from "../services/profissionais";
import { listarClinicas } from "../services/clinicas";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";

function getPerfil(user) {
  return String(user?.perfil || "").trim().toUpperCase();
}

function isAdmin(user) {
  return ["ADMIN", "ADMIN_CLINICA", "ADMINISTRADOR"].includes(getPerfil(user));
}

export default function NovoProfissional() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const admin = useMemo(() => isAdmin(user), [user]);

  const [form, setForm] = useState({
    nome: "",
    email: "",
    especialidade: "",
    clinica_id: "",
  });

  const [clinicas, setClinicas] = useState([]);
  const [loadingClinicas, setLoadingClinicas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
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

    const clinicaIdFinal = admin
      ? form.clinica_id
      : user?.clinica_id
      ? String(user.clinica_id)
      : "";

    if (!clinicaIdFinal) {
      setErro(
        admin ? "Selecione a clínica." : "Usuário sem clínica vinculada."
      );
      return;
    }

    setSaving(true);

    try {
      await criarProfissional({
        nome: form.nome.trim(),
        email: form.email?.trim() || null,
        especialidade: form.especialidade?.trim() || null,
        clinica_id: Number(clinicaIdFinal),
      });

      navigate("/profissionais");
    } catch (e2) {
      const msg =
        e2?.response?.data?.detail || "Falha ao criar profissional.";
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
            <h2 style={{ margin: 0 }}>Novo Profissional</h2>
            <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
              Cadastro de profissional de saúde
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={() => navigate("/profissionais")}
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
              <div>
                <label style={labelStyle}>Nome</label>
                <input
                  placeholder="Nome do profissional"
                  value={form.nome}
                  onChange={(e) => setField("nome", e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Especialidade</label>
                <input
                  placeholder="Especialidade"
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
                onClick={() => navigate("/profissionais")}
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
