import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../../components/ui/Button";

import { getApiErrorMessage } from "../../utils/errors";

import {
  listarPacientesCardiometabolico,
} from "../../services/cardiometabolico/pacientes";

function formatarRisco(risco) {
  if (!risco) return "Baixo";

  return risco.charAt(0).toUpperCase() + risco.slice(1);
}

export default function PacientesCardiometabolico() {
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

      const data =
        await listarPacientesCardiometabolico();

      setPacientes(
        Array.isArray(data) ? data : []
      );

    } catch (e) {
      setErro(
        getApiErrorMessage(
          e,
          "Falha ao carregar pacientes cardiometabólicos."
        )
      );
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
      String(p.nome || "")
        .toLowerCase()
        .includes(termo)
    );
  }, [pacientes, busca]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(
      pacientesFiltrados.length / itensPorPagina
    )
  );

  const pacientesPaginados = useMemo(() => {
    const inicio =
      (paginaAtual - 1) * itensPorPagina;

    const fim = inicio + itensPorPagina;

    return pacientesFiltrados.slice(
      inicio,
      fim
    );
  }, [
    pacientesFiltrados,
    paginaAtual,
  ]);

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

      {/* HEADER */}
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

        <div
          style={{
            flex: "1 1 320px",
            minWidth: 280,
          }}
        >

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >

            <Button
              variant="secondary"
              onClick={() =>
                navigate("/cardiometabolico")
              }
            >
              ← Voltarr
            </Button>

            <div>
              <h2 style={{ margin: 0 }}>
                Pacientes Cardiometabólicos
              </h2>

              <p
                style={{
                  marginTop: 4,
                  color: "#4b5563",
                }}
              >
                Monitoramento longitudinal
                de pacientes com diabetes,
                hipertensão e obesidade.
              </p>
            </div>

          </div>

        </div>

        <div
          style={{
            flex: "1 1 320px",
            minWidth: 260,
          }}
        >

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >

            <Button
              onClick={() =>
                navigate("/pacientes/novo?modulo=cardiometabolico")
              }
            >
              + Novo Paciente
            </Button>

            <Button
              variant="secondary"
              onClick={load}
              disabled={loading}
            >
              ↻ Atualizar
            </Button>

          </div>

        </div>

      </div>

      {/* BUSCA */}
      <div
        style={{
          marginTop: 16,
          maxWidth: 460,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 12,
          boxShadow:
            "0 4px 12px rgba(0,0,0,0.04)",
          boxSizing: "border-box",
        }}
      >

        <input
          type="text"
          placeholder="Buscar paciente cardiometabólico..."
          value={busca}
          onChange={(e) =>
            setBusca(e.target.value)
          }
          style={{
            width: "100%",
            padding: 10,
            border: "1px solid #d1d5db",
            borderRadius: 10,
            outline: "none",
            fontSize: 14,
            boxSizing: "border-box",
            display: "block",
          }}
        />

      </div>

      {/* LOADING */}
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
          Carregando pacientes...
        </div>
      )}

      {/* ERRO */}
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
            <Button
              variant="secondary"
              onClick={load}
            >
              Tentar novamente
            </Button>
          </div>

        </div>
      )}

      {/* VAZIO */}
      {!loading &&
        !erro &&
        pacientesFiltrados.length === 0 && (
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
              : "Nenhum paciente cardiometabólico cadastrado."}
          </div>
        )}

      {/* LISTA */}
      {!loading &&
        !erro &&
        pacientesFiltrados.length > 0 && (
          <>

            <div
              style={{
                display: "grid",
                gap: 14,
                marginTop: 16,
              }}
            >

              {pacientesPaginados.map((p) => (

                <div
                  key={p.id}
                  style={{
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: 20,
                    padding: 20,
                    background: "#fff",
                    boxShadow:
                      "0 4px 12px rgba(0,0,0,0.04)",
                  }}
                >

                  {/* HEADER CARD */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >

                    <div>

                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >

                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 22,
                            color: "#0f172a",
                          }}
                        >
                          {p.nome}
                        </div>

                        <div
                          style={{
                            padding:
                              "6px 12px",
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 700,
                            background:
                              p.risco === "critico"
                                ? "#fee2e2"
                                : p.risco === "alto"
                                ? "#fee2e2"
                                : p.risco === "moderado"
                                ? "#fef3c7"
                                : "#dcfce7",

                            color:
                              p.risco === "critico"
                                ? "#991b1b"
                                : p.risco === "alto"
                                ? "#b91c1c"
                                : p.risco === "moderado"
                                ? "#92400e"
                                : "#166534",                            
                
                          }}
                        >
                          {formatarRisco(
                            p.risco
                          )}
                        </div>

                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          color: "#64748b",
                          fontSize: 14,
                        }}
                      >
                        Monitoramento
                        longitudinal
                        cardiometabólico.
                      </div>

                    </div>

                    <div>

                      <Button
                        onClick={() =>
                          navigate(
                            `/cardiometabolico/pacientes/${p.id}`
                          )
                        }
                      >
                        Abrir prontuário
                      </Button>

                    </div>

                  </div>

                  {/* MÉTRICAS */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 12,
                      marginTop: 20,
                    }}
                  >

                    <div
                      style={{
                        background:
                          "#f8fafc",
                        border:
                          "1px solid #e2e8f0",
                        borderRadius: 16,
                        padding: 16,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color: "#64748b",
                        }}
                      >
                        Glicemia
                      </div>

                      <div
                        style={{
                          fontSize: 30,
                          fontWeight: 700,
                          marginTop: 8,
                          color: "#0f172a",
                        }}
                      >
                        {p.glicemia ??
                          "--"}
                      </div>
                    </div>

                    <div
                      style={{
                        background:
                          "#f8fafc",
                        border:
                          "1px solid #e2e8f0",
                        borderRadius: 16,
                        padding: 16,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color: "#64748b",
                        }}
                      >
                        Pressão arterial
                      </div>

                      <div
                        style={{
                          fontSize: 30,
                          fontWeight: 700,
                          marginTop: 8,
                          color: "#0f172a",
                        }}
                      >
                        {p.pressao ?? "--"}
                      </div>
                    </div>

                    <div
                      style={{
                        background:
                          "#f8fafc",
                        border:
                          "1px solid #e2e8f0",
                        borderRadius: 16,
                        padding: 16,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color: "#64748b",
                        }}
                      >
                        IMC
                      </div>

                      <div
                        style={{
                          fontSize: 30,
                          fontWeight: 700,
                          marginTop: 8,
                          color: "#0f172a",
                        }}
                      >
                        {p.imc || "--"}
                      </div>
                    </div>

                    <div
                      style={{
                        background:
                          "#f8fafc",
                        border:
                          "1px solid #e2e8f0",
                        borderRadius: 16,
                        padding: 16,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color: "#64748b",
                        }}
                      >
                        Score clínico
                      </div>

                      <div
                        style={{
                          fontSize: 30,
                          fontWeight: 700,
                          marginTop: 8,
                          color:
                            p.score_clinico >= 7
                              ? "#b91c1c"
                              : p.score >= 4
                              ? "#b45309"
                              : "#166534",
                        }}
                      >
                        {p.score_clinico ?? 0}
                      </div>
                    </div>

                  </div>

                </div>

              ))}

            </div>

            {/* PAGINAÇÃO */}
            <div
              style={{
                marginTop: 16,
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                padding: 12,
                border:
                  "1px solid #e5e7eb",
                borderRadius: 14,
                background: "#fff",
                boxShadow:
                  "0 4px 12px rgba(0,0,0,0.04)",
              }}
            >

              <div
                style={{
                  fontSize: 14,
                  color: "#64748b",
                }}
              >
                Mostrando{" "}
                {pacientesPaginados.length}
                {" "}de{" "}
                {pacientesFiltrados.length}
                {" "}paciente(s)
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >

                <Button
                  variant="secondary"
                  onClick={() =>
                    setPaginaAtual((prev) =>
                      Math.max(prev - 1, 1)
                    )
                  }
                  disabled={paginaAtual === 1}
                >
                  Anterior
                </Button>

                <span
                  style={{
                    fontSize: 14,
                    color: "#374151",
                  }}
                >
                  Página {paginaAtual} de{" "}
                  {totalPaginas}
                </span>

                <Button
                  variant="secondary"
                  onClick={() =>
                    setPaginaAtual((prev) =>
                      Math.min(
                        prev + 1,
                        totalPaginas
                      )
                    )
                  }
                  disabled={
                    paginaAtual === totalPaginas
                  }
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
