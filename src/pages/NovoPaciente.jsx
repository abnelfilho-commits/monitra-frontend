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
        setErro(
          e?.response?.data?.detail ||
            e?.message ||
            "Falha ao carregar clínicas."
        );
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
        setErro(
          e?.response?.data?.detail ||
            e?.message ||
            "Falha ao carregar profissionais."
        );
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

    if (!form.nome.trim()) {
      setErro("Informe o nome do paciente.");
      return;
    }

    if (!form.data_nascimento) {
      setErro("Informe a data de nascimento.");
      return;
    }

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
      const payload = {
        nome: form.nome.trim(),
        data_nascimento: form.data_nascimento,
        genero: form.genero || null,
        responsavel_nome: form.responsavel_nome?.trim() || null,
        responsavel_email: form.responsavel_email?.trim() || null,
        clinica_id: Number(form.clinica_id),
        profissional_id: Number(form.profissional_id),
      };

      const novo = await criarPaciente(payload);
      navigate(`/pacientes/${novo.id}`);
    } catch (e2) {
      const msg =
        e2?.response?.data?.detail ||
        e2?.message ||
        "Falha ao criar paciente.";
      setErro(String(msg));
    } finally {
      setSaving(false);
    }
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
            <h2 style={{ margin: 0 }}>Novo Paciente</h2>
            <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
              Cadastro de paciente
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={() => navigate("/pacientes")}
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
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Nome</label>
                <input
                  placeholder="Nome do paciente"
                  value={form.nome}
                  onChange={(e) => setField("nome", e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Data de nascimento</label>
                <input
                  type="date"
                  value={form.data_nascimento}
                  onChange={(e) => setField("data_nascimento", e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Gênero</label>
                <select
                  value={form.genero}
                  onChange={(e) => setField("genero", e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Clínica</label>
                <select
                  value={form.clinica_id}
                  onChange={(e) => setField("clinica_id", e.target.value)}
                  required
                  disabled={loadingClinicas}
                  style={inputStyle}
                >
                  <option value="">
                    {loadingClinicas ? "Carregando clínicas..." : "Selecione"}
                  </option>
                  {clinicas.map((clinica) => (
                    <option key={clinica.id} value={clinica.id}>
                      {clinica.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Profissional responsável</label>
                <select
                  value={form.profissional_id}
                  onChange={(e) => setField("profissional_id", e.target.value)}
                  required
                  disabled={!form.clinica_id || loadingProfissionais}
                  style={inputStyle}
                >
                  <option value="">
                    {!form.clinica_id
                      ? "Selecione a clínica primeiro"
                      : loadingProfissionais
                      ? "Carregando profissionais..."
                      : "Selecione"}
                  </option>
                  {profissionais.map((prof) => (
                    <option key={prof.id} value={prof.id}>
                      {prof.nome}
                      {prof.especialidade ? ` - ${prof.especialidade}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Responsável</label>
                <input
                  placeholder="Nome do responsável"
                  value={form.responsavel_nome}
                  onChange={(e) => setField("responsavel_nome", e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Email do responsável</label>
                <input
                  type="email"
                  placeholder="Email do responsável"
                  value={form.responsavel_email}
                  onChange={(e) => setField("responsavel_email", e.target.value)}
                  style={inputStyle}
                />
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
                onClick={() => navigate("/pacientes")}
                disabled={saving}
              >
                Cancelar
              </Button>

              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar paciente"}
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
