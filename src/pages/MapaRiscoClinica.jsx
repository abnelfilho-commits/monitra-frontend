import Button from "../components/ui/Button";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { obterMapaRiscoClinica } from "../services/analytics";
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

function corRisco(risco) {
  if (risco === "baixo_risco") return "#22c55e";
  if (risco === "atencao") return "#eab308";
  if (risco === "alto_risco") return "#ef4444";
  return "#9ca3af";
}

function corRiscoSuave(risco) {
  if (risco === "baixo_risco") return "#f0fdf4";
  if (risco === "atencao") return "#fefce8";
  if (risco === "alto_risco") return "#fef2f2";
  return "#f3f4f6";
}

function labelRisco(risco) {
  if (risco === "baixo_risco") return "Baixo risco";
  if (risco === "atencao") return "Atenção";
  if (risco === "alto_risco") return "Alto risco";
  return "Sem dados";
}

function labelTendencia(tendencia) {
  if (tendencia === "melhora") return "Em melhora";
  if (tendencia === "estavel") return "Estável";
  if (tendencia === "piora") return "Em piora";
  return "Sem leitura";
}

function formatarData(data) {
  if (!data) return "-";
  return new Date(data).toLocaleDateString("pt-BR");
}

function ordenarPorSeveridade(lista) {
  return [...lista].sort((a, b) => {
    const scoreA = a?.pontuacao_risco ?? -1;
    const scoreB = b?.pontuacao_risco ?? -1;

    if (scoreB !== scoreA) return scoreB - scoreA;

    if (a?.tendencia === "piora" && b?.tendencia !== "piora") return -1;
    if (b?.tendencia === "piora" && a?.tendencia !== "piora") return 1;

    return (a?.nome || "").localeCompare(b?.nome || "");
  });
}

