import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listarPacientes } from "../services/pacientes";
import { listarTimelinePorPaciente } from "../services/timeline";
import { obterRiscoPaciente } from "../services/analytics";
import Button from "../components/ui/Button";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function formatarData(iso) {
  if (!iso) return "";

  const d = new Date(iso);
  const horas = d.getHours();
  const minutos = d.getMinutes();
  const segundos = d.getSeconds();

  const soData = horas === 0 && minutos === 0 && segundos === 0;

  return soData
    ? d.toLocaleDateString("pt-BR")
    : d.toLocaleString("pt-BR");
}

function resumirNome(nome, max = 18) {
  if (!nome) return "-";
  return nome.length > max ? `${nome.slice(0, max)}...` : nome;
}

function classificarStatusPaciente(eventos) {
  if (!eventos || eventos.length === 0) return "sem_dados";

  const registros = eventos.filter((e) => e.tipo_evento === "REGISTRO_DIARIO");
  if (registros.length === 0) return "sem_dados";

  let score = 0;

  registros.forEach((r) => {
    const texto = (r.descricao || "").toLowerCase();

    if (texto.includes("sono: muito bom") || texto.includes("sono: bom")) score += 1;
    if (texto.includes("irritabilidade: nenhuma") || texto.includes("irritabilidade: leve")) score += 1;
    if (texto.includes("crise sensorial: não") || texto.includes("crise sensorial: nao")) score += 1;

    if (texto.includes("sono: ruim") || texto.includes("sono: muito ruim")) score -= 1;
    if (texto.includes("irritabilidade: alta") || texto.includes("irritabilidade: muito alta")) score -= 1;
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
  return "Sem dados";
}

function corRisco(risco) {
  if (risco === "baixo_risco") return "#22c55e";
  if (risco === "atencao") return "#eab308";
  if (risco === "alto_risco") return "#ef4444";
  return "#9ca3af";
}

function corRiscoTexto(risco) {
  if (risco === "baixo_risco") return "#166534";
  if (risco === "atencao") return "#92400e";
  if (risco === "alto_risco") return "#991b1b";
  return "#4b5563";
}

function labelRisco(risco) {
  if (risco === "baixo_risco") return "Baixo risco";
  if (risco === "atencao") return "Atenção";
  if (risco === "alto_risco") return "Alto risco";
  return "Sem dados";
}

function prioridadeNumerica(risco) {
  if (risco === "alto_risco") return 3;
  if (risco === "atencao") return 2;
  if (risco === "baixo_risco") return 1;
  return 0;
}

function labelTendencia(tendencia) {
  if (tendencia === "piora") return "Em piora";
  if (tendencia === "estavel") return "Estável";
  if (tendencia === "melhora") return "Em melhora";
  return "Sem leitura";
}

function TooltipCustom({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 10,
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload.map((item, index) => (
        <div key={index} style={{ fontSize: 13 }}>
          {item.name}: {item.value}
        </div>
      ))}
    </div>
  );
}

function CardIndicador({
  titulo,
  valor,
  subtitulo,
  background = "white",
  corValor = "#111827",
}) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 14,
        padding: 16,
        background,
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.75 }}>{titulo}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6, color: corValor }}>
        {valor}
      </div>
      {subtitulo ? (
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>{subtitulo}</div>
      ) : null}
    </div>
  );
}

