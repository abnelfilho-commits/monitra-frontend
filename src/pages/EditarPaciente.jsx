import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { obterPaciente, atualizarPaciente } from "../services/pacientes";
import { listarClinicas } from "../services/clinicas";
import { listarProfissionaisPorClinica } from "../services/profissionais";

export default function EditarPaciente() {
  const { id } = useParams();
  const pacienteId = Number(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nome: "",
    data_nascimento: "",
    genero: "",
    responsavel_nome: "",
    responsavel_email: "",
    clinica_id: "",
    profissional_id: "",
  });

  const [clinicas, setClinicas] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingClinicas, setLoadingClinicas] = useState(true);
  const [loadingProfissionais, setLoadingProfissionais] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function load() {
    setErro("");
    setLoading(true);

    try {
      const [p, listaClinicas] = await Promise.all([
        obterPaciente(pacienteId),
        listarClinicas(),
      ]);

      setClinicas(Array.isArray(listaClinicas) ? listaClinicas : []);

      const clinicaIdInicial = p?.clinica_id ? String(p.clinica_id) : "";

      setForm({
        nome: p?.nome || "",
        data_nascimento: p?.data_nascimento || "",
        genero: p?.genero || "",
        responsavel_nome: p?.responsavel_nome || "",
        responsavel_email: p?.responsavel_email || "",
        clinica_id: clinicaIdInicial,
        profissional_id: p?.profissional_id ? String(p.profissional_id) : "",
      });

      if (clinicaIdInicial) {
        setLoadingProfissionais(true);
        const listaProfissionais = await listarProfissionaisPorClinica(Number(clinicaIdInicial));
        setProfissionais(Array.isArray(listaProfissionais) ? listaProfissionais : []);
      }
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Falha ao carregar paciente.";
      setErro(String(msg));
    } finally {
      setLoading(false);
      setLoadingClinicas(false);
      setLoadingProfissionais(false);
    }
  }

  useEffect(() => {
    if (!pacienteId || Number.isNaN(pacienteId)) return;
    load();
  }, [pacienteId]);

  useEffect(() => {
    async function loadProfissionais() {
      if (!form.clinica_id) {
        setProfissionais([]);
        setForm((prev) => ({ ...prev, profissional_id: "" }));
        return;
      }

      try {
        setLoadingProfissionais(true);
        const data = await listarProfissionaisPorClinica(Number(form.clinica_id));
        setProfissionais(Array.isArray(data) ? data : []);
      } catch (e) {
        const msg =
          e?.response?.data?.detail ||
          e?.message ||
          "Falha ao carregar profissionais.";
        setErro(String(msg));
        setProfissionais([]);
      } finally {
        setLoadingProfissionais(false);
      }
    }

    if (!loading) {
      loadProfissionais();
    }
  }, [form.clinica_id, loading]);

  async function onSubmit(e) {
    e.preventDefault();
    setErro("");

    if (!form.clinica_id) {
      setErro("Selecione a clínica.");
      return;
    }

    if (!form.profissional_id) {
      setErro("Selecione o profissional responsável.");
      return;
    }

    setSaving(true);

    try {
      await atualizarPaciente(pacienteId, {
        nome: form.nome.trim(),
        data_nascimento: form.data_nascimento,
        genero: form.genero || null,
        responsavel_nome: form.responsavel_nome?.trim() || null,
        responsavel_email: form.responsavel_email?.trim() || null,
        clinica_id: Number(form.clinica_id),
        profissional_id: Number(form.profissional_id),
      });

      navigate(`/pacientes/${pacienteId}`);
    } catch (e2) {
      const msg =
        e2?.response?.data?.detail ||
        e2?.message ||
        "Falha ao atualizar paciente.";
      setErro(String(msg));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Carregando paciente...</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h2>Editar Paciente</h2>

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
          <label>Data de nascimento</label>
          <input
            type="date"
            value={form.data_nascimento}
            onChange={(e) => setField("data_nascimento", e.target.value)}
            required
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Gênero</label>
          <select
            value={form.genero}
            onChange={(e) => setField("genero", e.target.value)}
            style={{ width: "100%", padding: 10 }}
          >
            <option value="">(não informado)</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
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
          <label>Profissional responsável</label>
          <select
            value={form.profissional_id}
            onChange={(e) => setField("profissional_id", e.target.value)}
            required
            disabled={!form.clinica_id || loadingProfissionais}
            style={{ width: "100%", padding: 10 }}
          >
            <option value="">
              {!form.clinica_id
                ? "Selecione a clínica primeiro"
                : loadingProfissionais
                ? "Carregando profissionais..."
                : "(selecione)"}
            </option>
            {profissionais.map((prof) => (
              <option key={prof.id} value={prof.id}>
                {prof.nome}
                {prof.especialidade ? ` - ${prof.especialidade}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Responsável</label>
          <input
            value={form.responsavel_nome}
            onChange={(e) => setField("responsavel_nome", e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Email do responsável</label>
          <input
            type="email"
            value={form.responsavel_email}
            onChange={(e) => setField("responsavel_email", e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        {erro && <p style={{ color: "red", marginTop: 12 }}>{erro}</p>}

        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          <button type="button" onClick={() => navigate(-1)} disabled={saving}>
            Voltar
          </button>

          <button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
