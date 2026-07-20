import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ClinicalEventTypeCards from "../components/clinical/ClinicalEventTypeCards";
import ClinicalFooter from "../components/clinical/ClinicalFooter";
import ClinicalPageLayout from "../components/clinical/ClinicalPageLayout";
import ClinicalSection from "../components/clinical/ClinicalSection";
import ClinicalSummaryCard from "../components/clinical/ClinicalSummaryCard";

import {
  obterSessaoAssistencial,
  confirmarSessaoAssistencial,
  iniciarSessaoAssistencial,
  registrarAtendimento,
  finalizarSessaoAssistencial,
} from "../services/sessoesAssistenciais";

const OPCOES_PROXIMOS_PASSOS = [
  {
    valor: "registrarDiagnostico",
    icone: "🧠",
    titulo: "Registrar diagnóstico",
    descricao: "Criar um novo marco clínico após o atendimento.",
    cor: "#7c3aed",
    fundo: "#f5f3ff",
  },
  {
    valor: "criarIntervencao",
    icone: "💬",
    titulo: "Criar intervenção",
    descricao: "Registrar uma mudança de conduta ou ação assistencial.",
    cor: "#0284c7",
    fundo: "#f0f9ff",
  },
  {
    valor: "aplicarAvaliacao",
    icone: "📋",
    titulo: "Aplicar avaliação",
    descricao: "Direcionar para um instrumento clínico estruturado.",
    cor: "#c2410c",
    fundo: "#fff7ed",
  },
  {
    valor: "retornoAntecipado",
    icone: "⏱️",
    titulo: "Retorno antecipado",
    descricao: "Sinalizar necessidade de reavaliação antes da próxima sessão.",
    cor: "#b45309",
    fundo: "#fffbeb",
  },
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
      "Não foi possível carregar a Sessão Assistencial."
  );
}

function formatarData(data) {
  if (!data) return "Não informada";

  const dataSemHorario = String(data).slice(0, 10);
  const [ano, mes, dia] = dataSemHorario.split("-");

  if (!ano || !mes || !dia) return data;

  return `${dia}/${mes}/${ano}`;
}

function formatarHora(hora) {
  if (!hora) return "Não informada";
  return String(hora).slice(0, 5);
}

