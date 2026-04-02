import { useEffect, useMemo, useState } from "react";
import VincularResponsavelModal from "../components/VincularResponsavelModal";
import ResponsavelFormModal from "../components/ResponsavelFormModal";
import { useNavigate, useParams } from "react-router-dom";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

import { obterEvolucaoPaciente } from "../services/analytics";
import {
  baixarRelatorioPacientePdf,
  obterPaciente,
  inativarPaciente,
} from "../services/pacientes";
import { listarTimelinePorPaciente } from "../services/timeline";
import { excluirRegistroDiario } from "../services/registros";
import { excluirIntervencao } from "../services/intervencoes";

function formatarSoData(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function formatarData(iso) {
  if (!iso) return "";

  const d = new Date(iso);
  const horas = d.getHours();
  const minutos = d.getMinutes();
  const segundos = d.getSeconds();

  const soData = horas === 0 && minutos === 0 && segundos === 0;

  return soData ? d.toLocaleDateString("pt-BR") : d.toLocaleString("pt-BR");
}

function formatarGenero(genero) {
  if (!genero) return "-";

  if (genero === "M") return "Masculino";
  if (genero === "F") return "Feminino";
  return genero;
}

function classificarStatusPaciente(eventos) {
  if (!eventos || eventos.length === 0) return "sem_dados";

  const registros = eventos.filter((e) => e.tipo_evento === "REGISTRO_DIARIO");
  if (registros.length === 0) return "sem_dados";

  let score = 0;

  registros.forEach((r) => {
    const texto = (r.descricao || "").toLowerCase();

    if (texto.includes("sono: muito bom") || texto.includes("sono: bom")) score += 1;
    if (
      texto.includes("irritabilidade: nenhuma") ||
      texto.includes("irritabilidade: leve")
    )
      score += 1;
    if (
      texto.includes("crise sensorial: não") ||
      texto.includes("crise sensorial: nao")
    )
      score += 1;

    if (texto.includes("sono: ruim") || texto.includes("sono: muito ruim")) score -= 1;
    if (
      texto.includes("irritabilidade: alta") ||
      texto.includes("irritabilidade: muito alta")
    )
      score -= 1;
    if (texto.includes("crise sensorial: alta")) score -= 1;
  });

  if (score >= 2) return "verde";
  if (score <= -2) return "vermelho";

  return "amarelo";
}

function corStatus(status) {
  if (status === "verde") return "#22c55e";
  if (status === "amarelo") return "#eab308";
  if (status === "vermelho") return "#ef4444";

  return "#9ca3af";
}

function corStatusSuave(status) {
  if (status === "verde") return "#f0fdf4";
  if (status === "amarelo") return "#fefce8";
  if (status === "vermelho") return "#fef2f2";
  return "#f3f4f6";
}

function labelStatus(status) {
  if (status === "verde") return "Ótimo";
  if (status === "amarelo") return "Alerta";
  if (status === "vermelho") return "Piorou";
  return "Sem dados clínicos";
}

function resumirTexto(texto, max = 70) {
  if (!texto) return "-";
  return texto.length > max ? `${texto.slice(0, max)}...` : texto;
}

function extrairScoreClinicoDosRegistros(items) {
  const registros = items.filter((item) => item.tipo_evento === "REGISTRO_DIARIO");

  let scoreSono = 0;
  let scoreIrritabilidade = 0;
  let scoreCrise = 0;
  let quantidade = 0;

  registros.forEach((r) => {
    const texto = (r.descricao || "").toLowerCase();
    quantidade += 1;

    if (texto.includes("sono: muito bom")) scoreSono += 5;
    else if (texto.includes("sono: bom")) scoreSono += 4;
    else if (texto.includes("sono: regular")) scoreSono += 3;
    else if (texto.includes("sono: ruim")) scoreSono += 2;
    else if (texto.includes("sono: muito ruim")) scoreSono += 1;

    if (texto.includes("irritabilidade: nenhuma")) scoreIrritabilidade += 5;
    else if (texto.includes("irritabilidade: leve")) scoreIrritabilidade += 4;
    else if (texto.includes("irritabilidade: moderada")) scoreIrritabilidade += 3;
    else if (texto.includes("irritabilidade: alta")) scoreIrritabilidade += 2;
    else if (texto.includes("irritabilidade: muito alta")) scoreIrritabilidade += 1;

    if (
      texto.includes("crise sensorial: não") ||
      texto.includes("crise sensorial: nao")
    ) {
      scoreCrise += 5;
    } else if (texto.includes("crise sensorial: sim")) {
      scoreCrise += 3;
    } else if (texto.includes("crise sensorial: moderada")) {
      scoreCrise += 2;
    } else if (texto.includes("crise sensorial: alta")) {
      scoreCrise += 1;
    }
  });

  if (quantidade === 0) {
    return {
      sono: 0,
      irritabilidade: 0,
      crise: 0,
      totalRegistros: 0,
    };
  }

  return {
    sono: Math.round(scoreSono / quantidade),
    irritabilidade: Math.round(scoreIrritabilidade / quantidade),
    crise: Math.round(scoreCrise / quantidade),
    totalRegistros: quantidade,
  };
}

function labelScore(score) {
  if (score >= 4) return "Ótimo";
  if (score === 3) return "Regular";
  if (score >= 1) return "Atenção";
  return "Sem dados";
}

function formatarDataSerie(data) {
  if (!data) return "";
  return new Date(data).toLocaleDateString("pt-BR");
}

function labelRisco(risco) {
  if (risco === "baixo_risco") return "Baixo risco";
  if (risco === "atencao") return "Atenção";
  if (risco === "alto_risco") return "Alto risco";
  return "Sem dados";
}

function gerarResumoClinico(painel) {
  if (!painel || painel.totalRegistros === 0) {
    return "Ainda não há dados clínicos suficientes para gerar análise.";
  }

  const sono =
    painel.sono >= 4
      ? "sono predominantemente bom"
      : painel.sono === 3
      ? "sono regular"
      : "sono de baixa qualidade";

  const irrit =
    painel.irritabilidade >= 4
      ? "irritabilidade baixa"
      : painel.irritabilidade === 3
      ? "irritabilidade moderada"
      : "irritabilidade elevada";

  const crise =
    painel.crise >= 4
      ? "baixa ocorrência de crises sensoriais"
      : painel.crise === 3
      ? "crises sensoriais ocasionais"
      : "crises sensoriais frequentes";

  let conclusao = "estabilidade clínica";

  if (painel.sono <= 2 || painel.irritabilidade <= 2 || painel.crise <= 2) {
    conclusao = "necessidade de atenção clínica";
  }

  if (painel.sono >= 4 && painel.irritabilidade >= 4 && painel.crise >= 4) {
    conclusao = "boa evolução clínica";
  }

  return `Nos últimos registros observou-se ${sono}, ${irrit} e ${crise}. O quadro geral sugere ${conclusao}.`;
}

function extrairSerieEvolucaoClinica(items) {
  const registros = items
    .filter((item) => item.tipo_evento === "REGISTRO_DIARIO")
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  return registros.map((r) => {
    const texto = (r.descricao || "").toLowerCase();

    let sono = 0;
    let irritabilidade = 0;
    let crise = 0;

    if (texto.includes("sono: muito bom")) sono = 5;
    else if (texto.includes("sono: bom")) sono = 4;
    else if (texto.includes("sono: regular")) sono = 3;
    else if (texto.includes("sono: ruim")) sono = 2;
    else if (texto.includes("sono: muito ruim")) sono = 1;

    if (texto.includes("irritabilidade: nenhuma")) irritabilidade = 5;
    else if (texto.includes("irritabilidade: leve")) irritabilidade = 4;
    else if (texto.includes("irritabilidade: moderada")) irritabilidade = 3;
    else if (texto.includes("irritabilidade: alta")) irritabilidade = 2;
    else if (texto.includes("irritabilidade: muito alta")) irritabilidade = 1;

    if (
      texto.includes("crise sensorial: não") ||
      texto.includes("crise sensorial: nao")
    ) {
      crise = 5;
    } else if (texto.includes("crise sensorial: sim")) {
      crise = 3;
    } else if (texto.includes("crise sensorial: moderada")) {
      crise = 2;
    } else if (texto.includes("crise sensorial: alta")) {
      crise = 1;
    }

    return {
      data: formatarSoData(r.data),
      sono,
      irritabilidade,
      crise,
    };
  });
}

function corScore(score) {
  if (score >= 4) return "#22c55e";
  if (score === 3) return "#eab308";
  if (score >= 1) return "#ef4444";
  return "#9ca3af";
}

function classificarMomentoClinico(painel) {
  if (!painel || painel.totalRegistros === 0) {
    return {
      titulo: "Sem leitura clínica",
      subtitulo: "Ainda não há base suficiente para interpretação automática.",
      corFundo: "#f3f4f6",
      corTexto: "#4b5563",
      borda: "#d1d5db",
    };
  }

  if (painel.sono >= 4 && painel.irritabilidade >= 4 && painel.crise >= 4) {
    return {
      titulo: "Boa evolução clínica",
      subtitulo: "Indicadores recentes sugerem estabilidade favorável do quadro.",
      corFundo: "#f0fdf4",
      corTexto: "#166534",
      borda: "#bbf7d0",
    };
  }

  if (painel.sono <= 2 || painel.irritabilidade <= 2 || painel.crise <= 2) {
    return {
      titulo: "Atenção clínica recomendada",
      subtitulo: "Há sinais recentes que justificam monitoramento mais próximo.",
      corFundo: "#fef2f2",
      corTexto: "#991b1b",
      borda: "#fecaca",
    };
  }

  return {
    titulo: "Estabilidade clínica",
    subtitulo: "Os registros recentes sugerem um quadro relativamente estável.",
    corFundo: "#fefce8",
    corTexto: "#92400e",
    borda: "#fde68a",
  };
}

const buttonBaseStyle = {
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
};

const buttonSecondaryStyle = {
  ...buttonBaseStyle,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
};

const buttonPrimaryStyle = {
  ...buttonBaseStyle,
  border: "none",
  background: "#0f62fe",
  color: "#fff",
};

const buttonDangerStyle = {
  ...buttonBaseStyle,
  background: "#fff5f5",
  border: "1px solid #e0b4b4",
  color: "#a33",
};

export default function Paciente() {
  const { id } = useParams();
  const pacienteId = Number(id);
  const navigate = useNavigate();

  const [paciente, setPaciente] = useState(null);
  const [items, setItems] = useState([]);
  const [evolucaoRisco, setEvolucaoRisco] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [abrirVinculoResponsavel, setAbrirVinculoResponsavel] = useState(false);
  const [abrirCadastroResponsavel, setAbrirCadastroResponsavel] = useState(false);
  const [mensagemResponsavel, setMensagemResponsavel] = useState("");

  const [filtro, setFiltro] = useState("TODOS");

  if (!id || Number.isNaN(pacienteId) || pacienteId <= 0) {
    return (
      <div style={{ padding: 24 }}>
        <p>Paciente inválido.</p>
        <button onClick={() => navigate("/pacientes")}>Ir para Pacientes</button>
      </div>
    );
  }

  async function load() {
    setErro("");
    setLoading(true);

    try {
      const [p, t, evolucao] = await Promise.all([
        obterPaciente(pacienteId),
        listarTimelinePorPaciente(pacienteId),
        obterEvolucaoPaciente(pacienteId),
      ]);

      setPaciente(p);
      setItems(Array.isArray(t) ? t : []);
      setEvolucaoRisco(Array.isArray(evolucao?.serie) ? evolucao.serie : []);
    } catch (e) {
      const msg =
        e?.response?.data?.detail || e?.message || "Falha ao carregar paciente.";
      setErro(String(msg));
    } finally {
      setLoading(false);
    }
  }

  async function onBaixarRelatorioPdf() {
    try {
      const blob = await baixarRelatorioPacientePdf(pacienteId);
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio_paciente_${pacienteId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Falha ao gerar relatorio PDF.";
      setErro(String(msg));
    }
  }

  async function onInativar() {
    const ok = window.confirm(
      "Deseja realmente inativar este paciente? Ele deixará de aparecer na lista principal."
    );

    if (!ok) return;

    try {
      await inativarPaciente(pacienteId);
      navigate("/pacientes");
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Falha ao inativar paciente.";
      setErro(String(msg));
    }
  }

  async function onExcluirEvento(item) {
    const tipoLabel =
      item.tipo_evento === "INTERVENCAO" ? "intervenção" : "registro diário";

    const ok = window.confirm(`Deseja realmente excluir esta ${tipoLabel}?`);
    if (!ok) return;

    try {
      if (item.tipo_evento === "INTERVENCAO") {
        await excluirIntervencao(item.id);
      } else if (item.tipo_evento === "REGISTRO_DIARIO") {
        await excluirRegistroDiario(item.id);
      }

      await load();
    } catch (e) {
      const msg =
        e?.response?.data?.detail || e?.message || "Falha ao excluir evento.";
      setErro(String(msg));
    }
  }

  useEffect(() => {
    load();
  }, [pacienteId]);

  const totalIntervencoes = useMemo(
    () => items.filter((item) => item.tipo_evento === "INTERVENCAO").length,
    [items]
  );

  const totalRegistros = useMemo(
    () => items.filter((item) => item.tipo_evento === "REGISTRO_DIARIO").length,
    [items]
  );

  const ultimoEvento = useMemo(() => {
    if (!items.length) return null;
    return [...items].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    )[0];
  }, [items]);

  const graficoEventosPorData = useMemo(() => {
    const mapa = {};

    items.forEach((item) => {
      const data = formatarSoData(item.data);
      if (!mapa[data]) {
        mapa[data] = {
          data,
          intervencoes: 0,
          registros: 0,
        };
      }

      if (item.tipo_evento === "INTERVENCAO") {
        mapa[data].intervencoes += 1;
      }

      if (item.tipo_evento === "REGISTRO_DIARIO") {
        mapa[data].registros += 1;
      }
    });

    return Object.values(mapa).sort((a, b) => {
      const [da, ma, aa] = a.data.split("/");
      const [db, mb, ab] = b.data.split("/");
      return new Date(`${aa}-${ma}-${da}`) - new Date(`${ab}-${mb}-${db}`);
    });
  }, [items]);

  const graficoDistribuicao = useMemo(() => {
    return [
      { name: "Intervenções", value: totalIntervencoes },
      { name: "Registros", value: totalRegistros },
    ];
  }, [totalIntervencoes, totalRegistros]);

  const ordenados = useMemo(() => {
    const base = [...items].sort((a, b) => {
      const da = new Date(a?.data || 0).getTime();
      const db = new Date(b?.data || 0).getTime();
      return db - da;
    });

    if (filtro === "INTERVENCAO") {
      return base.filter((item) => item.tipo_evento === "INTERVENCAO");
    }

    if (filtro === "REGISTRO_DIARIO") {
      return base.filter((item) => item.tipo_evento === "REGISTRO_DIARIO");
    }

    return base;
  }, [items, filtro]);

  const statusPaciente = useMemo(() => {
    return classificarStatusPaciente(items);
  }, [items]);

  const painelClinico = useMemo(() => {
    return extrairScoreClinicoDosRegistros(items);
  }, [items]);

  const resumoClinico = useMemo(() => {
    return gerarResumoClinico(painelClinico);
  }, [painelClinico]);

  const evolucaoClinica = useMemo(() => {
    return extrairSerieEvolucaoClinica(items);
  }, [items]);

  const serieRiscoClinico = useMemo(() => {
    return evolucaoRisco.map((item) => ({
      data: formatarDataSerie(item.data),
      risco: item.pontuacao_risco,
      classificacao: labelRisco(item.risco),
    }));
  }, [evolucaoRisco]);

  const leituraClinica = useMemo(() => {
    return classificarMomentoClinico(painelClinico);
  }, [painelClinico]);

  if (loading) return <div style={{ padding: 24 }}>Carregando...</div>;

  return (
    <>
      <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>
              Paciente: {paciente?.nome || `#${pacienteId}`}
            </h2>

            <p style={{ marginTop: 8 }}>
              <b>Nascimento:</b> {formatarSoData(paciente?.data_nascimento) || "-"}
              {paciente?.idade != null ? (
                <>
                  {" "} | <b>Idade:</b> {paciente.idade} anos
                </>
              ) : null}
              {" | "}
              <b>Gênero:</b> {formatarGenero(paciente?.genero)}
            </p>

            <p style={{ marginTop: 6 }}>
              <b>Profissional:</b> {paciente?.profissional_nome || "-"}
              {" | "}
              <b>Clínica:</b> {paciente?.clinica_nome || "-"}
            </p>

            {(paciente?.responsavel_nome || paciente?.responsavel_email) && (
              <p style={{ marginTop: 6 }}>
                {paciente?.responsavel_nome ? (
                  <>
                    <b>Responsável:</b> {paciente.responsavel_nome}
                  </>
                ) : null}

                {paciente?.responsavel_nome && paciente?.responsavel_email
                  ? " | "
                  : null}

                {paciente?.responsavel_email ? (
                  <>
                    <b>Email:</b> {paciente.responsavel_email}
                  </>
                ) : null}
              </p>
            )}

            <div
              style={{
                marginTop: 12,
                padding: "12px 14px",
                borderRadius: 12,
                background: corStatusSuave(statusPaciente),
                border: `1px solid ${corStatus(statusPaciente)}`,
                color: "#111",
                fontWeight: 700,
                display: "inline-block",
              }}
            >
              Status clínico atual: {labelStatus(statusPaciente)}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => navigate(`/pacientes/${pacienteId}/editar`)}
              style={buttonSecondaryStyle}
            >
              Editar Paciente
            </button>

            <button
              type="button"
              onClick={() => setAbrirCadastroResponsavel(true)}
              style={buttonPrimaryStyle}
            >
              Novo responsável
            </button>

            <button
              type="button"
              onClick={() => setAbrirVinculoResponsavel(true)}
              style={buttonSecondaryStyle}
            >
              Vincular responsável
            </button>

            <button
              onClick={() => navigate(`/pacientes/${pacienteId}/registro/novo`)}
              style={buttonSecondaryStyle}
            >
              + Registro Diário
            </button>

            <button
              onClick={() => navigate(`/pacientes/${pacienteId}/intervencao/nova`)}
              style={buttonSecondaryStyle}
            >
              + Intervenção
            </button>

            <button onClick={onBaixarRelatorioPdf} style={buttonSecondaryStyle}>
              Gerar PDF
            </button>

            <button onClick={load} style={buttonSecondaryStyle}>
              ↻ Atualizar
            </button>

            <button onClick={onInativar} style={buttonDangerStyle}>
              Inativar Paciente
            </button>
          </div>
        </div>

        {mensagemResponsavel ? (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 10,
              background: "#ecfdf3",
              border: "1px solid #abefc6",
              color: "#067647",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {mensagemResponsavel}
          </div>
        ) : null}

        {erro && <p style={{ color: "red" }}>{erro}</p>}

        <div
          style={{
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              background: "white",
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.75 }}>Intervenções</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
              {totalIntervencoes}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              background: "white",
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.75 }}>Registros diários</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
              {totalRegistros}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              background: "white",
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.75 }}>Último evento</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>
              {ultimoEvento
                ? ultimoEvento.tipo_evento === "INTERVENCAO"
                  ? "Intervenção"
                  : "Registro diário"
                : "-"}
            </div>
            <div style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>
              {ultimoEvento ? formatarData(ultimoEvento.data) : "-"}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              background: "white",
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.75 }}>Resumo recente</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>
              {ultimoEvento ? resumirTexto(ultimoEvento.descricao, 70) : "-"}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
            border: `1px solid ${leituraClinica.borda}`,
            borderRadius: 16,
            padding: 18,
            background: `linear-gradient(180deg, ${leituraClinica.corFundo} 0%, #ffffff 100%)`,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  color: leituraClinica.corTexto,
                }}
              >
                Inteligência clínica
              </div>

              <h3 style={{ marginTop: 6, marginBottom: 6 }}>
                Resumo clínico automático
              </h3>

              <div style={{ color: leituraClinica.corTexto, fontWeight: 700 }}>
                {leituraClinica.titulo}
              </div>

              <div style={{ marginTop: 6, color: "#4b5563", maxWidth: 760 }}>
                {leituraClinica.subtitulo}
              </div>
            </div>

            <div
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                fontSize: 12,
                fontWeight: 700,
                color: "#374151",
              }}
            >
              Base:{" "}
              {painelClinico.totalRegistros > 0
                ? `${painelClinico.totalRegistros} registro(s)`
                : "Sem dados"}
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 12,
              background: "rgba(255,255,255,0.85)",
              border: "1px solid #e5e7eb",
            }}
          >
            <p
              style={{
                margin: 0,
                lineHeight: 1.7,
                fontSize: 15,
                color: "#1f2937",
              }}
            >
              {resumoClinico}
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
            border: "1px solid #ddd",
            borderRadius: 14,
            padding: 16,
            background: "white",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Painel Clínico Inteligente</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 14,
                background: "#ffffff",
              }}
            >
              <div style={{ fontSize: 13, opacity: 0.75 }}>Sono</div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 20,
                  fontWeight: 800,
                  color: corScore(painelClinico.sono),
                }}
              >
                {labelScore(painelClinico.sono)}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                Score médio dos registros recentes
              </div>
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 14,
                background: "#ffffff",
              }}
            >
              <div style={{ fontSize: 13, opacity: 0.75 }}>Irritabilidade</div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 20,
                  fontWeight: 800,
                  color: corScore(painelClinico.irritabilidade),
                }}
              >
                {labelScore(painelClinico.irritabilidade)}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                Tendência observada nos registros
              </div>
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 14,
                background: "#ffffff",
              }}
            >
              <div style={{ fontSize: 13, opacity: 0.75 }}>Crise sensorial</div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 20,
                  fontWeight: 800,
                  color: corScore(painelClinico.crise),
                }}
              >
                {labelScore(painelClinico.crise)}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                Frequência/gravidade observada
              </div>
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 14,
                background: "#ffffff",
              }}
            >
              <div style={{ fontSize: 13, opacity: 0.75 }}>Base clínica</div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 20,
                  fontWeight: 800,
                  color:
                    painelClinico.totalRegistros > 0 ? "#111827" : "#9ca3af",
                }}
              >
                {painelClinico.totalRegistros > 0
                  ? `${painelClinico.totalRegistros} registro(s)`
                  : "Sem dados"}
              </div>

              <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                Quantidade de registros usados no painel
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "white",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Evolução clínica</h3>
          <div
            style={{
              marginTop: 4,
              marginBottom: 14,
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            Visualiza a trajetória clínica do paciente a partir dos registros
            diários.
          </div>

          {evolucaoClinica.length === 0 ? (
            <p>Nenhum dado suficiente para exibir evolução clínica.</p>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={evolucaoClinica}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis domain={[0, 5]} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sono"
                    name="Sono"
                    stroke="#22c55e"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="irritabilidade"
                    name="Irritabilidade"
                    stroke="#eab308"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="crise"
                    name="Crise sensorial"
                    stroke="#ef4444"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 18,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "white",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Linha de regressão clínica</h3>
          <div
            style={{
              marginTop: 4,
              marginBottom: 14,
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            Mostra a variação da pontuação de risco ao longo do tempo.
          </div>

          {serieRiscoClinico.length === 0 ? (
            <p>Nenhum dado suficiente para exibir regressão clínica.</p>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={serieRiscoClinico}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="risco"
                    name="Pontuação de risco"
                    stroke="#2563eb"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
            Quanto menor a pontuação, melhor o quadro clínico. Quanto maior,
            maior o risco.
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 16,
          }}
        >
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              background: "white",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Eventos por data</h3>

            {graficoEventosPorData.length === 0 ? (
              <p>Nenhum dado disponível.</p>
            ) : (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={graficoEventosPorData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="intervencoes"
                      fill="#2563eb"
                      name="Intervenções"
                    />
                    <Bar
                      dataKey="registros"
                      fill="#22c55e"
                      name="Registros"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
              background: "white",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Distribuição dos eventos</h3>

            {totalIntervencoes === 0 && totalRegistros === 0 ? (
              <p>Nenhum dado disponível.</p>
            ) : (
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={graficoDistribuicao}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label
                    >
                      <Cell fill="#2563eb" />
                      <Cell fill="#22c55e" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <hr style={{ margin: "16px 0" }} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h3 style={{ margin: 0 }}>Timeline Clínica</h3>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => setFiltro("TODOS")}
              style={{
                ...buttonSecondaryStyle,
                fontWeight: filtro === "TODOS" ? "bold" : "normal",
              }}
            >
              Todos
            </button>

            <button
              onClick={() => setFiltro("INTERVENCAO")}
              style={{
                ...buttonSecondaryStyle,
                fontWeight: filtro === "INTERVENCAO" ? "bold" : "normal",
              }}
            >
              Intervenções
            </button>

            <button
              onClick={() => setFiltro("REGISTRO_DIARIO")}
              style={{
                ...buttonSecondaryStyle,
                fontWeight: filtro === "REGISTRO_DIARIO" ? "bold" : "normal",
              }}
            >
              Registros Diários
            </button>
          </div>
        </div>

        {ordenados.length === 0 ? (
          <p style={{ marginTop: 16 }}>Nenhum evento encontrado para este filtro.</p>
        ) : (
          <div
            style={{
              marginTop: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {ordenados.map((item) => {
              const isIntervencao = item.tipo_evento === "INTERVENCAO";
              const origem =
                item.origem || (isIntervencao ? "PROFISSIONAL" : "PROFISSIONAL");

              const badgeStyle = {
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                display: "inline-block",
                marginBottom: 8,
                background: origem === "RESPONSAVEL" ? "#dcfce7" : "#dbeafe",
                color: origem === "RESPONSAVEL" ? "#166534" : "#1d4ed8",
                border:
                  origem === "RESPONSAVEL"
                    ? "1px solid #86efac"
                    : "1px solid #93c5fd",
              };

              return (
                <div
                  key={`${item.tipo_evento}-${item.id}`}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    padding: 12,
                    background: isIntervencao ? "#f5f9ff" : "#f9fff5",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <span style={badgeStyle}>
                        {origem === "RESPONSAVEL" ? "Responsável" : "Profissional"}
                      </span>

                      <div style={{ marginTop: 6 }}>
                        <b>{isIntervencao ? "🧠 Intervenção" : "📋 Registro Diário"}</b>
                      </div>

                      {origem === "RESPONSAVEL" && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#64748b",
                            marginTop: 4,
                          }}
                        >
                          Dados reportados pela família
                        </div>
                      )}

                      <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                        {item.descricao}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <small>{formatarData(item.data)}</small>

                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 8,
                          justifyContent: "flex-end",
                          flexWrap: "wrap",
                        }}
                      >
                        {item.tipo_evento === "REGISTRO_DIARIO" && (
                          <button
                            onClick={() =>
                              navigate(`/pacientes/${pacienteId}/registros/${item.id}/editar`)
                            }
                            style={buttonSecondaryStyle}
                          >
                            Editar
                          </button>
                        )}

                        {item.tipo_evento === "INTERVENCAO" && (
                          <button
                            onClick={() =>
                              navigate(
                                `/pacientes/${pacienteId}/intervencoes/${item.id}/editar`
                              )
                            }
                            style={buttonSecondaryStyle}
                          >
                            Editar
                          </button>
                        )}

                        <button
                          onClick={() => onExcluirEvento(item)}
                          style={buttonDangerStyle}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <VincularResponsavelModal
        aberto={abrirVinculoResponsavel}
        pacienteId={paciente?.id}
        onClose={() => setAbrirVinculoResponsavel(false)}
        onSuccess={() => {
          setMensagemResponsavel("Responsável vinculado com sucesso.");
          setTimeout(() => setMensagemResponsavel(""), 3000);
          load();
        }}
      />

      <ResponsavelFormModal
        aberto={abrirCadastroResponsavel}
        onClose={() => setAbrirCadastroResponsavel(false)}
        onSuccess={() => {
          setMensagemResponsavel("Responsável cadastrado com sucesso.");
          setTimeout(() => setMensagemResponsavel(""), 3000);
          load();
        }}
      />
    </>
  );
}
