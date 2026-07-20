import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ClinicalFooter from "../components/clinical/ClinicalFooter";
import ClinicalSection from "../components/clinical/ClinicalSection";
import ClinicalEventTypeCards from "../components/clinical/ClinicalEventTypeCards";
import ClinicalSummaryCard from "../components/clinical/ClinicalSummaryCard";

import Button from "../components/ui/Button";
import { obterPaciente } from "../services/pacientes";
import { registrarDiagnostico } from "../services/diagnosticos";


const TIPOS_DIAGNOSTICO = [
  {
    valor: "HIPOTESE",
    icone: "🟡",
    titulo: "Hipótese",
    descricao: "Registre uma possibilidade clínica que ainda será investigada.",
    cor: "#ca8a04",
    fundo: "#fefce8",
    borda: "#fde68a",
  },
  {
    valor: "DIAGNOSTICO",
    icone: "🟢",
    titulo: "Diagnóstico",
    descricao: "Registre uma conclusão clínica estabelecida para o paciente.",
    cor: "#15803d",
    fundo: "#f0fdf4",
    borda: "#bbf7d0",
  },
  {
    valor: "REVISAO",
    icone: "🔵",
    titulo: "Revisão",
    descricao: "Atualize ou reavalie um diagnóstico já registrado na jornada.",
    cor: "#1d4ed8",
    fundo: "#eff6ff",
    borda: "#bfdbfe",
  },
];

function dataLocalHoje() {
  const agora = new Date();
  const offset = agora.getTimezoneOffset() * 60 * 1000;
  return new Date(agora.getTime() - offset).toISOString().slice(0, 10);
}

function formatarData(data) {
  if (!data) return "-";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function extrairMensagemErro(error) {
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg)
      .filter(Boolean)
      .join(" ");
  }

  return String(detail || error?.message || "Não foi possível registrar o diagnóstico.");
}

