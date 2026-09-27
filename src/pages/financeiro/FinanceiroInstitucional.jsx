import { useEffect, useMemo, useState } from "react";

import Button from "../../components/ui/Button";

import {
  obterContextoFinanceiroInstitucional,
  gerarPreviewFinanceiroInstitucional,
} from "../../services/financeiroInstitucional";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function inicioAnoISO() {
  const ano = new Date().getFullYear();
  return `${ano}-01-01`;
}

export default function FinanceiroInstitucional() {
  const [contexto, setContexto] = useState(null);
  const [instituicaoId, setInstituicaoId] = useState("");
  const [contratoId, setContratoId] = useState("");
  const [dataInicio, setDataInicio] = useState(inicioAnoISO());
  const [dataFim, setDataFim] = useState(hojeISO());

  const [preview, setPreview] = useState(null);
  const [loadingContexto, setLoadingContexto] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [erro, setErro] = useState("");

  async function carregarContexto() {
    setErro("");
    setLoadingContexto(true);

    try {
      const data = await obterContextoFinanceiroInstitucional();
      setContexto(data);

      if (data?.instituicoes?.length === 1) {
        setInstituicaoId(String(data.instituicoes[0].id));
      }
    } catch (e) {
      const detail = e?.response?.data?.detail;

      setErro(
        detail?.message ||
          detail?.code ||
          e?.message ||
          "Falha ao carregar contexto financeiro."
      );
    } finally {
      setLoadingContexto(false);
    }
  }

  useEffect(() => {
    carregarContexto();
  }, []);

  const contratosDisponiveis = useMemo(() => {
    if (!contexto?.contratos || !instituicaoId) return [];

    return contexto.contratos.filter(
      (item) => String(item.instituicao_id) === String(instituicaoId)
    );
  }, [contexto, instituicaoId]);

  useEffect(() => {
    if (
      contratoId &&
      !contratosDisponiveis.some(
        (item) => String(item.id) === String(contratoId)
      )
    ) {
      setContratoId("");
    }

    if (!contratoId && contratosDisponiveis.length === 1) {
      setContratoId(String(contratosDisponiveis[0].id));
    }
  }, [contratosDisponiveis, contratoId]);

  async function gerarVisao() {
    if (!instituicaoId || !contratoId || !dataInicio || !dataFim) {
      setErro("Selecione instituição, contrato e período.");
      return;
    }

    setErro("");
    setLoadingPreview(true);
    setPreview(null);

    try {
      const data = await gerarPreviewFinanceiroInstitucional({
        instituicao_id: Number(instituicaoId),
        contrato_id: Number(contratoId),
        modulo_id: 1,
        data_inicio: dataInicio,
        data_fim: dataFim,
      });

      setPreview(data);
    } catch (e) {
      const detail = e?.response?.data?.detail;

      setErro(
        detail?.message ||
          detail?.code ||
          e?.message ||
          "Falha ao gerar visão financeira."
      );
    } finally {
      setLoadingPreview(false);
    }
  }

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 1280,
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0 }}>
          Cockpit Financeiro Institucional
        </h2>

        <p
          style={{
            marginTop: 8,
            marginBottom: 0,
            color: "#4b5563",
            maxWidth: 760,
            lineHeight: 1.5,
          }}
        >
          Visão objetiva da projeção financeira assistencial por instituição,
          contrato e período.
        </p>
      </div>

      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 20,
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 18 }}>
          Contexto da projeção
        </h3>

        {loadingContexto ? (
          <div>Carregando contexto financeiro...</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              alignItems: "end",
            }}
          >
            <label>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>
                Instituição
              </div>

              <select
                value={instituicaoId}
                onChange={(e) => {
                  setInstituicaoId(e.target.value);
                  setContratoId("");
                  setPreview(null);
                }}
                style={{ width: "100%", padding: 10 }}
              >
                <option value="">Selecione</option>

                {contexto?.instituicoes?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>
                Contrato
              </div>

              <select
                value={contratoId}
                onChange={(e) => {
                  setContratoId(e.target.value);
                  setPreview(null);
                }}
                disabled={!instituicaoId}
                style={{ width: "100%", padding: 10 }}
              >
                <option value="">Selecione</option>

                {contratosDisponiveis.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.codigo} — edição {item.edicao}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>
                Data inicial
              </div>

              <input
                type="date"
                value={dataInicio}
                onChange={(e) => {
                  setDataInicio(e.target.value);
                  setPreview(null);
                }}
                style={{ width: "100%", padding: 9 }}
              />
            </label>

            <label>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>
                Data final
              </div>

              <input
                type="date"
                value={dataFim}
                onChange={(e) => {
                  setDataFim(e.target.value);
                  setPreview(null);
                }}
                style={{ width: "100%", padding: 9 }}
              />
            </label>

            <Button
              onClick={gerarVisao}
              disabled={loadingPreview || loadingContexto}
            >
              {loadingPreview
                ? "Gerando..."
                : "Gerar visão financeira"}
            </Button>
          </div>
        )}

        {erro ? (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 10,
              background: "#fef2f2",
              color: "#991b1b",
            }}
          >
            {erro}
          </div>
        ) : null}

        {preview ? (
          <div
            style={{
              marginTop: 18,
              padding: 12,
              borderRadius: 10,
              background: "#f0fdf4",
              color: "#166534",
              fontWeight: 600,
            }}
          >
            Projeção financeira carregada com sucesso.
          </div>
        ) : null}
      </div>
    </div>
  );
}
