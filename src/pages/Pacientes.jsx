import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listarPacientes } from "../services/pacientes";
import { getApiErrorMessage } from "../utils/errors";
import Button from "../components/ui/Button";

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
    <div
      style={{
        padding: 24,
        maxWidth: 1220,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <div style={{ flex: "1 1 320px", minWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Button variant="secondary" onClick={() => navigate("/dashboard")}>
              ← Voltar
            </Button>

            <div>
              <h2 style={{ margin: 0 }}>Pacientes</h2>
              <p style={{ marginTop: 4, color: "#4b5563" }}>
                Lista de pacientes cadastrados com acesso rápido ao prontuário.
              </p>
            </div>
          </div>
        </div>

        <div style={{ flex: "1 1 320px", minWidth: 260 }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <Button onClick={() => navigate("/pacientes/novo")}>
              + Novo Paciente
            </Button>

            <Button variant="secondary" onClick={load} disabled={loading}>
              ↻ Atualizar
            </Button>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          maxWidth: 460,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 12,
          boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
        }}
      >
        <input
          type="text"
          placeholder="Buscar paciente por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            border: "1px solid #d1d5db",
            borderRadius: 10,
            outline: "none",
            fontSize: 14,
          }}
        />
      </div>

      {loading && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
          }}
        >
          Carregando...
        </div>
      )}

      {erro && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #fecaca",
            padding: 14,
            borderRadius: 12,
            marginTop: 16,
            color: "#991b1b",
          }}
        >
          <div>{erro}</div>

          <div style={{ marginTop: 10 }}>
            <Button variant="secondary" onClick={load}>
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {!loading && !erro && pacientesFiltrados.length === 0 && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            color: "#475467",
          }}
        >
          {busca
            ? "Nenhum paciente encontrado para essa busca."
            : "Nenhum paciente cadastrado."}
        </div>
      )}

      {!loading && !erro && pacientesFiltrados.length > 0 && (
        <>
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {pacientesPaginados.map((p) => (
              <div
                key={p.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  background: "#fff",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ flex: "1 1 320px", minWidth: 280 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>
                    {p.nome}
                  </div>

                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
                    Nasc.: {formatarDataBR(p.data_nascimento)}{" "}
                    {p.idade != null ? `• ${p.idade} anos` : ""}
                    {" • "}Gênero: {formatarGenero(p.genero)}
                  </div>

                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                    Profissional: {p.profissional_nome || "-"} {" • "}
                    Clínica: {p.clinica_nome || "-"}
                  </div>
                </div>

                <div>
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/pacientes/${p.id}`)}
                  >
                    Ver
                  </Button>
                </div>
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
              padding: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              background: "#fff",
              boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontSize: 14, color: "#64748b" }}>
              Mostrando {pacientesPaginados.length} de {pacientesFiltrados.length} paciente(s)
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Button
                variant="secondary"
                onClick={() => setPaginaAtual((prev) => Math.max(prev - 1, 1))}
                disabled={paginaAtual === 1}
              >
                Anterior
              </Button>

              <span style={{ fontSize: 14, color: "#374151" }}>
                Página {paginaAtual} de {totalPaginas}
              </span>

              <Button
                variant="secondary"
                onClick={() =>
                  setPaginaAtual((prev) => Math.min(prev + 1, totalPaginas))
                }
                disabled={paginaAtual === totalPaginas}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
