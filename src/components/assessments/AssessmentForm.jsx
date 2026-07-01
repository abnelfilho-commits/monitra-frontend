import React, { useEffect, useMemo, useState } from "react";
import AssessmentField from "./AssessmentField";
import AssessmentResult from "./AssessmentResult";
import {
  obterFormulario,
  salvarRegistroLongitudinal,
  obterAssessmentPorRegistro,
} from "../../services/assessmentService";

export default function AssessmentForm({ codigo, pacienteId }) {
  const [formulario, setFormulario] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [tentouEnviar, setTentouEnviar] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        setCarregando(true);
        setErro("");
        setResultado(null);

        const data = await obterFormulario(codigo);
        setFormulario(data);
      } catch (e) {
        setErro("Não foi possível carregar o formulário.");
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, [codigo]);

  function campoRespondido(campo) {
    const valor = respostas[campo.nome_campo];
    return valor !== undefined && valor !== null && valor !== "";
  }

  const totalPerguntas = formulario?.campos?.length || 0;

  const respondidas = useMemo(() => {
    if (!formulario?.campos) return 0;
    return formulario.campos.filter(campoRespondido).length;
  }, [formulario, respostas]);

  const pendentes = useMemo(() => {
    if (!formulario?.campos) return [];
    return formulario.campos.filter((campo) => !campoRespondido(campo));
  }, [formulario, respostas]);

  const percentual =
    totalPerguntas > 0 ? Math.round((respondidas / totalPerguntas) * 100) : 0;

  const avaliacaoCompleta = totalPerguntas > 0 && respondidas === totalPerguntas;

  function handleChange(nomeCampo, valor) {
    setRespostas((prev) => ({
      ...prev,
      [nomeCampo]: valor,
    }));
  }

  function irParaPrimeiraPendente() {
    const primeira = pendentes[0];

    if (!primeira) return;

    const elemento = document.getElementById(`campo-${primeira.id}`);

    if (elemento) {
      elemento.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setResultado(null);
    setTentouEnviar(true);

    if (!avaliacaoCompleta) {
      setErro(
        `Existem ${pendentes.length} pergunta(s) obrigatória(s) ainda não respondida(s).`
      );
      irParaPrimeiraPendente();
      return;
    }

    try {
      setSalvando(true);

      const payload = {
        paciente_id: pacienteId,
        modulo_id: formulario.modulo_id,
        formulario_id: formulario.id,
        origem: "PROFISSIONAL",
        data_registro: new Date().toISOString().slice(0, 10),
        respostas: formulario.campos.map((campo) => ({
          campo_id: campo.id,
          valor: respostas[campo.nome_campo] ?? null,
        })),
      };

      const registro = await salvarRegistroLongitudinal(payload);
      const avaliacao = await obterAssessmentPorRegistro(registro.id);

      setResultado(avaliacao.resultado);

      setTimeout(() => {
        const elementoResultado = document.getElementById("resultado-avaliacao");
        if (elementoResultado) {
          elementoResultado.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 150);
    } catch (e) {
      setErro("Erro ao finalizar avaliação.");
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow">
        <p className="text-gray-600">Carregando formulário...</p>
      </div>
    );
  }

  if (erro && !formulario) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow">
        <p className="text-red-600 font-medium">{erro}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-7 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>

            <h1
              style={{
                fontSize: "32px",
                fontWeight: 700,
                margin: 0,
                color: "#0f172a",
              }}
            >
              Aplicação da Avaliação
            </h1>
            <p className="text-gray-600 mt-2">
              Responda todas as perguntas para finalizar a avaliação.
            </p>
          </div>

          <div
            className={`
              px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap
              ${
                avaliacaoCompleta
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700"
              }
            `}
          >
            {respondidas}/{totalPerguntas} respondidas
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Progresso
            </span>

            <span className="text-sm font-semibold text-gray-700">
              {percentual}%
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`
                h-3 rounded-full transition-all duration-500
                ${avaliacaoCompleta ? "bg-green-600" : "bg-blue-600"}
              `}
              style={{ width: `${percentual}%` }}
            />
          </div>

          <p className="mt-2 text-sm text-gray-500">
            {avaliacaoCompleta
              ? "✓ Avaliação completa. Pronta para finalizar."
              : `${totalPerguntas - respondidas} pergunta(s) restante(s).`}
          </p>
        </div>
      </div>

      {erro && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="font-medium">{erro}</p>

            {pendentes.length > 0 && (
              <button
                type="button"
                onClick={irParaPrimeiraPendente}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
              >
                Ir para pendência
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {formulario.campos.map((campo, index) => (
          <div
            key={campo.id}
            id={`campo-${campo.id}`}
            className={
              tentouEnviar && !campoRespondido(campo)
                ? "rounded-2xl ring-2 ring-red-300 ring-offset-2 mb-6"
                : "mb-6"
            }
          >
            <AssessmentField
              campo={campo}
              numero={index + 1}
              valor={respostas[campo.nome_campo]}
              onChange={handleChange}
            />
          </div>
        ))}

        <div className="sticky bottom-0 bg-white/90 backdrop-blur border border-gray-100 rounded-2xl shadow-lg p-4 mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-600">
              {avaliacaoCompleta
                ? "Tudo certo. A avaliação pode ser finalizada."
                : `${pendentes.length} pergunta(s) pendente(s).`}
            </p>

            <button
              type="submit"
              disabled={salvando}
              className={`
                px-6 py-3 rounded-xl text-white font-semibold transition disabled:opacity-60
                ${
                  avaliacaoCompleta
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-500 hover:bg-gray-600"
                }
              `}
            >
              {salvando
                ? "Finalizando..."
                : avaliacaoCompleta
                ? "Finalizar Avaliação"
                : `Responder ${pendentes.length} restante(s)`}
            </button>
          </div>
        </div>
      </form>

      <div id="resultado-avaliacao">
        {resultado && <AssessmentResult resultado={resultado} />}
      </div>
    </div>
  );
}