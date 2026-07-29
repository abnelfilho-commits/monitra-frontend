import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ClinicalFooter from "../components/clinical/ClinicalFooter";
import ClinicalPageLayout from "../components/clinical/ClinicalPageLayout";
import ClinicalSection from "../components/clinical/ClinicalSection";
import ClinicalSummaryCard from "../components/clinical/ClinicalSummaryCard";

import api from "../services/api";
import { obterPaciente } from "../services/pacientes";

const FORMULARIO_NEURO_ID = 2;

const CAMPOS_NEURO = {
  sono_qualidade: 34,
  evacuacao: 41,
  consistencia_fezes: 42,
  irritabilidade: 35,
  crise_sensorial: 36,
  tempo_tela: 37,
  seletividade_alimentar: 38,
  aceitou_alimento_novo: 39,
  observacao: 40,
};

const OPCOES_SONO = [
  { value: 1, label: "1 - Muito ruim" },
  { value: 2, label: "2 - Ruim" },
  { value: 3, label: "3 - Regular" },
  { value: 4, label: "4 - Bom" },
  { value: 5, label: "5 - Muito bom" },
];

const OPCOES_BRISTOL = [
  { value: 1, label: "1 - Muito ressecado" },
  { value: 2, label: "2 - Ressecado" },
  { value: 3, label: "3 - Tendendo a ressecado" },
  { value: 4, label: "4 - Normal" },
  { value: 5, label: "5 - Tendendo a pastoso" },
  { value: 6, label: "6 - Pastoso" },
  { value: 7, label: "7 - Líquido" },
];

const OPCOES_IRRITABILIDADE = [
  { value: 0, label: "0 - Nenhuma" },
  { value: 1, label: "1 - Leve" },
  { value: 2, label: "2 - Moderada" },
  { value: 3, label: "3 - Alta" },
  { value: 4, label: "4 - Muito alta" },
];

const OPCOES_CRISE_SENSORIAL = [
  { value: 0, label: "0 - Não" },
  { value: 1, label: "1 - Sim" },
  { value: 2, label: "2 - Moderada" },
  { value: 3, label: "3 - Alta" },
];

function extrairMensagemErro(error) {
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg)
      .filter(Boolean)
      .join(" ");
  }

  return String(
    detail ||
      error?.message ||
      "Não foi possível salvar o acompanhamento diário."
  );
}