function TituloSecao({ children }) {
  return (
    <h3
      style={{
        marginTop: 0,
        marginBottom: 14,
        fontSize: 18,
      }}
    >
      {children}
    </h3>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [pacientes, setPacientes] = useState([]);
  const [timelinesPorPaciente, setTimelinesPorPaciente] = useState({});
  const [riscosPorPaciente, setRiscosPorPaciente] = useState({});
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  async function loadDashboard() {
    setErro("");
    setLoading(true);

    try {
      const listaPacientes = await listarPacientes();

      const pacientesArray = Array.isArray(listaPacientes) ? listaPacientes : [];
      setPacientes(pacientesArray);

      const [timelineEntries, riscoEntries] = await Promise.all([
        Promise.all(
          pacientesArray.map(async (p) => {
            try {
              const timeline = await listarTimelinePorPaciente(p.id);
              return [p.id, Array.isArray(timeline) ? timeline : []];
            } catch {
              return [p.id, []];
            }
          })
        ),
        Promise.all(
          pacientesArray.map(async (p) => {
            try {
              const risco = await obterRiscoPaciente(p.id);
              return [p.id, risco];
            } catch {
              return [p.id, null];
            }
          })
        ),
      ]);

      setTimelinesPorPaciente(Object.fromEntries(timelineEntries));
      setRiscosPorPaciente(Object.fromEntries(riscoEntries));
    } catch (e) {
      const msg =
        e?.response?.data?.detail || e?.message || "Falha ao carregar dashboard.";
      setErro(String(msg));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const analitico = useMemo(() => {
    const pacientesComEventos = pacientes.map((p) => {
      const eventos = timelinesPorPaciente[p.id] || [];

      const intervencoes = eventos.filter((ev) => ev.tipo_evento === "INTERVENCAO").length;
      const registros = eventos.filter((ev) => ev.tipo_evento === "REGISTRO_DIARIO").length;
      const status = classificarStatusPaciente(eventos);
      const risco = riscosPorPaciente[p.id] || null;

      return {
        ...p,
        eventos,
        risco,
        totalEventos: eventos.length,
        totalIntervencoes: intervencoes,
        totalRegistros: registros,
        status,
      };
    });

    const totalPacientes = pacientesComEventos.length;
    const totalIntervencoes = pacientesComEventos.reduce((acc, p) => acc + p.totalIntervencoes, 0);
    const totalRegistros = pacientesComEventos.reduce((acc, p) => acc + p.totalRegistros, 0);

    const pacienteComMaisEventos =
      [...pacientesComEventos].sort((a, b) => b.totalEventos - a.totalEventos)[0] || null;

    const eventosRecentes = pacientesComEventos
      .flatMap((p) =>
        p.eventos.map((ev) => ({
          ...ev,
          paciente_nome: p.nome,
          paciente_id: p.id,
          status: p.status,
        }))
      )
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 8);

    const graficoIntervencoes = pacientesComEventos.map((p) => ({
      nome: resumirNome(p.nome),
      nomeCompleto: p.nome,
      pacienteId: p.id,
      valor: p.totalIntervencoes,
      status: p.status,
      semDados: p.totalIntervencoes === 0,
    }));

    const graficoRegistros = pacientesComEventos.map((p) => ({
      nome: resumirNome(p.nome),
      nomeCompleto: p.nome,
      pacienteId: p.id,
      valor: p.totalRegistros,
      status: p.status,
      semDados: p.totalRegistros === 0,
    }));

    const totalVerde = pacientesComEventos.filter((p) => p.status === "verde").length;
    const totalAmarelo = pacientesComEventos.filter((p) => p.status === "amarelo").length;
    const totalVermelho = pacientesComEventos.filter((p) => p.status === "vermelho").length;
    const totalSemDados = pacientesComEventos.filter((p) => p.status === "sem_dados").length;

    const totalBaixoRisco = pacientesComEventos.filter(
      (p) => p.risco?.risco_atual === "baixo_risco"
    ).length;

    const totalAtencaoRisco = pacientesComEventos.filter(
      (p) => p.risco?.risco_atual === "atencao"
    ).length;

    const totalAltoRisco = pacientesComEventos.filter(
      (p) => p.risco?.risco_atual === "alto_risco"
    ).length;

    const totalEmPiora = pacientesComEventos.filter(
      (p) => p.risco?.tendencia === "piora"
    ).length;

    const pacientesCriticos = [...pacientesComEventos]
      .filter(
        (p) =>
          p.risco &&
          (p.risco.risco_atual === "alto_risco" || p.risco.risco_atual === "atencao")
      )
      .sort((a, b) => {
        const prioridadeA = prioridadeNumerica(a.risco?.risco_atual);
        const prioridadeB = prioridadeNumerica(b.risco?.risco_atual);

        if (prioridadeB !== prioridadeA) return prioridadeB - prioridadeA;

        const scoreA = a.risco?.pontuacao_risco ?? -1;
        const scoreB = b.risco?.pontuacao_risco ?? -1;
        if (scoreB !== scoreA) return scoreB - scoreA;

        if (a.risco?.tendencia === "piora" && b.risco?.tendencia !== "piora") return -1;
        if (b.risco?.tendencia === "piora" && a.risco?.tendencia !== "piora") return 1;

        return (b.totalRegistros || 0) - (a.totalRegistros || 0);
      })
      .slice(0, 6);

    return {
      pacientesComEventos,
      totalPacientes,
      totalIntervencoes,
      totalRegistros,
      pacienteComMaisEventos,
      eventosRecentes,
      graficoIntervencoes,
      graficoRegistros,
      totalVerde,
      totalAmarelo,
      totalVermelho,
      totalSemDados,
      totalBaixoRisco,
      totalAtencaoRisco,
      totalAltoRisco,
      totalEmPiora,
      pacientesCriticos,
    };
  }, [pacientes, timelinesPorPaciente, riscosPorPaciente]);

  if (loading) {
    return <div style={{ padding: 24 }}>Carregando dashboard...</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 1220, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "flex-start",
          marginBottom: 8,
        }}
      >
        <div style={{ flex: "1 1 320px", minWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/icon-monitra.png"
              alt="Monitra"
              style={{ width: 38, height: 38 }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div>
              <h2 style={{ margin: 0 }}>Dashboard</h2>
              <p style={{ marginTop: 4, color: "#4b5563" }}>
                Visão executiva da operação clínica, com foco em risco, priorização e tomada de decisão.
              </p>
            </div>
          </div>
        </div>

        <div style={{ flex: "1 1 520px", minWidth: 320 }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <Button variant="secondary" onClick={() => navigate("/pacientes")}>
              Pacientes
            </Button>

            <Button variant="secondary" onClick={() => navigate("/profissionais")}>
              Profissionais
            </Button>

            <Button variant="secondary" onClick={() => navigate("/clinicas")}>
              Clínicas
            </Button>

            <Button variant="secondary" onClick={() => navigate("/responsaveis")}>
              Responsáveis
            </Button>

            <Button variant="secondary" onClick={() => navigate(`/clinicas/1/mapa-risco`)}>
              🧠 Mapa de Risco
            </Button>

            <Button onClick={() => navigate("/pacientes/novo")}>
              + Novo Paciente
            </Button>

            <Button onClick={() => navigate("/profissionais/novo")}>
              + Novo Profissional
            </Button>

            <Button variant="secondary" onClick={loadDashboard}>
              ↻ Atualizar
            </Button>
          </div>
        </div>
      </div>

      {erro && <p style={{ color: "red" }}>{erro}</p>}

      <div style={{ marginTop: 24 }}>
        <TituloSecao>📊 Indicadores principais</TituloSecao>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <CardIndicador
            titulo="Total de pacientes"
            valor={analitico.totalPacientes}
            subtitulo="Pacientes cadastrados na plataforma"
          />
          <CardIndicador
            titulo="🚨 Alto risco"
            valor={analitico.totalAltoRisco}
            subtitulo="Pacientes com atenção imediata"
            background="#fef2f2"
            corValor="#b91c1c"
          />
          <CardIndicador
            titulo="📍 Atenção"
            valor={analitico.totalAtencaoRisco}
            subtitulo="Pacientes sob monitoramento clínico"
            background="#fefce8"
            corValor="#a16207"
          />
          <CardIndicador
            titulo="📉 Em piora recente"
            valor={analitico.totalEmPiora}
            subtitulo="Tendência clínica desfavorável"
            background="#fff7ed"
            corValor="#c2410c"
          />
        </div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <CardIndicador
            titulo="🟢 Estáveis"
            valor={analitico.totalVerde}
            background="#f0fdf4"
            corValor="#166534"
          />
          <CardIndicador
            titulo="⚪ Sem dados"
            valor={analitico.totalSemDados}
            background="#f3f4f6"
            corValor="#4b5563"
          />
          <CardIndicador
            titulo="🧠 Intervenções"
            valor={analitico.totalIntervencoes}
            subtitulo="Total registrado"
            background="white"
          />
          <CardIndicador
            titulo="📋 Registros diários"
            valor={analitico.totalRegistros}
            subtitulo="Total registrado"
            background="white"
          />
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <TituloSecao>🚨 Prioridade do dia</TituloSecao>

        <div
          style={{
            border: "1px solid #fecaca",
            borderRadius: 16,
            padding: 16,
            background: "linear-gradient(180deg, #fff7f7 0%, #ffffff 100%)",
            boxShadow: "0 8px 30px rgba(239, 68, 68, 0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>Pacientes críticos do dia</h3>
              <p style={{ marginTop: 8, color: "#4b5563", maxWidth: 760 }}>
                Pacientes com maior prioridade clínica neste momento.
              </p>
            </div>

            <div
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                background: "#fee2e2",
                color: "#991b1b",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              Prioridade assistencial
            </div>
          </div>

          {analitico.pacientesCriticos.length === 0 ? (
            <p>Nenhum paciente crítico encontrado.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {analitico.pacientesCriticos.map((p, index) => {
                const riscoAtual = p.risco?.risco_atual;
                const altoRisco = riscoAtual === "alto_risco";

                return (
                  <div
                    key={p.id}
                    style={{
                      border: altoRisco ? "1px solid #fecaca" : "1px solid #fde68a",
                      borderRadius: 14,
                      padding: 14,
                      background: altoRisco ? "#fff5f5" : "#fffdf0",
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
                      <div style={{ flex: 1, minWidth: 280 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <div
                            style={{
                              minWidth: 28,
                              height: 28,
                              borderRadius: 999,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: altoRisco ? "#ef4444" : "#eab308",
                              color: "#111",
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {index + 1}
                          </div>

                          <div style={{ fontWeight: 800, fontSize: 16 }}>{p.nome}</div>

                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 999,
                              background: corRisco(riscoAtual),
                              color: "#111",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {labelRisco(riscoAtual)}
                          </span>

                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 999,
                              background: "#f3f4f6",
                              color: "#374151",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {labelTendencia(p.risco?.tendencia)}
                          </span>
                        </div>

                        <div style={{ marginTop: 8, fontSize: 13, color: "#4b5563" }}>
                          Profissional: {p.profissional_nome || "-"}
                        </div>

                        <div
                          style={{
                            marginTop: 10,
                            padding: 12,
                            borderRadius: 10,
                            background: "#ffffff",
                            border: "1px solid #f1f5f9",
                            color: "#1f2937",
                            lineHeight: 1.5,
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 4 }}>
                            Leitura clínica automática
                          </div>
                          {p.risco?.status_resumido || "Sem resumo clínico."}
                        </div>
                      </div>

                      <div style={{ minWidth: 180, textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                          }}
                        >
                          Score de risco
                        </div>
                        <div
                          style={{
                            marginTop: 2,
                            fontSize: 28,
                            fontWeight: 800,
                            color: corRiscoTexto(riscoAtual),
                          }}
                        >
                          {p.risco?.pontuacao_risco ?? "-"}
                        </div>

                        <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                          Registros: <b>{p.totalRegistros}</b> | Intervenções: <b>{p.totalIntervencoes}</b>
                        </div>

                        <Button
                          variant="secondary"
                          style={{ marginTop: 10, minWidth: 150 }}
                          onClick={() => navigate(`/pacientes/${p.id}`)}
                        >
                          Abrir prontuário
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <TituloSecao>📈 Análises</TituloSecao>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 14,
              padding: 16,
              background: "white",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Intervenções por paciente</h3>

            {analitico.graficoIntervencoes.length === 0 ? (
              <p>Nenhum dado disponível.</p>
            ) : (
              <div style={{ width: "100%", height: 300, minHeight: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analitico.graficoIntervencoes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" hide />
                    <YAxis allowDecimals={false} />
                    <Tooltip content={<TooltipCustom />} />
                    <Bar dataKey="valor" name="Intervenções">
                      {analitico.graficoIntervencoes.map((entry, index) => (
                        <Cell
                          key={`cell-int-${index}`}
                          fill={entry.semDados ? "#d1d5db" : "#2563eb"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 14,
              padding: 16,
              background: "white",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Registros diários por paciente</h3>

            {analitico.graficoRegistros.length === 0 ? (
              <p>Nenhum dado disponível.</p>
            ) : (
              <div style={{ width: "100%", height: 300, minHeight: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analitico.graficoRegistros}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" hide />
                    <YAxis allowDecimals={false} />
                    <Tooltip content={<TooltipCustom />} />
                    <Bar dataKey="valor" name="Registros">
                      {analitico.graficoRegistros.map((entry, index) => (
                        <Cell
                          key={`cell-reg-${index}`}
                          fill={entry.semDados ? "#d1d5db" : corStatus(entry.status)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <TituloSecao>📋 Operacional</TituloSecao>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr",
            gap: 16,
          }}
        >
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 14,
              padding: 16,
              background: "white",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Resumo por paciente</h3>

            {analitico.pacientesComEventos.length === 0 ? (
              <p>Nenhum paciente encontrado.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {analitico.pacientesComEventos.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 12,
                      padding: 12,
                      background: corStatusSuave(p.status),
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>{p.nome || `Paciente #${p.id}`}</div>
                        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                          Intervenções: {p.totalIntervencoes} | Registros: {p.totalRegistros}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            background: corStatus(p.status),
                            color: "#111",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {labelStatus(p.status)}
                        </span>

                        <Button
                          variant="secondary"
                          onClick={() => navigate(`/pacientes/${p.id}`)}
                        >
                          Abrir
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 14,
              padding: 16,
              background: "white",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Últimos eventos da clínica</h3>

            {analitico.eventosRecentes.length === 0 ? (
              <p>Nenhum evento recente encontrado.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {analitico.eventosRecentes.map((item) => {
                  const isIntervencao = item.tipo_evento === "INTERVENCAO";

                  return (
                    <div
                      key={`${item.paciente_id}-${item.tipo_evento}-${item.id}`}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: 12,
                        padding: 12,
                        background: isIntervencao ? "#f5f9ff" : "#f9fff5",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {isIntervencao ? "🧠 Intervenção" : "📋 Registro Diário"}
                          </div>

                          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                            Paciente:{" "}
                            <Button
                              variant="secondary"
                              style={{
                                padding: "4px 8px",
                                fontSize: 12,
                                borderRadius: 8,
                                background: "transparent",
                                border: "1px solid #d1d5db",
                              }}
                              onClick={() => navigate(`/pacientes/${item.paciente_id}`)}
                            >
                              {item.paciente_nome || `#${item.paciente_id}`}
                            </Button>
                          </div>

                          <div style={{ marginTop: 6 }}>{item.descricao}</div>
                        </div>

                        <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <small>{formatarData(item.data)}</small>
                          <div style={{ marginTop: 6 }}>
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: 999,
                                background: corStatus(item.status),
                                color: "#111",
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              {labelStatus(item.status)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