export default function ExecutarSessaoAssistencial() {
  const { sessaoId } = useParams();
  const navigate = useNavigate();

  const [dados, setDados] = useState(null);
  const [narrativa, setNarrativa] = useState("");
  const [proximosPassos, setProximosPassos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const idValido = Number.isInteger(Number(sessaoId)) && Number(sessaoId) > 0;

    if (!idValido) {
      setErro("Não foi possível identificar a Sessão Assistencial.");
      setLoading(false);
      return undefined;
    }

    let ativo = true;

    async function carregarSessao() {
      setLoading(true);
      setErro("");

      try {
        const resposta = await obterSessaoAssistencial(sessaoId);

        if (ativo) {
          setDados(resposta);
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

    carregarSessao();

    return () => {
      ativo = false;
    };
  }, [sessaoId]);

  const paciente = dados?.paciente;
  const sessao = dados?.sessao;
  const objetivo = dados?.objetivo;
  const atividade = dados?.atividade;
  const profissional = dados?.profissional;
  const resumo = dados?.resumo;

  const progresso = useMemo(() => {
    const percentual = Number(resumo?.percentual_conclusao || 0);
    return Math.min(Math.max(percentual, 0), 100);
  }, [resumo?.percentual_conclusao]);

  const formularioValido = Boolean(narrativa.trim());

  function cancelar() {
    navigate(`/sessoes-assistenciais/${sessaoId}`);
  }

  async function salvar(event) {
    event.preventDefault();

    if (!formularioValido || salvando) return;

    try {
      setSalvando(true);
      setErro("");

      let statusAtual = sessao?.status;

      if (statusAtual === "AGENDADA") {
        await confirmarSessaoAssistencial(sessaoId);
        statusAtual = "CONFIRMADA";
      }

      if (statusAtual === "CONFIRMADA") {
        await iniciarSessaoAssistencial(sessaoId);
        statusAtual = "EM_ANDAMENTO";
      }

      if (statusAtual !== "EM_ANDAMENTO") {
        throw new Error(
          statusAtual === "REALIZADA"
            ? "Este atendimento já foi finalizado."
            : `A sessão não pode ser executada no status ${statusAtual}.`
        );
      }

      await registrarAtendimento(sessaoId, {
        narrativa: narrativa.trim(),
        proximos_passos: proximosPassos,
      });

      await finalizarSessaoAssistencial(sessaoId);

      navigate(`/sessoes-assistenciais/${sessaoId}`);
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvando(false);
    }
  }
  if (loading) {
    return (
      <main style={styles.estadoPagina}>
        <div style={styles.estadoCard}>
          Preparando a Sessão Assistencial...
        </div>
      </main>
    );
  }

  if (!dados) {
    return (
      <main style={styles.estadoPagina}>
        <div role="alert" style={styles.erro}>
          <strong>Não foi possível abrir a sessão.</strong>

          <div style={{ marginTop: 5 }}>
            {erro || "Sessão Assistencial não encontrada."}
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            style={styles.voltar}
          >
            ← Voltar
          </button>
        </div>
      </main>
    );
  }

  return (
    <ClinicalPageLayout
      titulo="🩺 Registrar Atendimento"
      subtitulo="Registre a evolução clínica desta sessão e dê continuidade à jornada assistencial."
      badge="Jornada Assistencial"
    >
      <ClinicalSummaryCard
        paciente={paciente}
        pacienteId={paciente?.id}
      />

      {erro && (
        <div role="alert" style={styles.erro}>
          <strong>Não foi possível continuar.</strong>
          <div style={{ marginTop: 5 }}>{erro}</div>
        </div>
      )}

      <form onSubmit={salvar}>
        <ClinicalSection
          numero={1}
          titulo="Objetivo desta sessão"
          descricao="Revise o planejamento assistencial antes de registrar o atendimento."
        >
          <div style={styles.progressoCabecalho}>
            <div>
              <div style={styles.progressoRotulo}>
                Progresso do planejamento
              </div>

              <div style={styles.progressoValor}>
                {sessao?.numero || "-"}ª Sessão de{" "}
                {resumo?.total_sessoes || "-"}
              </div>

              <div style={styles.progressoStatus}>
                Planejamento em andamento
              </div>
            </div>

            <div style={styles.percentual}>
              {progresso.toFixed(0)}%
            </div>
          </div>

          <div
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={progresso}
            style={styles.barraFundo}
          >
            <div
              style={{
                ...styles.barraProgresso,
                width: `${progresso}%`,
              }}
            />
          </div>

          <div style={styles.gradePlanejamento}>
            <InfoCard
              icone="🎯"
              rotulo="Objetivo terapêutico"
              valor={objetivo?.descricao || "Objetivo não informado"}
            />

            <InfoCard
              icone="🧩"
              rotulo="Atividade planejada"
              valor={atividade?.nome || "Atividade não informada"}
            />

            <InfoCard
              icone="🧑‍⚕️"
              rotulo="Profissional"
              valor={profissional?.nome || "Profissional não informado"}
              detalhe={profissional?.ocupacao}
            />

            <InfoCard
              icone="📅"
              rotulo="Data e horário"
              valor={formatarData(sessao?.data)}
              detalhe={`${formatarHora(sessao?.hora_inicio)} às ${formatarHora(
                sessao?.hora_fim
              )}`}
            />
          </div>
        </ClinicalSection>

        <ClinicalSection
          numero={2}
          titulo="Como foi o atendimento?"
          descricao="Registre os fatos relevantes, a resposta do paciente e a evolução observada."
        >
          <div style={styles.campo}>
            <textarea
              aria-label="Como foi o atendimento?"
              value={narrativa}
              onChange={(event) => setNarrativa(event.target.value)}
              placeholder="Conte como foi o atendimento de hoje..."
              rows={11}
              maxLength={5000}
              style={styles.textarea}
            />

            <span style={styles.contador}>
              {narrativa.length}/5000
            </span>
          </div>

          <div style={styles.ajudaNarrativa}>
            Escreva apenas o necessário para que outro profissional compreenda
            este atendimento.
          </div>
        </ClinicalSection>

        <ClinicalSection
          numero={3}
          titulo="Próximos passos"
          descricao="Sinalize os encaminhamentos que poderão continuar após a conclusão desta sessão."
        >
          <ClinicalEventTypeCards
            items={OPCOES_PROXIMOS_PASSOS}
            value={proximosPassos}
            onChange={setProximosPassos}
            multiple
          />
        </ClinicalSection>

        <ClinicalFooter
          loading={salvando}
          disabled={!formularioValido}
          onCancel={cancelar}
          submitLabel="🩺 Finalizar Atendimento"
        >
          <div style={styles.destino}>
            <span style={styles.destinoIcone}>↗</span>

            <div>
              <strong>Depois de finalizar</strong>

              <div style={styles.destinoTexto}>
                A evolução será vinculada à Sessão Assistencial e passará a
                integrar a Timeline do paciente.
              </div>
            </div>
          </div>
        </ClinicalFooter>
      </form>
    </ClinicalPageLayout>
  );
}

function InfoCard({ icone, rotulo, valor, detalhe }) {
  return (
    <div style={styles.infoCard}>
      <span style={styles.infoIcone}>{icone}</span>

      <div style={{ minWidth: 0 }}>
        <div style={styles.infoRotulo}>{rotulo}</div>
        <div style={styles.infoValor}>{valor}</div>
        {detalhe && <div style={styles.infoDetalhe}>{detalhe}</div>}
      </div>
    </div>
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

  voltar: {
    marginTop: 14,
    padding: "9px 13px",
    border: "1px solid #fecaca",
    borderRadius: 10,
    background: "#ffffff",
    color: "#991b1b",
    cursor: "pointer",
    fontWeight: 800,
  },

  progressoCabecalho: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },

  progressoRotulo: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  progressoValor: {
    marginTop: 4,
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 900,
  },

  progressoStatus: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 13,
    fontWeight: 650,
  },

  percentual: {
    color: "#1d4ed8",
    fontSize: 22,
    fontWeight: 900,
  },

  barraFundo: {
    height: 10,
    marginTop: 12,
    overflow: "hidden",
    borderRadius: 999,
    background: "#e2e8f0",
  },

  barraProgresso: {
    height: "100%",
    minWidth: 0,
    borderRadius: 999,
    background: "linear-gradient(90deg, #2563eb 0%, #0ea5e9 100%)",
    transition: "width 240ms ease",
  },

  gradePlanejamento: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 14,
    marginTop: 20,
  },

  infoCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 13,
    minHeight: 104,
    boxSizing: "border-box",
    padding: 16,
    border: "1px solid #e2e8f0",
    borderRadius: 15,
    background: "#f8fafc",
  },

  infoIcone: {
    fontSize: 27,
    lineHeight: 1,
  },

  infoRotulo: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: 800,
  },

  infoValor: {
    marginTop: 6,
    color: "#0f172a",
    fontSize: 17,
    fontWeight: 850,
    lineHeight: 1.35,
    overflowWrap: "anywhere",
  },

  infoDetalhe: {
    marginTop: 5,
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.4,
  },

  campo: {
    position: "relative",
  },

  textarea: {
    width: "100%",
    minHeight: 280,
    boxSizing: "border-box",
    padding: "16px 16px 34px",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    outline: "none",
    resize: "vertical",
    background: "#ffffff",
    color: "#0f172a",
    fontFamily: "inherit",
    fontSize: 15,
    lineHeight: 1.65,
  },

  contador: {
    position: "absolute",
    right: 13,
    bottom: 11,
    color: "#94a3b8",
    fontSize: 11,
  },

  ajudaNarrativa: {
    marginTop: 10,
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.5,
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