export default function NovoRegistroDiario() {
  const { id } = useParams();
  const pacienteId = Number(id);
  const navigate = useNavigate();

  const hoje = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [paciente, setPaciente] = useState(null);

  const [form, setForm] = useState({
    data: hoje,
    sono_qualidade: "",
    evacuacao: false,
    consistencia_fezes: "",
    irritabilidade: "",
    crise_sensorial: "",
    tempo_tela: "",
    seletividade_alimentar: "",
    aceitou_alimento_novo: false,
    observacao: "",
  });

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function carregarPaciente() {
      try {
        setLoading(true);
        setErro("");

        const resposta = await obterPaciente(pacienteId);

        if (ativo) {
          setPaciente(resposta);
        }
      } catch (error) {
        if (ativo) {
          setErro(extrairMensagemErro(error));
        }
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    if (pacienteId) {
      carregarPaciente();
    } else {
      setErro("Paciente não identificado.");
      setLoading(false);
    }

    return () => {
      ativo = false;
    };
  }, [pacienteId]);

  function setField(name, value) {
    setForm((prev) => {
      if (name === "evacuacao") {
        return {
          ...prev,
          evacuacao: value,
          consistencia_fezes:
            value === true
              ? prev.consistencia_fezes
              : "",
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  }

  function montarRespostas() {
    return [
      {
        campo_id: CAMPOS_NEURO.sono_qualidade,
        valor:
          form.sono_qualidade === ""
            ? null
            : Number(form.sono_qualidade),
      },
      {
        campo_id: CAMPOS_NEURO.evacuacao,
        valor: form.evacuacao,
      },
      {
        campo_id: CAMPOS_NEURO.consistencia_fezes,
        valor:
          form.evacuacao === true &&
          form.consistencia_fezes !== ""
            ? Number(form.consistencia_fezes)
            : null,
      },
      {
        campo_id: CAMPOS_NEURO.irritabilidade,
        valor:
          form.irritabilidade === ""
            ? null
            : Number(form.irritabilidade),
      },
      {
        campo_id: CAMPOS_NEURO.crise_sensorial,
        valor:
          form.crise_sensorial === ""
            ? null
            : Number(form.crise_sensorial),
      },
      {
        campo_id: CAMPOS_NEURO.tempo_tela,
        valor: form.tempo_tela || null,
      },
      {
        campo_id: CAMPOS_NEURO.seletividade_alimentar,
        valor: form.seletividade_alimentar || null,
      },
      {
        campo_id: CAMPOS_NEURO.aceitou_alimento_novo,
        valor: Boolean(form.aceitou_alimento_novo),
      },
      {
        campo_id: CAMPOS_NEURO.observacao,
        valor: form.observacao?.trim() || null,
      },
    ];
  }

  async function onSubmit(event) {
    event.preventDefault();

    if (!form.data || saving) return;

    try {
      setErro("");
      setSaving(true);

      await api.post("/registros-longitudinais/", {
        paciente_id: pacienteId,
        modulo_id: 1,
        formulario_id: FORMULARIO_NEURO_ID,
        data_registro: form.data,
        origem: "PROFISSIONAL",
        respostas: montarRespostas(),
      });

      navigate(`/pacientes/${pacienteId}`);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSaving(false);
    }
  }

  function cancelar() {
    navigate(-1);
  }

  if (loading) {
    return (
      <main style={styles.estadoPagina}>
        <div style={styles.estadoCard}>
          Preparando o acompanhamento diário...
        </div>
      </main>
    );
  }

  return (
    <ClinicalPageLayout
      titulo="📋 Registrar Acompanhamento Diário"
      subtitulo="Registre os principais sinais do dia e mantenha a jornada clínica atualizada."
      badge="Jornada Assistencial"
    >
      <ClinicalSummaryCard
        paciente={paciente}
        pacienteId={pacienteId}
      />

      {erro && (
        <div role="alert" style={styles.erro}>
          <strong>Não foi possível continuar.</strong>

          <div style={{ marginTop: 5 }}>
            {erro}
          </div>
        </div>
      )}

      <form onSubmit={onSubmit}>
        <ClinicalSection
          numero={1}
          titulo="Data do acompanhamento"
          descricao="Confirme o dia ao qual este registro se refere."
        >
          <label style={styles.campo}>
            <span style={styles.label}>
              Data *
            </span>

            <input
              type="date"
              value={form.data}
              onChange={(event) =>
                setField("data", event.target.value)
              }
              style={styles.input}
            />
          </label>
        </ClinicalSection>

        <ClinicalSection
          numero={2}
          titulo="Sono e rotina"
          descricao="Registre aspectos do descanso e da rotina diária."
        >
          <div style={styles.gradeCampos}>
            <CampoSelect
              label="Qualidade do sono"
              value={form.sono_qualidade}
              onChange={(value) =>
                setField("sono_qualidade", value)
              }
              opcoes={OPCOES_SONO}
            />

            <CampoSelect
              label="Tempo de tela"
              value={form.tempo_tela}
              onChange={(value) =>
                setField("tempo_tela", value)
              }
              opcoes={[
                {
                  value: "MENOS_1H",
                  label: "Menos de 1 hora",
                },
                {
                  value: "1_2H",
                  label: "1 a 2 horas",
                },
                {
                  value: "2_4H",
                  label: "2 a 4 horas",
                },
                {
                  value: "MAIS_4H",
                  label: "Mais de 4 horas",
                },
              ]}
            />
          </div>
        </ClinicalSection>

        <ClinicalSection
          numero={3}
          titulo="Saúde intestinal"
          descricao="Registre informações relacionadas ao funcionamento intestinal."
        >
          <div style={styles.gradeCampos}>
            <div style={styles.campo}>
              <span style={styles.label}>
                Houve evacuação?
              </span>

              <div style={styles.opcoesRadio}>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="evacuacao"
                    checked={form.evacuacao === true}
                    onChange={() =>
                      setField("evacuacao", true)
                    }
                  />
                  Sim
                </label>

                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="evacuacao"
                    checked={form.evacuacao === false}
                    onChange={() =>
                      setField("evacuacao", false)
                    }
                  />
                  Não
                </label>
              </div>
            </div>

            <CampoSelect
              label="Consistência das fezes (Bristol)"
              value={form.consistencia_fezes}
              onChange={(value) =>
                setField(
                  "consistencia_fezes",
                  value
                )
              }
              opcoes={OPCOES_BRISTOL}
              disabled={form.evacuacao !== true}
            />
          </div>
        </ClinicalSection>

        <ClinicalSection
          numero={4}
          titulo="Comportamento e sensorial"
          descricao="Registre sinais comportamentais e alterações sensoriais observadas."
        >
          <div style={styles.gradeCampos}>
            <CampoSelect
              label="Irritabilidade"
              value={form.irritabilidade}
              onChange={(value) =>
                setField("irritabilidade", value)
              }
              opcoes={OPCOES_IRRITABILIDADE}
            />

            <CampoSelect
              label="Crise sensorial"
              value={form.crise_sensorial}
              onChange={(value) =>
                setField("crise_sensorial", value)
              }
              opcoes={OPCOES_CRISE_SENSORIAL}
            />
          </div>
        </ClinicalSection>

        <ClinicalSection
          numero={5}
          titulo="Alimentação"
          descricao="Registre aspectos relevantes da alimentação neste dia."
        >
          <div style={styles.gradeCampos}>
            <CampoSelect
              label="Seletividade alimentar"
              value={form.seletividade_alimentar}
              onChange={(value) =>
                setField(
                  "seletividade_alimentar",
                  value
                )
              }
              opcoes={[
                {
                  value: "NENHUMA",
                  label: "Nenhuma",
                },
                {
                  value: "LEVE",
                  label: "Leve",
                },
                {
                  value: "MODERADA",
                  label: "Moderada",
                },
                {
                  value: "GRAVE",
                  label: "Grave",
                },
              ]}
            />

            <div style={styles.checkCard}>
              <input
                id="aceitou-alimento-novo"
                type="checkbox"
                checked={
                  form.aceitou_alimento_novo
                }
                onChange={(event) =>
                  setField(
                    "aceitou_alimento_novo",
                    event.target.checked
                  )
                }
              />

              <label
                htmlFor="aceitou-alimento-novo"
                style={styles.checkTexto}
              >
                <strong>
                  Aceitou novo alimento
                </strong>

                <span style={styles.ajuda}>
                  Marque quando houver aceitação de
                  um alimento novo neste dia.
                </span>
              </label>
            </div>
          </div>
        </ClinicalSection>

        <ClinicalSection
          numero={6}
          titulo="Observações"
          descricao="Registre apenas informações adicionais relevantes para continuidade do cuidado."
        >
          <div style={styles.campoDescricao}>
            <textarea
              value={form.observacao}
              onChange={(event) =>
                setField(
                  "observacao",
                  event.target.value
                )
              }
              placeholder="Descreva apenas informações relevantes que não foram contempladas nos campos acima..."
              rows={7}
              maxLength={4000}
              style={styles.textarea}
            />

            <span style={styles.contador}>
              {form.observacao.length}/4000
            </span>
          </div>
        </ClinicalSection>

        <ClinicalFooter
          loading={saving}
          disabled={!form.data}
          onCancel={cancelar}
          submitLabel="📋 Registrar Acompanhamento"
        >
          <div style={styles.destino}>
            <span style={styles.destinoIcone}>
              ↗
            </span>

            <div>
              <strong>
                Depois de registrar
              </strong>

              <div style={styles.destinoTexto}>
                O acompanhamento passará a integrar
                a Timeline e a evolução longitudinal
                do paciente.
              </div>
            </div>
          </div>
        </ClinicalFooter>
      </form>
    </ClinicalPageLayout>
  );
}

function CampoSelect({
  label,
  value,
  onChange,
  opcoes,
  disabled = false,
}) {
  return (
    <label style={styles.campo}>
      <span style={styles.label}>
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        style={styles.input}
        disabled={disabled}
      >
        <option value="">
          Selecione
        </option>

        {opcoes.map((opcao) => (
          <option
            key={opcao.value}
            value={opcao.value}
          >
            {opcao.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const styles = {
  estadoPagina: {
    minHeight: "100%",
    padding: "28px 24px 48px",
    background: "#f8fafc",
  },

  estadoCard: {
    width: "100%",
    maxWidth: 1180,
    boxSizing: "border-box",
    margin: "0 auto",
    padding: 18,
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    background: "#ffffff",
    color: "#475569",
  },

  erro: {
    marginBottom: 18,
    padding: 15,
    border: "1px solid #fecaca",
    borderRadius: 14,
    background: "#fef2f2",
    color: "#991b1b",
  },

  gradeCampos: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },

  campo: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },

  label: {
    color: "#334155",
    fontSize: 13,
    fontWeight: 800,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    outline: "none",
    background: "#ffffff",
    color: "#0f172a",
    fontFamily: "inherit",
    fontSize: 14,
  },

  opcoesRadio: {
    display: "flex",
    gap: 20,
    minHeight: 44,
    alignItems: "center",
    padding: "0 4px",
  },

  radioLabel: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    color: "#334155",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },

  checkCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 11,
    minHeight: 78,
    boxSizing: "border-box",
    padding: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    background: "#f8fafc",
  },

  checkTexto: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    color: "#0f172a",
    fontSize: 14,
    cursor: "pointer",
  },

  ajuda: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 1.4,
    fontWeight: 400,
  },

  campoDescricao: {
    position: "relative",
  },

  textarea: {
    width: "100%",
    minHeight: 180,
    boxSizing: "border-box",
    padding: "15px 15px 32px",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    outline: "none",
    resize: "vertical",
    background: "#ffffff",
    color: "#0f172a",
    fontFamily: "inherit",
    fontSize: 15,
    lineHeight: 1.6,
  },

  contador: {
    position: "absolute",
    right: 13,
    bottom: 10,
    color: "#94a3b8",
    fontSize: 11,
  },

  destino: {
    display: "flex",
    alignItems: "flex-start",
    gap: 11,
    color: "#1e3a8a",
  },

  destinoIcone: {
    fontSize: 20,
  },

  destinoTexto: {
    marginTop: 4,
    color: "#475569",
    fontSize: 13,
    lineHeight: 1.5,
  },
};