export default function RegistrarDiagnostico() {
  const { id, pacienteId: pacienteIdParam } = useParams();
  const pacienteId = Number(pacienteIdParam || id);
  const navigate = useNavigate();

  const [paciente, setPaciente] = useState(null);
  const [tipo, setTipo] = useState("");
  const [cid, setCid] = useState("");
  const [descricaoClinica, setDescricaoClinica] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [dataDiagnostico] = useState(dataLocalHoje);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const pacienteValido = Number.isInteger(pacienteId) && pacienteId > 0;

  useEffect(() => {
    if (!pacienteValido) {
      setErro("Não foi possível identificar o paciente deste registro.");
      setLoading(false);
      return;
    }

    let ativo = true;

    async function carregarPaciente() {
      setLoading(true);
      setErro("");

      try {
        const dados = await obterPaciente(pacienteId);
        if (ativo) setPaciente(dados);
      } catch (error) {
        if (ativo) setErro(extrairMensagemErro(error));
      } finally {
        if (ativo) setLoading(false);
      }
    }

    carregarPaciente();

    return () => {
      ativo = false;
    };
  }, [pacienteId, pacienteValido]);

  const tipoSelecionado = useMemo(
    () => TIPOS_DIAGNOSTICO.find((item) => item.valor === tipo),
    [tipo]
  );

  const formularioValido = Boolean(tipo && descricaoClinica.trim());

  function cancelar() {
    navigate(`/pacientes/${pacienteId}`);
  }

  async function salvar(event) {
    event.preventDefault();
    if (salvando) return;

    setErro("");

    if (!tipo) {
      setErro("Escolha se este registro é uma hipótese, um diagnóstico ou uma revisão.");
      return;
    }

    if (!descricaoClinica.trim()) {
      setErro("Descreva a conclusão ou percepção clínica que está sendo registrada.");
      return;
    }

    setSalvando(true);

    try {
      const diagnostico = await registrarDiagnostico({
        paciente_id: pacienteId,
        tipo,
        cid,
        descricao_clinica: descricaoClinica,
        data_diagnostico: dataDiagnostico,
        medico_nome: paciente?.profissional_nome || null,
        observacoes,
      });

      const diagnosticoId = diagnostico?.id;

      if (!diagnosticoId) {
        throw new Error("O diagnóstico foi registrado, mas não foi possível abrir seus detalhes.");
      }

      navigate(`/diagnosticos/${diagnosticoId}`, { replace: true });
    } catch (error) {
      setErro(extrairMensagemErro(error));
    } finally {
      setSalvando(false);
    }
  }

  if (loading) {
    return (
      <main style={styles.pagina}>
        <div style={styles.loading}>Preparando o registro clínico...</div>
      </main>
    );
  }

  return (
    <main style={styles.pagina}>
      <div style={styles.conteudo}>
        <header style={styles.cabecalho}>
          <div>
            <div style={styles.sobretitulo}>REGISTRO CLÍNICO INTELIGENTE</div>
            <h1 style={styles.titulo}>🩺 Registrar Diagnóstico</h1>
            <p style={styles.subtitulo}>
              Registre um novo marco na jornada clínica do paciente.
            </p>
          </div>

          <div style={styles.etapa}>Jornada Assistencial</div>
        </header>

        <ClinicalSummaryCard
            paciente={paciente}
            pacienteId={pacienteId}
        />

        {erro && (
          <div role="alert" style={styles.erro}>
            <strong>Não foi possível continuar.</strong>
            <div style={{ marginTop: 4 }}>{erro}</div>
          </div>
        )}
        <form onSubmit={salvar}>
          <ClinicalSection
            numero={1}
            titulo="Qual evento clínico está sendo registrado?"
            descricao="Escolha o tipo que melhor representa este momento da jornada."
          >
            <ClinicalEventTypeCards
              items={TIPOS_DIAGNOSTICO}
              value={tipo}
              onChange={setTipo}
            />
          </ClinicalSection>

          <ClinicalSection
            numero={2}
            titulo="Informações clínicas"
            descricao="Descreva o que foi identificado neste momento do cuidado."
          >
            <div style={styles.gradeCampos}>
              <label style={styles.campo}>
                <span style={styles.label}>CID</span>
                <input
                  value={cid}
                  onChange={(event) => setCid(event.target.value)}
                  placeholder="Ex.: F84.0"
                  maxLength={30}
                  style={styles.input}
                />
                <span style={styles.ajuda}>Opcional nesta etapa.</span>
              </label>
            </div>

            <label style={{ ...styles.campo, marginTop: 18 }}>
              <span style={styles.label}>Descrição clínica *</span>
              <textarea
                value={descricaoClinica}
                onChange={(event) => setDescricaoClinica(event.target.value)}
                placeholder="Descreva os sinais observados, a conclusão clínica e os elementos que sustentam este registro..."
                rows={6}
                maxLength={4000}
                style={styles.textarea}
              />
              <span style={styles.contador}>
                {descricaoClinica.length}/4000
              </span>
            </label>
          </ClinicalSection>

          <ClinicalSection
            numero={3}
            titulo="Contexto Assistencial"
            descricao="Estas informações acompanham automaticamente o evento clínico."
          >
            <div style={styles.gradeContexto}>
              <div style={styles.cardContexto}>
                <span style={styles.iconeContexto}>📅</span>

                <div>
                  <div style={styles.rotuloContexto}>Data do registro</div>
                  <div style={styles.valorContexto}>
                    {formatarData(dataDiagnostico)}
                  </div>
                </div>
              </div>

              <div style={styles.cardContexto}>
                <span style={styles.iconeContexto}>🧑‍⚕️</span>

                <div>
                  <div style={styles.rotuloContexto}>Profissional</div>
                  <div style={styles.valorContexto}>
                    {paciente?.profissional_nome || "Profissional autenticado"}
                  </div>
                </div>
              </div>
            </div>

            <label style={{ ...styles.campo, marginTop: 18 }}>
              <span style={styles.label}>Observações</span>
              <textarea
                value={observacoes}
                onChange={(event) => setObservacoes(event.target.value)}
                placeholder="Inclua informações complementares, orientações ou pontos que deverão ser acompanhados..."
                rows={4}
                maxLength={2000}
                style={styles.textarea}
              />
              <span style={styles.contador}>
                {observacoes.length}/2000
              </span>
            </label>
          </ClinicalSection>

          <ClinicalFooter
            loading={salvando}
            disabled={!formularioValido}
            onCancel={cancelar}
            submitLabel="🩺 Registrar Diagnóstico"
          >
            <span style={{ fontSize: 20 }}>↗</span>

            <div>
              <strong>Depois de registrar</strong>

              <div style={styles.destinoTexto}>
                Você será direcionado ao Diagnóstico 360°, onde este evento passa a integrar a jornada clínica.
              </div>
            </div>
          </ClinicalFooter>
        </form>
      </div>
    </main>
  );
}

