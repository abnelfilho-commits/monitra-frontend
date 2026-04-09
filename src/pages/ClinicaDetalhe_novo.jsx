import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

import { obterClinica } from "../services/clinicas";
import { listarPacientes } from "../services/pacientes";
import { listarTimelinePorPaciente } from "../services/timeline";
import { getApiErrorMessage } from "../utils/errors";

function normalizarTexto(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatarData(data) {
  if (!data) return "-";

  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("pt-BR");
}

function obterDescricaoEvento(item) {
  if (!item) return "";

  return (
    item.descricao ||
    item.observacao ||
    item.resumo ||
    item.texto ||
    item.conteudo ||
    ""
  );
}

function obterDataEvento(item) {
  return item?.data || item?.created_at || item?.updated_at || null;
}

function ordenarTimelineDesc(items = []) {
  return [...items].sort((a, b) => {
    const da = new Date(obterDataEvento(a) || 0).getTime();
    const db = new Date(obterDataEvento(b) || 0).getTime();
    return db - da;
  });
}

/**
 * Classificação baseada em texto narrativo.
 *
 * Regras:
 * - procura sinais fortes de piora / desregulação / crises / regressão
 * - procura sinais intermediários de atenção / instabilidade / monitoramento
 * - procura sinais positivos de melhora / evolução favorável / estabilidade
 * - se não houver evidência útil, retorna "sem_dados"
 */
function classificarStatusPaciente(timeline = []) {
  if (!Array.isArray(timeline) || timeline.length === 0) {
    return "sem_dados";
  }

  const eventosOrdenados = ordenarTimelineDesc(timeline);

  // Considera os eventos mais recentes para refletir o quadro atual
  const eventosRecentes = eventosOrdenados.slice(0, 8);

  const textos = eventosRecentes
    .map((item) => normalizarTexto(obterDescricaoEvento(item)))
    .filter(Boolean);

  if (textos.length === 0) {
    return "sem_dados";
  }

  const textoCompleto = textos.join(" | ");

  const termosAltoRisco = [
    "piora clinica importante",
    "piora clinica significativa",
    "piora importante",
    "regressao importante",
    "regressao clinica",
    "desregulacao importante",
    "desregulacao intensa",
    "desorganizacao importante",
    "crises sensoriais frequentes",
    "crises frequentes",
    "crises intensas",
    "alta frequencia de crises",
    "necessidade de monitoramento intensivo",
    "monitoramento intensivo",
    "observacao clinica mais proxima",
    "agravamento do quadro",
    "agravamento importante",
    "instabilidade importante",
    "quadro grave",
    "quadro severo",
    "sono muito ruim",
    "irritabilidade intensa",
    "agressividade importante",
    "risco elevado",
    "alto risco",
  ];

  const termosAlerta = [
    "piora clinica",
    "piora do quadro",
    "sinais de piora",
    "atencao",
    "alerta",
    "instabilidade",
    "instabilidade clinica",
    "desregulacao",
    "crise sensorial",
    "crises sensoriais",
    "irritabilidade moderada",
    "sono ruim",
    "sono irregular",
    "necessita acompanhamento",
    "monitoramento mais proximo",
    "manter observacao",
    "observacao clinica",
    "oscilacao importante",
    "quadro oscilante",
    "em piora",
    "risco moderado",
  ];

  const termosEstavel = [
    "evolucao favoravel",
    "boa evolucao",
    "quadro estavel",
    "estavel",
    "melhora clinica",
    "melhora importante",
    "melhora progressiva",
    "apresenta melhora",
    "sem intercorrencias",
    "sem sinais de agravamento",
    "bom controle",
    "adaptacao adequada",
    "regulacao adequada",
    "sono adequado",
    "irritabilidade leve",
    "boa resposta",
    "resposta favoravel",
    "manutencao da estabilidade",
    "desenvolvimento satisfatorio",
  ];

  let scoreAlto = 0;
  let scoreAlerta = 0;
  let scoreEstavel = 0;

  for (const termo of termosAltoRisco) {
    if (textoCompleto.includes(termo)) scoreAlto += 3;
  }

  for (const termo of termosAlerta) {
    if (textoCompleto.includes(termo)) scoreAlerta += 2;
  }

  for (const termo of termosEstavel) {
    if (textoCompleto.includes(termo)) scoreEstavel += 2;
  }

  // Heurísticas adicionais por combinações narrativas
  if (
    textoCompleto.includes("piora") &&
    (textoCompleto.includes("crise") || textoCompleto.includes("desregulacao"))
  ) {
    scoreAlto += 3;
  }

  if (
    textoCompleto.includes("frequente") &&
    (textoCompleto.includes("crise") || textoCompleto.includes("sensorial"))
  ) {
    scoreAlto += 2;
  }

  if (
    textoCompleto.includes("monitoramento") &&
    (textoCompleto.includes("intensivo") || textoCompleto.includes("proximo"))
  ) {
    scoreAlto += 2;
  }

  if (
    textoCompleto.includes("evolucao favoravel") ||
    textoCompleto.includes("melhora progressiva")
  ) {
    scoreEstavel += 3;
  }

  // Penaliza estabilidade quando coexistem sinais fortes de piora recente
  if (scoreAlto >= 3) {
    scoreEstavel = Math.max(0, scoreEstavel - 2);
  }

  if (scoreAlto >= 5) return "alto_risco";
  if (scoreAlerta >= 3 || scoreAlto >= 2) return "alerta";
  if (scoreEstavel >= 2) return "estavel";

  return "sem_dados";
}

function getStatusConfig(status) {
  switch (status) {
    case "alto_risco":
      return {
        label: "Alto risco",
        color: "#dc2626",
        bg: "#fee2e2",
        border: "#fecaca",
      };
    case "alerta":
      return {
        label: "Alerta",
        color: "#d97706",
        bg: "#fef3c7",
        border: "#fde68a",
      };
    case "estavel":
      return {
        label: "Estável",
        color: "#16a34a",
        bg: "#dcfce7",
        border: "#bbf7d0",
      };
    default:
      return {
        label: "Sem dados",
        color: "#6b7280",
        bg: "#f3f4f6",
        border: "#e5e7eb",
      };
  }
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 10,
        boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.nome}</div>
      <div style={{ fontSize: 13, color: "#4b5563" }}>
        Quantidade: {item.valor}
      </div>
    </div>
  );
}

