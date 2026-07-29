import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "../components/ui/Button";

import {
  atualizarPaciente,
  obterPaciente,
} from "../services/pacientes";

import { listarClinicas } from "../services/clinicas";
import { listarProfissionaisPorClinica } from "../services/profissionais";

const pageStyle = {
  padding: "24px 32px",
  maxWidth: "980px",
  margin: "0 auto",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "20px",
};

const titleStyle = {
  margin: 0,
  color: "#203449",
  fontSize: "28px",
  lineHeight: 1.2,
  fontWeight: 700,
};

const subtitleStyle = {
  margin: "6px 0 0",
  color: "#667085",
  fontSize: "16px",
};

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #d9dee7",
  borderRadius: "18px",
  padding: "24px 28px",
  boxShadow: "0 8px 24px rgba(16, 24, 40, 0.05)",
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelStyle = {
  color: "#344054",
  fontSize: "15px",
  fontWeight: 600,
};

const inputStyle = {
  width: "100%",
  height: "46px",
  padding: "0 14px",
  border: "1px solid #cfd5df",
  borderRadius: "12px",
  background: "#ffffff",
  color: "#101828",
  fontSize: "15px",
  outline: "none",
  boxSizing: "border-box",
};

const disabledInputStyle = {
  ...inputStyle,
  background: "#f6f7f9",
  color: "#98a2b3",
  cursor: "not-allowed",
};

const fullWidthStyle = {
  gridColumn: "1 / -1",
};

const errorStyle = {
  margin: 0,
  padding: "14px 16px",
  border: "1px solid #f5c2c7",
  borderRadius: "12px",
  background: "#fff1f2",
  color: "#b42318",
  fontSize: "15px",
  fontWeight: 500,
};

const actionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: "10px",
  marginTop: "22px",
  flexWrap: "wrap",
};

