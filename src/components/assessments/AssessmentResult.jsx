import React from "react";

function normalizarTexto(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function obterEstiloClassificacao(classificacao = "") {
  const texto = normalizarTexto(classificacao);

  if (texto.includes("baixo")) {
    return {
      badge: "bg-green-100 text-green-700 border-green-200",
      score: "text-green-700",
      border: "border-green-200",
      background: "bg-green-50",
      label: "Baixo risco",
    };
  }

  if (texto.includes("moderado") || texto.includes("medio")) {
    return {
      badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
      score: "text-yellow-700",
      border: "border-yellow-200",
      background: "bg-yellow-50",
      label: "Risco moderado",
    };
  }

  if (texto.includes("alto") || texto.includes("critico")) {
    return {
      badge: "bg-red-100 text-red-700 border-red-200",
      score: "text-red-700",
      border: "border-red-200",
      background: "bg-red-50",
      label: "Alto risco",
    };
  }

  return {
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    score: "text-blue-700",
    border: "border-blue-200",
    background: "bg-blue-50",
    label: classificacao || "Classificação",
  };
}

export default function AssessmentResult({ resultado }) {
  if (!resultado) return null;

  const estilo = obterEstiloClassificacao(resultado.classificacao);
  const alertas = resultado.alertas || [];

  return (
    <div className="mt-10 rounded-3xl border border-gray-200 bg-white shadow-lg overflow-hidden">
      <div className={`border-b ${estilo.border} ${estilo.background} p-6 sm:p-8`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">
              Resultado da Avaliação
            </p>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              {resultado.instrumento_label || resultado.instrumento || "Avaliação Clínica"}
            </h2>

            {resultado.versao && (
              <p className="text-sm text-gray-500 mt-1">
                Versão {resultado.versao}
              </p>
            )}
          </div>

          <span
            className={`inline-flex items-center justify-center px-4 py-2 rounded-full border text-sm font-bold ${estilo.badge}`}
          >
            {resultado.classificacao || estilo.label}
          </span>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white/80 border border-white p-5 shadow-sm sm:col-span-1">
            <p className="text-sm font-semibold text-gray-500 mb-2">
              Score
            </p>

            <div className={`text-6xl font-extrabold leading-none ${estilo.score}`}>
              {resultado.score ?? "-"}
            </div>

            {resultado.score_texto && (
              <p className="text-sm text-gray-500 mt-2">
                {resultado.score_texto}
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-white/80 border border-white p-5 shadow-sm sm:col-span-2">
            <p className="text-sm font-semibold text-gray-500 mb-2">
              Classificação clínica
            </p>

            <p className="text-xl font-bold text-gray-900">
              {resultado.classificacao || "Não informada"}
            </p>

            <p className="text-sm text-gray-600 mt-2">
              Resultado calculado automaticamente pelo Framework Universal de Avaliações Clínicas.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-5">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
              ✓
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Conduta recomendada
              </h3>

              <p className="text-gray-700 leading-relaxed">
                {resultado.conduta || "Nenhuma conduta registrada para esta avaliação."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            Interpretação clínica
          </h3>

          <p className="text-gray-700 leading-relaxed">
            {resultado.interpretacao || "Nenhuma interpretação registrada para esta avaliação."}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            Alertas
          </h3>

          {alertas.length > 0 ? (
            <ul className="space-y-2">
              {alertas.map((alerta, index) => (
                <li
                  key={index}
                  className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-orange-800 font-medium"
                >
                  {alerta}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">
              Nenhum alerta clínico adicional identificado nesta avaliação.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: "12px 18px",
              borderRadius: 12,
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Imprimir resultado
          </button>

          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            style={{
              padding: "12px 18px",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#111827",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Voltar ao topo
          </button>
        </div>
      </div>
    </div>
  );
}