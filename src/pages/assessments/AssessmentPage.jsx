import React, { useEffect, useState } from "react";
import { obterPaciente } from "../../services/pacientes";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import AssessmentForm from "../../components/assessments/AssessmentForm";

export default function AssessmentPage() {
  const navigate = useNavigate();

  const { codigo } = useParams();

  const [searchParams] = useSearchParams();

  const pacienteId = Number(searchParams.get("pacienteId"));

  const [paciente, setPaciente] = useState(null);

  useEffect(() => {
    if (!pacienteId) return;

    obterPaciente(pacienteId)
      .then(setPaciente)
      .catch(console.error);
  }, [pacienteId]);

  const LABELS = {
    MCHAT: "M-CHAT",
    DENVER: "Denver II",
  };

  return (
    <div
      style={{
        background: "#f8fafc",
        minHeight: "100vh",
        padding: "32px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
        }}
      >
        <button
          onClick={() => navigate(`/pacientes/${pacienteId}`)}
          style={{
            marginBottom: 20,
            padding: "10px 18px",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#2563eb",
            cursor: "pointer",
            fontWeight: 700,
            boxShadow: "0 2px 6px rgba(4, 3, 3, 0.05)",
          }}
        >
          ← Voltar ao prontuário
        </button>

        <div
          style={{
            background: "#ffffff",
            borderRadius: 20,
            padding: 28,
            marginBottom: 24,
            border: "1px solid #e5e7eb",
            boxShadow: "0 8px 30px rgba(15,23,42,.06)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "#2563eb",
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Framework Universal de Avaliações
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 36,
              color: "#0f172a",
            }}
          >
            {LABELS[codigo] || codigo}
          </h1>

          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 12,
              background: "#f8fafc",
              border: "1px solid #e5e7eb",
              color: "#334155",
              fontWeight: 700,
              display: "inline-block",
            }}
          >
            Paciente: {paciente?.nome || `#${pacienteId}`}
          </div>

          <p
            style={{
              marginTop: 10,
              color: "#64748b",
            }}
          >
            Aplicação padronizada do protocolo clínico.
            As respostas serão registradas automaticamente no prontuário longitudinal do paciente.
          </p>
        </div>

        <AssessmentForm
          codigo={codigo}
          pacienteId={pacienteId}
        />
      </div>
    </div>
  );
}