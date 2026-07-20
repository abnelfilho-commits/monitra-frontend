import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "../components/ui/Button";
import { obterDiagnostico } from "../services/diagnosticos";

function formatarData(valor) {
  if (!valor) return "-";

  return new Date(`${valor}T00:00:00`).toLocaleDateString(
    "pt-BR"
  );
}

function formatarTipo(tipo) {
  const tipos = {
    HIPOTESE: "Hipótese diagnóstica",
    DIAGNOSTICO: "Diagnóstico confirmado",
    REVISAO: "Revisão diagnóstica",
  };

  return tipos[tipo] || tipo || "Não informado";
}

function formatarStatus(status) {
  const statusMap = {
    ATIVO: "Confirmado",
    REVISADO: "Revisado",
    CANCELADO: "Cancelado",
  };

  return statusMap[status] || status || "Não informado";
}

export default function DiagnosticoDetalhe() {
  const { diagnosticoId } = useParams();
  const navigate = useNavigate();

  const [diagnostico, setDiagnostico] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregarDiagnostico() {
      setCarregando(true);
      setErro("");

      try {
        const resposta = await obterDiagnostico(
          Number(diagnosticoId)
        );

        if (ativo) {
          setDiagnostico(resposta);
        }
      } catch (error) {
        if (ativo) {
          setErro(
            error?.response?.data?.detail ||
              error?.message ||
              "Não foi possível carregar o diagnóstico."
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarDiagnostico();

    return () => {
      ativo = false;
    };
  }, [diagnosticoId]);

  if (carregando) {
    return (
      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: 24,
        }}
      >
        Carregando Diagnóstico 360°...
      </main>
    );
  }

  if (erro) {
    return (
      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: 24,
        }}
      >
        <div
          style={{
            padding: 16,
            borderRadius: 14,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
          }}
        >
          {erro}
        </div>

        <div style={{ marginTop: 16 }}>
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
          >
            ← Voltar
          </Button>
        </div>
      </main>
    );
  }

  if (!diagnostico) {
    return null;
  }

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: 24,
      }}
    >
      <Button
        variant="secondary"
        onClick={() => navigate(-1)}
      >
        ← Voltar
      </Button>

      <div style={{ marginTop: 18 }}>
        <div
          style={{
            fontSize: 13,
            color: "#2563eb",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          HISTÓRICO CLÍNICO
        </div>

        <h1
          style={{
            margin: "6px 0 0",
            fontSize: 28,
            color: "#0f172a",
          }}
        >
          🩺 Diagnóstico 360°
        </h1>

        <p
          style={{
            margin: "8px 0 0",
            color: "#475569",
            fontSize: 16,
          }}
        >
          {diagnostico.cid || "CID não informado"}
        </p>
      </div>

      <div
        style={{
          marginTop: 24,
          padding: 20,
          borderRadius: 16,
          border: "1px solid #e5e7eb",
          background: "#ffffff",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            color: "#0f172a",
          }}
        >
          Resumo do diagnóstico
        </h2>

        <div style={{ marginTop: 16 }}>
          <p>
            <strong>Tipo:</strong>{" "}
            {formatarTipo(diagnostico.tipo)}
          </p>

          <p>
            <strong>Status:</strong>{" "}
            {formatarStatus(diagnostico.status)}
          </p>

          <p>
            <strong>Data:</strong>{" "}
            {formatarData(diagnostico.data_diagnostico)}
          </p>

          <p>
            <strong>Descrição:</strong>{" "}
            {diagnostico.descricao_clinica || "-"}
          </p>

          <p>
            <strong>Médico:</strong>{" "}
            {diagnostico.medico_nome || "-"}
          </p>
        </div>
      </div>
    </main>
  );
}