const styles = {
  pagina: {
    minHeight: "100%",
    padding: "28px 24px 48px",
    background: "#f8fafc",
  },
  conteudo: {
    width: "100%",
    maxWidth: 1180,
    margin: "0 auto",
  },
  loading: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: 18,
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    background: "#ffffff",
    color: "#475569",
  },
  cabecalho: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 20,
  },
  sobretitulo: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.8,
    color: "#2563eb",
  },
  titulo: {
    margin: "6px 0 0",
    color: "#0f172a",
    fontSize: "clamp(28px, 4vw, 40px)",
    lineHeight: 1.15,
  },
  subtitulo: {
    margin: "10px 0 0",
    color: "#64748b",
    fontSize: 16,
  },
  etapa: {
    padding: "9px 14px",
    borderRadius: 999,
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: 800,
  },
  erro: {
    marginBottom: 18,
    padding: 15,
    border: "1px solid #fecaca",
    borderRadius: 14,
    background: "#fef2f2",
    color: "#991b1b",
  },
  gradeTipos: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  },
  cardTipo: {
    minHeight: 188,
    padding: 18,
    border: "1px solid #e2e8f0",
    borderRadius: 17,
    textAlign: "left",
    cursor: "pointer",
    transition: "all 160ms ease",
    fontFamily: "inherit",
  },
  iconeTipo: {
    display: "block",
    fontSize: 28,
  },
  tituloTipo: {
    display: "block",
    marginTop: 12,
    fontSize: 18,
    fontWeight: 900,
  },
  descricaoTipo: {
    display: "block",
    minHeight: 56,
    marginTop: 8,
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.45,
  },
  marcadorTipo: {
    display: "block",
    marginTop: 12,
    fontSize: 12,
    fontWeight: 900,
  },
  gradeCampos: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
  },
  campo: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: 800,
    color: "#334155",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    outline: "none",
    fontSize: 15,
    color: "#0f172a",
    background: "#ffffff",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px 28px",
    border: "1px solid #cbd5e1",
    borderRadius: 13,
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    fontSize: 15,
    lineHeight: 1.55,
    color: "#0f172a",
    background: "#ffffff",
  },
  ajuda: {
    color: "#94a3b8",
    fontSize: 12,
  },
  contador: {
    position: "absolute",
    right: 11,
    bottom: 9,
    color: "#94a3b8",
    fontSize: 11,
  },
  contextoTipo: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  valorAutomatico: {
    padding: "12px 13px",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    background: "#f8fafc",
    color: "#334155",
    fontSize: 15,
    fontWeight: 800,
  },
  gradeContexto: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 14,
  },
  cardContexto: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 15,
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    background: "#f8fafc",
  },
  iconeContexto: {
    fontSize: 24,
  },
  rotuloContexto: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 700,
  },
  valorContexto: {
    marginTop: 3,
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 850,
  },
  rodape: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
    padding: 20,
    marginTop: 18,
    border: "1px solid #dbeafe",
    borderRadius: 18,
    background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 82%)",
  },
  destino: {
    flex: "1 1 480px",
    display: "flex",
    alignItems: "flex-start",
    gap: 11,
    color: "#1e3a8a",
  },
  destinoTexto: {
    marginTop: 4,
    color: "#475569",
    fontSize: 13,
    lineHeight: 1.5,
  },
  acoes: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
};