export default function EditarPaciente() {
  const { id } = useParams();

  const pacienteId = Number(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nome: "",
    data_nascimento: "",
    altura: "",
    genero: "",
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

  function voltarAoPaciente() {
    navigate(`/pacientes/${pacienteId}`);
  }

  function setField(name, value) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function alterarClinica(clinicaId) {
    setForm((prev) => ({
      ...prev,
      clinica_id: clinicaId,
      profissional_id: "",
    }));

    setProfissionais([]);
    setErro("");
  }

  useEffect(() => {
    async function carregarPaciente() {
      if (!pacienteId || Number.isNaN(pacienteId)) {
        setErro("Paciente inválido.");
        setLoading(false);
        setLoadingClinicas(false);
        return;
      }

      setErro("");
      setLoading(true);
      setLoadingClinicas(true);

      try {
        const [paciente, listaClinicas] = await Promise.all([
          obterPaciente(pacienteId),
          listarClinicas(),
        ]);

        const clinicaId = paciente?.clinica_id
          ? String(paciente.clinica_id)
          : "";

        const profissionalId = paciente?.profissional_id
          ? String(paciente.profissional_id)
          : "";

        setClinicas(
          Array.isArray(listaClinicas)
            ? listaClinicas
            : []
        );

        setForm({
          nome: paciente?.nome || "",
          data_nascimento:
            paciente?.data_nascimento?.slice?.(0, 10) ||
            paciente?.data_nascimento ||
            "",
          altura:
            paciente?.altura !== null &&
            paciente?.altura !== undefined
              ? String(paciente.altura)
              : "",
          genero: paciente?.genero || "",
          clinica_id: clinicaId,
          profissional_id: profissionalId,
        });
      } catch (error) {
        const mensagem =
          error?.response?.data?.detail ||
          error?.message ||
          "Falha ao carregar os dados do paciente.";

        setErro(String(mensagem));
      } finally {
        setLoading(false);
        setLoadingClinicas(false);
      }
    }

    carregarPaciente();
  }, [pacienteId]);

  useEffect(() => {
    async function carregarProfissionais() {
      if (loading) {
        return;
      }

      if (!form.clinica_id) {
        setProfissionais([]);
        return;
      }

      setLoadingProfissionais(true);

      try {
        const lista = await listarProfissionaisPorClinica(
          Number(form.clinica_id)
        );

        setProfissionais(
          Array.isArray(lista)
            ? lista
            : []
        );
      } catch (error) {
        const mensagem =
          error?.response?.data?.detail ||
          error?.message ||
          "Falha ao carregar os profissionais da clínica.";

        setErro(String(mensagem));
        setProfissionais([]);
      } finally {
        setLoadingProfissionais(false);
      }
    }

    carregarProfissionais();
  }, [form.clinica_id, loading]);

  async function onSubmit(event) {
    event.preventDefault();

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
      await atualizarPaciente(pacienteId, {
        nome: form.nome.trim(),
        data_nascimento: form.data_nascimento,
        altura:
          form.altura !== ""
            ? Number(form.altura)
            : null,
        genero: form.genero || null,
        clinica_id: Number(form.clinica_id),
        profissional_id: Number(form.profissional_id),
      });

      navigate(`/pacientes/${pacienteId}`);
    } catch (error) {
      const mensagem =
        error?.response?.data?.detail ||
        error?.message ||
        "Falha ao atualizar o paciente.";

      setErro(String(mensagem));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          Carregando dados do paciente...
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>
            Editar Paciente
          </h1>

          <p style={subtitleStyle}>
            Atualização dos dados do paciente
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={voltarAoPaciente}
          disabled={saving}
        >
          ← Voltar
        </Button>
      </header>

      <form
        onSubmit={onSubmit}
        style={cardStyle}
      >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "18px 20px",
        }}
      >
          <div
            style={{
              ...fieldStyle,
              ...fullWidthStyle,
            }}
          >
            <label
              htmlFor="nome"
              style={labelStyle}
            >
              Nome
            </label>

            <input
              id="nome"
              type="text"
              value={form.nome}
              onChange={(event) =>
                setField("nome", event.target.value)
              }
              placeholder="Nome do paciente"
              required
              disabled={saving}
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label
              htmlFor="data_nascimento"
              style={labelStyle}
            >
              Data de nascimento
            </label>

            <input
              id="data_nascimento"
              type="date"
              value={form.data_nascimento}
              onChange={(event) =>
                setField(
                  "data_nascimento",
                  event.target.value
                )
              }
              required
              disabled={saving}
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label
              htmlFor="altura"
              style={labelStyle}
            >
              Altura
            </label>

            <input
              id="altura"
              type="number"
              step="0.01"
              min="0"
              value={form.altura}
              onChange={(event) =>
                setField("altura", event.target.value)
              }
              placeholder="Ex.: 1.70"
              disabled={saving}
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label
              htmlFor="genero"
              style={labelStyle}
            >
              Gênero
            </label>

            <select
              id="genero"
              value={form.genero}
              onChange={(event) =>
                setField("genero", event.target.value)
              }
              disabled={saving}
              style={inputStyle}
            >
              <option value="">
                Selecione
              </option>

              <option value="M">
                Masculino
              </option>

              <option value="F">
                Feminino
              </option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label
              htmlFor="clinica_id"
              style={labelStyle}
            >
              Clínica
            </label>

            <select
              id="clinica_id"
              value={form.clinica_id}
              onChange={(event) =>
                alterarClinica(event.target.value)
              }
              required
              disabled={
                loadingClinicas ||
                saving
              }
              style={
                loadingClinicas
                  ? disabledInputStyle
                  : inputStyle
              }
            >
              <option value="">
                {loadingClinicas
                  ? "Carregando clínicas..."
                  : "Selecione"}
              </option>

              {clinicas.map((clinica) => (
                <option
                  key={clinica.id}
                  value={clinica.id}
                >
                  {clinica.nome}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label
              htmlFor="profissional_id"
              style={labelStyle}
            >
              Profissional responsável
            </label>

            <select
              id="profissional_id"
              value={form.profissional_id}
              onChange={(event) =>
                setField(
                  "profissional_id",
                  event.target.value
                )
              }
              required
              disabled={
                !form.clinica_id ||
                loadingProfissionais ||
                saving
              }
              style={
                !form.clinica_id ||
                loadingProfissionais
                  ? disabledInputStyle
                  : inputStyle
              }
            >
              <option value="">
                {!form.clinica_id
                  ? "Selecione a clínica primeiro"
                  : loadingProfissionais
                  ? "Carregando profissionais..."
                  : "Selecione"}
              </option>

              {profissionais.map((profissional) => (
                <option
                  key={profissional.id}
                  value={profissional.id}
                >
                  {profissional.nome}
                  {profissional.especialidade
                    ? ` - ${profissional.especialidade}`
                    : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {erro && (
          <div
            role="alert"
            style={{
              ...errorStyle,
              marginTop: "28px",
            }}
          >
            {erro}
          </div>
        )}

        <div style={actionsStyle}>
          <Button
            type="button"
            variant="secondary"
            onClick={voltarAoPaciente}
            disabled={saving}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={
              saving ||
              loadingProfissionais
            }
          >
            {saving
              ? "Salvando..."
              : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}