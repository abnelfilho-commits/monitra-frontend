import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listarPacientes } from "../services/pacientes";
import { getApiErrorMessage } from "../utils/errors";

function formatarDataBR(data) {
  if (!data) return "-";

  const [ano, mes, dia] = String(data).split("-");
  if (!ano || !mes || !dia) return data;

  return `${dia}/${mes}/${ano}`;
}

function formatarGenero(genero) {
  if (!genero) return "-";
  if (genero === "M") return "Masculino";
  if (genero === "F") return "Feminino";
  return genero;
}

export default function Pacientes() {
  const navigate = useNavigate();

  const [pacientes, setPacientes] = useState([]);
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);

  const itensPorPagina = 5;

  async function load() {
    setErro(null);
    try {
      setLoading(true);
      const data = await listarPacientes();
      setPacientes(Array.isArray(data) ? data : []);
    } catch (e) {
      setErro(getApiErrorMessage(e, "Falha ao carregar pacientes."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pacientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return pacientes;

    return pacientes.filter((p) =>
      String(p.nome || "").toLowerCase().includes(termo)
    );
  }, [pacientes, busca]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(pacientesFiltrados.length / itensPorPagina)
  );

  const pacientesPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return pacientesFiltrados.slice(inicio, fim);
  }, [pacientesFiltrados, paginaAtual]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca]);

  useEffect(() => {
    if (paginaAtual > totalPaginas) {
      setPaginaAtual(totalPaginas);
    }
  }, [paginaAtual, totalPaginas]);

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => navigate("/dashboard")}>← Voltar</button>
          <h2 style={{ margin: 0 }}>Pacientes</h2>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => navigate("/pacientes/novo")}>
            + Novo Paciente
          </button>

          <button onClick={load} disabled={loading}>
            ↻ Atualizar
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, maxWidth: 420 }}>
        <input
          type="text"
          placeholder="Buscar paciente por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            border: "1px solid #d1d5db",
            borderRadius: 8,
          }}
        />
      </div>

      {loading && <p>Carregando...</p>}

      {erro && (
        <div
          style={{
            background: "#fee2e2",
            padding: 12,
            borderRadius: 8,
            marginTop: 12,
          }}
        >
          {erro}
          <div style={{ marginTop: 10 }}>
            <button onClick={load}>Tentar novamente</button>
          </div>
        </div>
      )}

      {!loading && !erro && pacientesFiltrados.length === 0 && (
        <p style={{ marginTop: 16 }}>
          {busca
            ? "Nenhum paciente encontrado para essa busca."
            : "Nenhum paciente cadastrado."}
        </p>
      )}

      {!loading && !erro && pacientesFiltrados.length > 0 && (
        <>
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {pacientesPaginados.map((p) => (
              <div
                key={p.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{p.nome}</div>

                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Nasc.: {formatarDataBR(p.data_nascimento)}{" "}
                    {p.idade != null ? `• ${p.idade} anos` : ""}
                    {" • "}Gênero: {formatarGenero(p.genero)}
                  </div>

                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Profissional: {p.profissional_nome || "-"} {" • "}
                    Clínica: {p.clinica_nome || "-"}
                  </div>
                </div>

                <button onClick={() => navigate(`/pacientes/${p.id}`)}>
                  Ver
                </button>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 14, color: "#64748b" }}>
              Mostrando {pacientesPaginados.length} de {pacientesFiltrados.length}{" "}
              paciente(s)
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => setPaginaAtual((prev) => Math.max(prev - 1, 1))}
                disabled={paginaAtual === 1}
              >
                Anterior
              </button>

              <span style={{ fontSize: 14 }}>
                Página {paginaAtual} de {totalPaginas}
              </span>

              <button
                onClick={() =>
                  setPaginaAtual((prev) => Math.min(prev + 1, totalPaginas))
                }
                disabled={paginaAtual === totalPaginas}
              >
                Próxima
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
