import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { criarPaciente } from "../services/pacientes";
import { listarClinicas } from "../services/clinicas";
import { listarProfissionaisPorClinica } from "../services/profissionais";
import Button from "../components/ui/Button";

export default function NovoPaciente() {
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
  const [loadingClinicas, setLoadingClinicas] = useState(true);
  const [loadingProfissionais, setLoadingProfissionais] = useState(false);
  const [erro, setErro] = useState("");
  const [saving, setSaving] = useState(false);

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
        setErro("Falha ao carregar clínicas.");
      } finally {
        setLoadingClinicas(false);
      }
    }

    loadClinicas();
  }, []);

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
        setErro("Falha ao carregar profissionais.");
        setProfissionais([]);
      } finally {
        setLoadingProfissionais(false);
      }
    }

    loadProfissionais();
  }, [form.clinica_id]);

  async function onSubmit(e) {
    e.preventDefault();
    setErro("");

    if (!form.clinica_id) return setErro("Selecione a clínica.");
    if (!form.profissional_id)
      return setErro("Selecione o profissional responsável.");

    setSaving(true);

    try {
      const novo = await criarPaciente({
        ...form,
        clinica_id: Number(form.clinica_id),
        profissional_id: Number(form.profissional_id),
      });

      navigate(`/pacientes/${novo.id}`);
    } catch (e) {
      setErro("Falha ao criar paciente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Novo Paciente</h2>
          <small style={{ color: "#6b7280" }}>
            Cadastro de paciente
          </small>
        </div>

        <Button variant="secondary" onClick={() => navigate("/pacientes")}>
          ← Voltar
        </Button>
      </div>

      <div style={cardStyle}>
        <form onSubmit={onSubmit}>
          <div style={gridStyle}>
            <input
              placeholder="Nome"
              value={form.nome}
              onChange={(e) => setField("nome", e.target.value)}
              style={inputStyle}
              required
            />

            <input
              type="date"
              value={form.data_nascimento}
              onChange={(e) => setField("data_nascimento", e.target.value)}
              style={inputStyle}
              required
            />

            <select
              value={form.genero}
              onChange={(e) => setField("genero", e.target.value)}
              style={inputStyle}
            >
              <option value="">Gênero</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>

            <select
              value={form.clinica_id}
              onChange={(e) => setField("clinica_id", e.target.value)}
              style={inputStyle}
            >
              <option value="">
                {loadingClinicas ? "Carregando..." : "Clínica"}
              </option>
              {clinicas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>

            <select
              value={form.profissional_id}
              onChange={(e) => setField("profissional_id", e.target.value)}
              style={{ ...inputStyle, gridColumn: "span 2" }}
            >
              <option value="">
                {!form.clinica_id
                  ? "Selecione clínica primeiro"
                  : "Profissional"}
              </option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>

            <input
              placeholder="Responsável"
              value={form.responsavel_nome}
              onChange={(e) => setField("responsavel_nome", e.target.value)}
              style={inputStyle}
            />

            <input
              placeholder="Email do responsável"
              value={form.responsavel_email}
              onChange={(e) => setField("responsavel_email", e.target.value)}
              style={inputStyle}
            />
          </div>

          {erro && <div style={erroStyle}>{erro}</div>}

          <div style={actionsStyle}>
            <Button variant="secondary" onClick={() => navigate("/pacientes")}>
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
