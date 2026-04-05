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
        e2?.response?.data?.detail ||
        "Falha ao criar profissional.";
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
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      {/* HEADER PADRÃO */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Novo Profissional</h2>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            Cadastro de profissional de saúde
          </div>
        </div>

        <Button variant="secondary" onClick={() => navigate("/profissionais")}>
          ← Voltar
        </Button>
      </div>

      {/* CARD FORM */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 20,
          background: "white",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
        }}
      >
        <form onSubmit={onSubmit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <input
              placeholder="Nome"
              value={form.nome}
              onChange={(e) => setField("nome", e.target.value)}
              style={inputStyle}
            />

            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              style={inputStyle}
            />

            <input
              placeholder="Especialidade"
              value={form.especialidade}
              onChange={(e) => setField("especialidade", e.target.value)}
              style={{ ...inputStyle, gridColumn: "span 2" }}
            />

            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Clínica</label>

              {admin ? (
                <select
                  value={form.clinica_id}
                  onChange={(e) => setField("clinica_id", e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Selecione</option>
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

          {/* ERRO */}
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

          {/* AÇÕES */}
          <div
            style={{
              marginTop: 18,
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate("/profissionais")}
            >
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

/* ===================== */
/* 🎨 ESTILO PADRÃO INPUT */
/* ===================== */

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 14,
  outline: "none",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 6,
  color: "#374151",
};
