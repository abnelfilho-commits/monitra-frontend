import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { criarProfissional } from "../services/profissionais";
import { listarClinicas } from "../services/clinicas";

export default function NovoProfissional() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nome: "",
    email: "",
    especialidade: "",
    clinica_id: "",
  });

  const [clinicas, setClinicas] = useState([]);
  const [loadingClinicas, setLoadingClinicas] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  useEffect(() => {
    async function loadClinicas() {
      try {
        setLoadingClinicas(true);
        const data = await listarClinicas();
        setClinicas(Array.isArray(data) ? data : []);
      } catch (e) {
        const msg =
          e?.response?.data?.detail ||
          e?.message ||
          "Falha ao carregar clínicas.";
        setErro(String(msg));
      } finally {
        setLoadingClinicas(false);
      }
    }

    loadClinicas();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setErro("");

    if (!form.nome.trim()) {
      setErro("Informe o nome do profissional.");
      return;
    }

    if (!form.clinica_id) {
      setErro("Selecione a clínica.");
      return;
    }

    setSaving(true);

    try {
      await criarProfissional({
        nome: form.nome.trim(),
        email: form.email?.trim() || null,
        especialidade: form.especialidade?.trim() || null,
        clinica_id: Number(form.clinica_id),
      });

      navigate("/profissionais");
    } catch (e2) {
      const msg =
        e2?.response?.data?.detail ||
        e2?.message ||
        "Falha ao criar profissional.";
      setErro(String(msg));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h2>Novo Profissional</h2>

      <form onSubmit={onSubmit}>
        <div style={{ marginTop: 12 }}>
          <label>Nome</label>
          <input
            value={form.nome}
            onChange={(e) => setField("nome", e.target.value)}
            required
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Especialidade</label>
          <input
            value={form.especialidade}
            onChange={(e) => setField("especialidade", e.target.value)}
            placeholder="Ex.: Psicologia, Fonoaudiologia, Terapia Ocupacional"
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Clínica</label>
          <select
            value={form.clinica_id}
            onChange={(e) => setField("clinica_id", e.target.value)}
            required
            disabled={loadingClinicas}
            style={{ width: "100%", padding: 10 }}
          >
            <option value="">
              {loadingClinicas ? "Carregando clínicas..." : "(selecione)"}
            </option>
            {clinicas.map((clinica) => (
              <option key={clinica.id} value={clinica.id}>
                {clinica.nome}
              </option>
            ))}
          </select>
        </div>

        {erro && <p style={{ color: "red", marginTop: 12 }}>{erro}</p>}

        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          <button type="button" onClick={() => navigate(-1)} disabled={saving}>
            Voltar
          </button>

          <button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar profissional"}
          </button>
        </div>
      </form>
    </div>
  );
}