export default function ClinicaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [clinica, setClinica] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [timelinesPorPaciente, setTimelinesPorPaciente] = useState({});
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarDados() {
      setLoading(true);
      setErro("");

      try {
        const clinicaId = Number(id);

        const [clinicaData, pacientesData] = await Promise.all([
          obterClinica(clinicaId),
          listarPacientes(),
        ]);

        setClinica(clinicaData || null);

        const pacientesDaClinica = Array.isArray(pacientesData)
          ? pacientesData.filter((p) => Number(p?.clinica_id) === clinicaId)
          : [];

        setPacientes(pacientesDaClinica);

        const timelinesEntries = await Promise.all(
          pacientesDaClinica.map(async (paciente) => {
            try {
              const timeline = await listarTimelinePorPaciente(paciente.id);
              return [paciente.id, Array.isArray(timeline) ? timeline : []];
            } catch (e) {
              console.error(
                `Erro ao carregar timeline do paciente ${paciente.id}:`,
                e
              );
              return [paciente.id, []];
            }
          })
        );

        setTimelinesPorPaciente(Object.fromEntries(timelinesEntries));
      } catch (e) {
        setErro(
          getApiErrorMessage(
            e,
            "Falha ao carregar os dados da clínica."
          )
        );
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, [id]);

  const pacientesComStatus = useMemo(() => {
    return pacientes.map((paciente) => {
      const timeline = timelinesPorPaciente[paciente.id] || [];
      const status = classificarStatusPaciente(timeline);
      const statusConfig = getStatusConfig(status);
      const ultimoEvento = ordenarTimelineDesc(timeline)[0] || null;

      return {
        ...paciente,
        timeline,
        status,
        statusLabel: statusConfig.label,
        statusColor: statusConfig.color,
        statusBg: statusConfig.bg,
        statusBorder: statusConfig.border,
        ultimoEvento,
      };
    });
  }, [pacientes, timelinesPorPaciente]);

  const resumoStatus = useMemo(() => {
    const base = {
      alto_risco: 0,
      alerta: 0,
      estavel: 0,
      sem_dados: 0,
    };

    for (const paciente of pacientesComStatus) {
      base[paciente.status] += 1;
    }

    return base;
  }, [pacientesComStatus]);

  const dadosGrafico = useMemo(() => {
    return [
      { nome: "Alto risco", valor: resumoStatus.alto_risco, color: "#dc2626" },
      { nome: "Alerta", valor: resumoStatus.alerta, color: "#d97706" },
      { nome: "Estável", valor: resumoStatus.estavel, color: "#16a34a" },
      { nome: "Sem dados", valor: resumoStatus.sem_dados, color: "#6b7280" },
    ];
  }, [resumoStatus]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-slate-600">Carregando dados da clínica...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <p className="font-semibold text-red-700">Erro ao carregar</p>
          <p className="mt-2 text-red-600">{erro}</p>

          <div className="mt-4">
            <button
              onClick={() => navigate(-1)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Clínica</p>
            <h1 className="text-2xl font-bold text-slate-900">
              {clinica?.nome || "Detalhe da clínica"}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Painel de evolução clínica e estratificação de risco dos pacientes.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate("/clinicas")}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Alto risco</p>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {resumoStatus.alto_risco}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Alerta</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {resumoStatus.alerta}
          </p>
        </div>

        <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Estáveis</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {resumoStatus.estavel}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Sem dados</p>
          <p className="mt-2 text-3xl font-bold text-slate-500">
            {resumoStatus.sem_dados}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Evolução Clínica
          </h2>
          <p className="text-sm text-slate-600">
            Distribuição atual dos pacientes por classificação clínica.
          </p>
        </div>

        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="valor" radius={[10, 10, 0, 0]}>
                {dadosGrafico.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Pacientes da clínica
          </h2>
          <p className="text-sm text-slate-600">
            Classificação baseada na leitura narrativa dos eventos recentes da
            timeline clínica.
          </p>
        </div>

        {pacientesComStatus.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Nenhum paciente encontrado para esta clínica.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pacientesComStatus.map((paciente) => (
              <div
                key={paciente.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {paciente.nome}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {paciente.responsavel_nome
                        ? `Responsável: ${paciente.responsavel_nome}`
                        : "Responsável não informado"}
                    </p>
                  </div>

                  <span
                    style={{
                      backgroundColor: paciente.statusBg,
                      color: paciente.statusColor,
                      border: `1px solid ${paciente.statusBorder}`,
                    }}
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                  >
                    {paciente.statusLabel}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="text-sm text-slate-600">
                    <span className="font-medium text-slate-700">
                      Último evento:
                    </span>{" "}
                    {paciente.ultimoEvento
                      ? formatarData(obterDataEvento(paciente.ultimoEvento))
                      : "-"}
                  </div>

                  <div className="text-sm text-slate-600">
                    <span className="font-medium text-slate-700">
                      Eventos analisados:
                    </span>{" "}
                    {paciente.timeline?.length || 0}
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                    <span className="font-medium text-slate-800">
                      Resumo narrativo:
                    </span>{" "}
                    {paciente.ultimoEvento
                      ? obterDescricaoEvento(paciente.ultimoEvento)
                      : "Sem descrição clínica recente."}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => navigate(`/pacientes/${paciente.id}`)}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  >
                    Abrir prontuário
                  </button>

                  <button
                    onClick={() => navigate(`/pacientes/${paciente.id}/timeline`)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Ver timeline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
