import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { criarProfissional } from "../services/profissionais";
import { listarClinicas } from "../services/clinicas";
import { useAuth } from "../context/AuthContext";

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

  if (loading) return <div>Carregando...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h2>Novo Profissional</h2>

      <form onSubmit={onSubmit}>
        <input
          placeholder="Nome"
          value={form.nome}
          onChange={(e) => setField("nome", e.target.value)}
        />

        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
        />

        <input
          placeholder="Especialidade"
          value={form.especialidade}
          onChange={(e) => setField("especialidade", e.target.value)}
        />

        <div>
          <label>Clínica</label>

          {admin ? (
            <select
              value={form.clinica_id}
              onChange={(e) => setField("clinica_id", e.target.value)}
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
            />
          )}
        </div>

        {erro && <p style={{ color: "red" }}>{erro}</p>}

        <button type="submit">
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}