function CardPacienteRisco({ paciente, navigate }) {
  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 12,
        padding: 12,
        background: corRiscoSuave(paciente.risco_atual),
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
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 700 }}>{paciente.nome}</div>

            <div
              style={{
                minWidth: 110,
                textAlign: "center",
                padding: "6px 12px",
                borderRadius: 999,
                background: corRisco(paciente.risco_atual),
                color: "#111",
                fontSize: 12,
                fontWeight: 700,
                display: "inline-block",
              }}
            >
              {labelRisco(paciente.risco_atual)}
            </div>
          </div>

          <div style={{ marginTop: 6, fontSize: 13, color: "#4b5563" }}>
            Profissional: {paciente.profissional_nome || "-"}
          </div>

          <div style={{ marginTop: 6 }}>
            {paciente.status_resumido || "Sem resumo clínico disponível."}
          </div>

          <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
            Último registro: {formatarData(paciente.ultimo_registro)}
          </div>
        </div>

        <div style={{ textAlign: "right", minWidth: 160 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Score de risco</div>
          <div style={{ marginTop: 2, fontSize: 24, fontWeight: 800 }}>
            {paciente.pontuacao_risco ?? "-"}
          </div>

          <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
            Tendência: <b>{labelTendencia(paciente.tendencia)}</b>
          </div>

          <Button
            variant="secondary"
            style={{ marginTop: 8, minWidth: 150 }}
            onClick={() => navigate(`/pacientes/${paciente.paciente_id}`)}
          >
            Abrir prontuário
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MapaRiscoClinica() {
  const { id } = useParams();
  const clinicaId = Number(id);
  const navigate = useNavigate();

  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  async function load() {
    setErro("");
    setLoading(true);

    try {
      const data = await obterMapaRiscoClinica(clinicaId);
      setDados(data);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Falha ao carregar mapa de risco.";
      setErro(String(msg));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!clinicaId || Number.isNaN(clinicaId)) return;
    load();
  }, [clinicaId]);

  const graficoDistribuicao = useMemo(() => {
    if (!dados) return [];

    return [
      { nome: "Baixo risco", valor: dados.baixo_risco, cor: "#22c55e" },
      { nome: "Atenção", valor: dados.atencao, cor: "#eab308" },
      { nome: "Alto risco", valor: dados.alto_risco, cor: "#ef4444" },
      { nome: "Sem dados", valor: dados.sem_dados, cor: "#9ca3af" },
    ];
  }, [dados]);

  const pacientesEmAlerta = useMemo(() => {
    const lista = Array.isArray(dados?.pacientes_em_alerta)
      ? dados.pacientes_em_alerta
      : [];

    return ordenarPorSeveridade(
      lista.filter((p) => p?.risco_atual === "atencao")
    );
  }, [dados]);

  const pacientesAltoRisco = useMemo(() => {
    const lista = Array.isArray(dados?.pacientes_alto_risco)
      ? dados.pacientes_alto_risco
      : [];

    return ordenarPorSeveridade(
      lista.filter((p) => p?.risco_atual === "alto_risco")
    );
  }, [dados]);

  const rankingRisco = useMemo(() => {
    const lista = Array.isArray(dados?.ranking_risco) ? dados.ranking_risco : [];
    return ordenarPorSeveridade(lista).slice(0, 8);
  }, [dados]);

  if (loading) {
    return <div style={{ padding: 24 }}>Carregando mapa de risco...</div>;
  }

  if (!dados) {
    return <div style={{ padding: 24 }}>Sem dados para exibir.</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 1180, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Mapa de Risco da Clínica</h2>
          <p style={{ marginTop: 6, color: "#4b5563" }}>
            Sistema de priorização clínica inteligente que identifica automaticamente os pacientes que demandam maior atenção, apoiando decisões assistenciais em tempo real.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="secondary"
            onClick={() => navigate(`/clinicas/${clinicaId}`)}
          >
            ← Voltar
          </Button>

          <Button variant="secondary" onClick={load}>
            ↻ Atualizar
          </Button>
        </div>
      </div>

      {erro && <p style={{ color: "red", marginTop: 12 }}>{erro}</p>}

      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, background: "white" }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>Total de pacientes</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
            {dados.total_pacientes}
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, background: "#f0fdf4" }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>🟢 Baixo risco</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6, color: "#166534" }}>
            {dados.baixo_risco}
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, background: "#fefce8" }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>🟡 Atenção</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6, color: "#a16207" }}>
            {dados.atencao}
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, background: "#fef2f2" }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>🔴 Alto risco</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6, color: "#b91c1c" }}>
            {dados.alto_risco}
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, background: "#f3f4f6" }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>⚪ Sem dados</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6, color: "#4b5563" }}>
            {dados.sem_dados}
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 14, padding: 16, background: "white" }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>📉 Em piora</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
            {dados.em_piora}
          </div>
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
        <h3 style={{ marginTop: 0 }}>Distribuição populacional de risco clínico</h3>

        <p style={{ fontSize: 13, color: "#6b7280", marginTop: -8 }}>
          Panorama geral do perfil de risco da clínica, apoiando análise estratégica e planejamento assistencial.
        </p>

        {graficoDistribuicao.length === 0 ? (
          <p>Nenhum dado disponível.</p>
        ) : (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={graficoDistribuicao}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="valor" name="Pacientes">
                  {graficoDistribuicao.map((entry, index) => (
                    <Cell key={index} fill={entry.cor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 20,
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
          }}
        >
          <h3 style={{ marginTop: 0 }}>Pacientes em atenção prioritária</h3>
          <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, color: "#6b7280" }}>
            Pacientes que requerem acompanhamento próximo, selecionados automaticamente com base na evolução clínica e sinais de risco emergente.
          </p>

          <p style={{ fontSize: 12, color: "#9ca3af" }}>
            Mostrando {pacientesEmAlerta.length} de {dados.atencao} pacientes em atenção
          </p>

          {!pacientesEmAlerta.length ? (
            <p>Nenhum paciente em alerta.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pacientesEmAlerta.map((p) => (
                <CardPacienteRisco
                  key={p.paciente_id}
                  paciente={p}
                  navigate={navigate}
                />
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
          }}
        >
          <h3 style={{ marginTop: 0 }}>Pacientes críticos (alto risco)</h3>
          <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, color: "#6b7280" }}>
            Pacientes com maior gravidade clínica no momento, exigindo intervenção prioritária e monitoramento intensivo.
          </p>

          <p style={{ fontSize: 12, color: "#9ca3af" }}>
            Mostrando {pacientesAltoRisco.length} de {dados.alto_risco} pacientes de alto risco
          </p>

          {!pacientesAltoRisco.length ? (
            <p>Nenhum paciente em alto risco.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pacientesAltoRisco.map((p) => (
                <CardPacienteRisco
                  key={p.paciente_id}
                  paciente={p}
                  navigate={navigate}
                />
              ))}
            </div>
          )}
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
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Fila clínica de priorização assistencial</h3>
            <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, color: "#6b7280", maxWidth: 860 }}>
              Ordenação inteligente da carteira de pacientes com base em risco, tendência e histórico recente, orientando a sequência ideal de acompanhamento clínico.
            </p>
          </div>

          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "#f3f4f6",
              color: "#374151",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Top {rankingRisco.length}
          </div>
        </div>

        {!rankingRisco.length ? (
          <p>Nenhum paciente encontrado.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rankingRisco.map((p, index) => (
              <div
                key={p.paciente_id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: 12,
                  background: corRiscoSuave(p.risco_atual),
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
                    <div style={{ fontWeight: 700 }}>
                      #{index + 1} — {p.nome}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, color: "#4b5563" }}>
                      Profissional: {p.profissional_nome || "-"}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, color: "#4b5563" }}>
                      Registros: {p.total_registros}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, color: "#4b5563" }}>
                      Tendência: {labelTendencia(p.tendencia)}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: corRisco(p.risco_atual),
                        color: "#111",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {labelRisco(p.risco_atual)}
                    </div>

                    <div style={{ marginTop: 6, fontSize: 13 }}>
                      Score: <b>{p.pontuacao_risco}</b>
                    </div>

                    <Button
                      variant="secondary"
                      style={{ marginTop: 8, minWidth: 150 }}
                      onClick={() => navigate(`/pacientes/${p.paciente_id}`)}
                    >
                      Abrir prontuário
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
