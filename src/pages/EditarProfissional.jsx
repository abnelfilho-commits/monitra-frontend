import Button from "../components/ui/Button";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  obterProfissional,
  atualizarProfissional,
} from "../services/profissionais";
import { listarClinicas } from "../services/clinicas";

export default function EditarProfissional() {
  const { id } = useParams();
  const profissionalId = Number(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nome: "",
    email: "",
    especialidade: "",
    clinica_id: "",
    ativo: true,
  });

  const [clinicas, setClinicas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingClinicas, setLoadingClinicas] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function load() {
    setErro("");
    setLoading(true);

    try {
      const [prof, listaClinicas] = await Promise.all([
        obterProfissional(profissionalId),
        listarClinicas(),
      ]);

      setClinicas(Array.isArray(listaClinicas) ? listaClinicas : []);

      setForm({
        nome: prof?.nome || "",
        email: prof?.email || "",
        especialidade: prof?.especialidade || "",
        clinica_id: prof?.clinica_id ? String(prof.clinica_id) : "",
        ativo: prof?.ativo ?? true,
      });
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Falha ao carregar profissional.";
      setErro(String(msg));
    } finally {
      setLoading(false);
      setLoadingClinicas(false);
    }
  }

  useEffect(() => {
    if (!profissionalId || Number.isNaN(profissionalId)) return;
    load();
  }, [profissionalId]);

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
      await atualizarProfissional(profissionalId, {
        nome: form.nome.trim(),
        email: form.email?.trim() || null,
        especialidade: form.especialidade?.trim() || null,
        clinica_id: Number(form.clinica_id),
        ativo: !!form.ativo,
      });

      navigate("/profissionais");
    } catch (e2) {
      const msg =
        e2?.response?.data?.detail ||
        e2?.message ||
        "Falha ao atualizar profissional.";
      setErro(String(msg));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Carregando profissional...</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h2>Editar Profissional</h2>

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

        <div style={{ marginTop: 12 }}>
          <label>
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setField("ativo", e.target.checked)}
            />
            {" "}Profissional ativo
          </label>
        </div>

        {erro && <p style={{ color: "red", marginTop: 12 }}>{erro}</p>}

        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate(-1)}
            disabled={saving}
          >
            ← Voltar
          </Button>

          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>

        </div>
      </form>
    </div>
  );
}
