import { getAssessmentLabel } from "../../utils/assessmentLabels";
import React, { useEffect, useState } from "react";
import { listarAssessmentsPaciente } from "../../services/assessmentService";

import { useNavigate } from "react-router-dom";

function formatarData(data) {
  if (!data) return "-";
  return new Date(data).toLocaleDateString("pt-BR");
}

function normalizarTipoAvaliacao(instrumento) {
  const valor = String(instrumento || "").toUpperCase();

  if (valor.includes("MCHAT") || valor.includes("M-CHAT")) {
    return "MCHAT";
  }

  if (valor.includes("DENVER")) {
    return "DENVER";
  }

  return valor;
}

export default function AssessmentHistory({ pacienteId }) {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const y = sessionStorage.getItem("timelineScrollY");

    if (y) {
      setTimeout(() => {
        window.scrollTo(0, Number(y));
        sessionStorage.removeItem("timelineScrollY");
      }, 100);
    }
  }, []);

  function normalizarTipoAvaliacao(instrumento) {
    const valor = String(instrumento || "").toUpperCase();

    if (valor.includes("MCHAT") || valor.includes("M-CHAT")) return "MCHAT";
    if (valor.includes("DENVER")) return "DENVER";

    return valor;
  }

  useEffect(() => {
    if (!pacienteId) return;

    listarAssessmentsPaciente(pacienteId)
      .then((data) => setAvaliacoes(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [pacienteId]);

  if (loading) return <p>Carregando avaliações...</p>;

  if (!avaliacoes.length) {
    return <p>Nenhuma avaliação clínica encontrada.</p>;
  }

  return (
    <div
      style={{
        marginTop: 20,
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 16,
        background: "white",
      }}
    >
      <h3 style={{ marginTop: 0 }}>🧩 Histórico de Avaliações</h3>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: 10 }}>Data</th>
            <th style={{ padding: 10 }}>Instrumento</th>
            <th style={{ padding: 10 }}>Score</th>
            <th style={{ padding: 10 }}>Classificação</th>
            <th style={{ padding: 10 }}>Ações</th>
          </tr>
        </thead>

        <tbody>
          {avaliacoes.map((a) => (
            <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: 10 }}>{formatarData(a.created_at)}</td>
              <td style={{ padding: 10 }}>{getAssessmentLabel(a.instrumento)}</td>
              <td style={{ padding: 10 }}>{a.score ?? "-"}</td>
              <td style={{ padding: 10 }}>{a.classificacao || "-"}</td>
              <td style={{ padding: 10 }}>
                <button
                    style={{
                      border: "none",
                      background: "#2563eb",
                      color: "#fff",
                      padding: "6px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                    onClick={() => {
                      sessionStorage.setItem("timelineScrollY", String(window.scrollY));
                      navigate(
                        `/prontuario/evento/${normalizarTipoAvaliacao(a.instrumento)}/${a.id}`
                      )
                    }}
                  >
                    👁 Visualizar
                  </button>
                </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}