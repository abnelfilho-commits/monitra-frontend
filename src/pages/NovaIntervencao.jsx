import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ClinicalFooter from "../components/clinical/ClinicalFooter";
import ClinicalPageLayout from "../components/clinical/ClinicalPageLayout";
import ClinicalSection from "../components/clinical/ClinicalSection";
import ClinicalSummaryCard from "../components/clinical/ClinicalSummaryCard";

import { criarIntervencao } from "../services/intervencoes";
import { obterPaciente } from "../services/pacientes";

function toLocalDatetimeInputValue(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");

  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

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
      "Não foi possível registrar a intervenção."
  );
}

export default function NovaIntervencao() {
  const { id } = useParams();
  const pacienteId = Number(id);
  const navigate = useNavigate();

  const agora = useMemo(
    () => toLocalDatetimeInputValue(new Date()),
    []
  );

  const [paciente, setPaciente] = useState(null);

  const [tipo, setTipo] = useState("ABA");
  const [descricao, setDescricao] = useState("");
  const [dataHora, setDataHora] = useState(agora);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

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

  const formularioValido =
    Boolean(tipo.trim()) &&
    Boolean(dataHora);

  async function onSubmit(event) {
    event.preventDefault();

    if (!formularioValido || saving) return;

    try {
      setErro("");
      setSaving(true);

      const iso =
        dataHora.length === 16
          ? `${dataHora}:00`
          : dataHora;

      await criarIntervencao({
        paciente_id: pacienteId,
        tipo: tipo.trim(),
        descricao: descricao.trim() || null,
        data_intervencao: iso,
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
          Preparando o registro da intervenção...
        </div>
      </main>
    );
  }

  return (
    <ClinicalPageLayout
      titulo="💬 Registrar Intervenção"
      subtitulo="Registre uma ação assistencial que passa a integrar a jornada clínica do paciente."
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
          titulo="Qual intervenção foi realizada?"
          descricao="Identifique o tipo de intervenção realizada neste momento do cuidado."
        >
          <div style={styles.gradeCampos}>
            <label style={styles.campo}>
              <span style={styles.label}>
                Tipo de intervenção *
              </span>

              <input
                value={tipo}
                onChange={(event) =>
                  setTipo(event.target.value)
                }
                placeholder="Ex.: ABA, TO, Fono..."
                maxLength={100}
                style={styles.input}
              />

              <span style={styles.ajuda}>
                Informe a abordagem ou natureza da intervenção.
              </span>
            </label>

            <label style={styles.campo}>
              <span style={styles.label}>
                Data e horário *
              </span>

              <input
                type="datetime-local"
                value={dataHora}
                onChange={(event) =>
                  setDataHora(event.target.value)
                }
                style={styles.input}
              />

              <span style={styles.ajuda}>
                Momento em que a intervenção foi realizada.
              </span>
            </label>
          </div>
        </ClinicalSection>

        <ClinicalSection
          numero={2}
          titulo="O que foi realizado?"
          descricao="Registre de forma objetiva a ação realizada e os aspectos relevantes observados."
        >
          <div style={styles.campoDescricao}>
            <textarea
              value={descricao}
              onChange={(event) =>
                setDescricao(event.target.value)
              }
              placeholder="Descreva a intervenção realizada, a resposta do paciente e os pontos relevantes para continuidade do cuidado..."
              rows={9}
              maxLength={4000}
              style={styles.textarea}
            />

            <span style={styles.contador}>
              {descricao.length}/4000
            </span>
          </div>

          <div style={styles.ajudaDescricao}>
            Registre apenas o necessário para que outro profissional
            compreenda esta intervenção.
          </div>
        </ClinicalSection>

        <ClinicalSection
          numero={3}
          titulo="Contexto do registro"
          descricao="Estas informações acompanham a intervenção na jornada clínica."
        >
          <div style={styles.gradeContexto}>
            <div style={styles.cardContexto}>
              <span style={styles.iconeContexto}>👤</span>

              <div>
                <div style={styles.rotuloContexto}>
                  Paciente
                </div>

                <div style={styles.valorContexto}>
                  {paciente?.nome ||
                    `Paciente #${pacienteId}`}
                </div>
              </div>
            </div>

            <div style={styles.cardContexto}>
              <span style={styles.iconeContexto}>🧭</span>

              <div>
                <div style={styles.rotuloContexto}>
                  Destino
                </div>

                <div style={styles.valorContexto}>
                  Jornada clínica
                </div>
              </div>
            </div>
          </div>
        </ClinicalSection>

        <ClinicalFooter
          loading={saving}
          disabled={!formularioValido}
          onCancel={cancelar}
          submitLabel="💬 Registrar Intervenção"
        >
          <div style={styles.destino}>
            <span style={styles.destinoIcone}>↗</span>

            <div>
              <strong>Depois de registrar</strong>

              <div style={styles.destinoTexto}>
                A intervenção passará a integrar o histórico
                assistencial e a Timeline do paciente.
              </div>
            </div>
          </div>
        </ClinicalFooter>
      </form>
    </ClinicalPageLayout>
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

  ajuda: {
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 1.4,
  },

  campoDescricao: {
    position: "relative",
  },

  textarea: {
    width: "100%",
    minHeight: 220,
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

  ajudaDescricao: {
    marginTop: 9,
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.5,
  },

  gradeContexto: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 14,
  },

  cardContexto: {
    display: "flex",
    alignItems: "center",
    gap: 13,
    padding: 15,
    border: "1px solid #e2e8f0",
    borderRadius: 13,
    background: "#f8fafc",
  },

  iconeContexto: {
    fontSize: 24,
  },

  rotuloContexto: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: 800,
  },

  valorContexto: {
    marginTop: 4,
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 800,
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