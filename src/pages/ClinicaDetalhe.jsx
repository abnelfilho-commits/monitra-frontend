import Button from "../components/ui/Button";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { obterClinica } from "../services/clinicas";
import { listarPacientes } from "../services/pacientes";
import { listarProfissionais } from "../services/profissionais";
import { listarTimelinePorPaciente } from "../services/timeline";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

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

function labelStatus(status) {
  if (status === "verde") return "Ótimo";
  if (status === "amarelo") return "Alerta";
  if (status === "vermelho") return "Piorou";
  return "Sem dados";
}

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

export default function ClinicaDetalhe() {
  const { id } = useParams();
  const clinicaId = Number(id);
  const navigate = useNavigate();

  const [clinica, setClinica] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [timelinesPorPaciente, setTimelinesPorPaciente] = useState({});
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  async function load() {
    setErro("");
    setLoading(true);

    try {
      const [c, todosPacientes, todosProfissionais] = await Promise.all([
        obterClinica(clinicaId),
        listarPacientes(),
        listarProfissionais(),
      ]);

      const pacientesDaClinica = (Array.isArray(todosPacientes) ? todosPacientes : []).filter(
        (p) => Number(p.clinica_id) === clinicaId
      );

      const profissionaisDaClinica = (Array.isArray(todosProfissionais) ? todosProfissionais : []).filter(
        (p) => Number(p.clinica_id) === clinicaId
      );

      setClinica(c);
      setPacientes(pacientesDaClinica);
      setProfissionais(profissionaisDaClinica);

      const entries = await Promise.all(
        pacientesDaClinica.map(async (p) => {
          try {
            const timeline = await listarTimelinePorPaciente(p.id);
            return [p.id, Array.isArray(timeline) ? timeline : []];
          } catch {
            return [p.id, []];
          }
        })
      );

      setTimelinesPorPaciente(Object.fromEntries(entries));
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Falha ao carregar clínica.";
      setErro(String(msg));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!clinicaId || Number.isNaN(clinicaId)) return;
    load();
  }, [clinicaId]);

  const analitico = useMemo(() => {
    const pacientesComStatus = pacientes.map((p) => {
      const eventos = timelinesPorPaciente[p.id] || [];
      const status = classificarStatusPaciente(eventos);

      return {
        ...p,
        eventos,
        status,
        totalEventos: eventos.length,
        totalIntervencoes: eventos.filter((e) => e.tipo_evento === "INTERVENCAO").length,
        totalRegistros: eventos.filter((e) => e.tipo_evento === "REGISTRO_DIARIO").length,
      };
    });

    const totalPacientes = pacientesComStatus.length;
    const totalProfissionais = profissionais.length;
    const totalVerde = pacientesComStatus.filter((p) => p.status === "verde").length;
    const totalAmarelo = pacientesComStatus.filter((p) => p.status === "amarelo").length;
    const totalVermelho = pacientesComStatus.filter((p) => p.status === "vermelho").length;
    const totalSemDados = pacientesComStatus.filter((p) => p.status === "sem_dados").length;

    const eventosRecentes = pacientesComStatus
      .flatMap((p) =>
        p.eventos.map((ev) => ({
          ...ev,
          paciente_nome: p.nome,
          paciente_id: p.id,
          status: p.status,
        }))
      )
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 10);

    const graficoStatus = [
      { nome: "Ótimo", valor: totalVerde, cor: "#22c55e" },
      { nome: "Alerta", valor: totalAmarelo, cor: "#eab308" },
      { nome: "Piorou", valor: totalVermelho, cor: "#ef4444" },
      { nome: "Sem dados", valor: totalSemDados, cor: "#9ca3af" },
    ];

    const graficoPacientes = pacientesComStatus.map((p) => ({
      nome: resumirNome(p.nome),
      nomeCompleto: p.nome,
      valor: p.totalRegistros,
      status: p.status,
    }));

    return {
      pacientesComStatus,
      totalPacientes,
      totalProfissionais,
      totalVerde,
      totalAmarelo,
      totalVermelho,
      totalSemDados,
      eventosRecentes,
      graficoStatus,
      graficoPacientes,
    };
  }, [pacientes, profissionais, timelinesPorPaciente]);

  if (loading) {
    return <div style={{ padding: 24 }}>Carregando clínica...</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 1180, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>{clinica?.nome || `Clínica #${clinicaId}`}</h2>
          <p style={{ marginTop: 8 }}>
            <b>CNPJ:</b> {clinica?.cnpj || "-"} {" | "}
            <b>Email:</b> {clinica?.email || "-"} {" | "}
            <b>Telefone:</b> {clinica?.telefone || "-"}
          </p>
        </div>
 
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="secondary"
            onClick={() => navigate("/clinicas")}
          >
            ← Voltar
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate(`/clinicas/${clinicaId}/editar`)}
          >
            Editar Clínica
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate("/profissionais")}
          >
            Profissionais
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate("/pacientes")}
          >
            Pacientes
          </Button>

          <Button
            variant="secondary"
            onClick={load}
          >
            ↻ Atualizar
          </Button>

          <Button
            onClick={() => navigate(`/clinicas/${clinicaId}/mapa-risco`)}
          >
            Mapa de Risco
          </Button>
        </div>

      </div>

      {erro && <p style={{ color: "red" }}>{erro}</p>}

      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>Pacientes</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
            {analitico.totalPacientes}
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>Profissionais</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
            {analitico.totalProfissionais}
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, background: "#fefce8" }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>Pacientes em alerta</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
            {analitico.totalAmarelo}
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, background: "#fef2f2" }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>Piora clínica</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
            {analitico.totalVermelho}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, background: "white" }}>
          <h3 style={{ marginTop: 0 }}>Distribuição clínica</h3>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={analitico.graficoStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="valor" name="Pacientes">
                  {analitico.graficoStatus.map((entry, index) => (
                    <Cell key={index} fill={entry.cor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, background: "white" }}>
          <h3 style={{ marginTop: 0 }}>Registros por paciente</h3>

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={analitico.graficoPacientes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="valor" name="Registros">
                  {analitico.graficoPacientes.map((entry, index) => (
                    <Cell key={index} fill={corStatus(entry.status)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "1fr 1.4fr",
          gap: 16,
        }}
      >
        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, background: "white" }}>
          <h3 style={{ marginTop: 0 }}>Pacientes da clínica</h3>

          {analitico.pacientesComStatus.length === 0 ? (
            <p>Nenhum paciente vinculado.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {analitico.pacientesComStatus.map((p) => (
                <div
                  key={p.id}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.nome}</div>
                      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                        Profissional: {p.profissional_nome || "-"}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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

                      <button onClick={() => navigate(`/pacientes/${p.id}`)}>
                        Abrir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, background: "white" }}>
          <h3 style={{ marginTop: 0 }}>Últimos eventos da clínica</h3>

          {analitico.eventosRecentes.length === 0 ? (
            <p>Nenhum evento recente.</p>
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
                          Paciente: {item.paciente_nome}
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
  );
}
