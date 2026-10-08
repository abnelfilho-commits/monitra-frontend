import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import LinhasAtividade from "../components/LinhasAtividade";
import Button from "../components/ui/Button";

import {
  listarAtividadesTerapeuticas,
  listarLinhasAtividade,
  atualizarLinhasAtividade,
  listarOcupacoesProfissionais,
  listarOcupacoesDaAtividade,
  vincularOcupacaoAtividade,
  removerOcupacaoAtividade,
} from "../services/atividadesTerapeuticas";

export default function AtividadesTerapeuticas() {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();

  const isCardio =
    searchParams.get("modulo") === "cardiometabolico";

  const isMental = searchParams.get("modulo") === "saude_mental";
  const moduloId = isMental ? 3 : isCardio ? 2 : 1;

  const [atividades, setAtividades] = useState([]);
  const [ocupacoes, setOcupacoes] = useState([]);

  const [atividadeSelecionada, setAtividadeSelecionada] = useState("");
  const [ocupacoesVinculadas, setOcupacoesVinculadas] = useState([]);
  const [ocupacoesOriginais, setOcupacoesOriginais] = useState([]);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

  const [linhas, setLinhas] = useState([]);
  const [linhasSelecionadas, setLinhasSelecionadas] = useState([]);
  const carregarDados = useCallback(async () => {
    try {
      setErro("");
      const [atividadesData, ocupacoesData, linhasData] = await Promise.all([
        listarAtividadesTerapeuticas(moduloId), listarOcupacoesProfissionais(), listarLinhasAtividade(),
      ]);
      setAtividades(Array.isArray(atividadesData) ? atividadesData : []);
      setOcupacoes(Array.isArray(ocupacoesData) ? ocupacoesData : []);
      setLinhas(Array.isArray(linhasData) ? linhasData : []);
      setAtividadeSelecionada(""); setLinhasSelecionadas([]);
    } catch { setErro("Não foi possível consultar o catálogo."); }
  }, [moduloId]);
  useEffect(() => { carregarDados(); }, [carregarDados]);

  async function salvarLinhas() {
    if (!linhasSelecionadas.length) { setErro("Selecione pelo menos uma linha aplicável."); return; }
    setLoading(true); setErro("");
    try {
      await atualizarLinhasAtividade(Number(atividadeSelecionada), linhasSelecionadas);
      await carregarDados(); setMensagem("Linhas aplicáveis atualizadas.");
    } catch { setErro("Não foi possível confirmar a atualização. Consulte novamente o catálogo."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (atividadeSelecionada) {
      carregarVinculos(atividadeSelecionada);
    } else {
      setOcupacoesVinculadas([]);
      setOcupacoesOriginais([]);
    }
  }, [atividadeSelecionada]);

  async function carregarVinculos(atividadeId) {
    try {
      setErro("");
      setMensagem("");

      const data = await listarOcupacoesDaAtividade(atividadeId);
      const ids = Array.isArray(data) ? data.map((o) => o.id) : [];

      setOcupacoesVinculadas(ids);
      setOcupacoesOriginais(ids);
    } catch (e) {
      setErro(
        e?.response?.data?.detail ||
          e?.message ||
          "Erro ao carregar vínculos."
      );
    }
  }

  function toggleOcupacao(id) {
    setOcupacoesVinculadas((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }

  async function salvarVinculos() {
    if (!atividadeSelecionada) {
      setErro("Selecione uma atividade.");
      return;
    }

    try {
      setLoading(true);
      setErro("");
      setMensagem("");

      const adicionar = ocupacoesVinculadas.filter(
        (id) => !ocupacoesOriginais.includes(id)
      );

      const remover = ocupacoesOriginais.filter(
        (id) => !ocupacoesVinculadas.includes(id)
      );

      for (const ocupacaoId of adicionar) {
        await vincularOcupacaoAtividade(
          Number(atividadeSelecionada),
          ocupacaoId
        );
      }

      for (const ocupacaoId of remover) {
        await removerOcupacaoAtividade(
          Number(atividadeSelecionada),
          ocupacaoId
        );
      }

      setOcupacoesOriginais([...ocupacoesVinculadas]);
      setMensagem("Vínculo atualizado com sucesso.");

      setTimeout(() => {
        setMensagem("");
      }, 3000);
    } catch (e) {
      setErro(
        e?.response?.data?.detail ||
          e?.message ||
          "Erro ao atualizar vínculos."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <label>Linha do catálogo<select value={isMental ? "saude_mental" : isCardio ? "cardiometabolico" : "neuro"} onChange={e => setSearchParams(e.target.value === "neuro" ? {} : {modulo:e.target.value})}><option value="neuro">Neurodesenvolvimento</option><option value="cardiometabolico">Cardiometabólico</option><option value="saude_mental">Saúde Mental</option></select></label><h2 style={{ marginTop: 0 }}>Atividades Terapêuticas</h2>

        {erro && (
          <div style={erroStyle}>
            {erro}
          </div>
        )}

        {mensagem && (
          <div style={sucessoStyle}>
            {mensagem}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <Button
            onClick={() =>
              navigate(
                `/atividades-terapeuticas/nova${
                  isMental ? "?modulo=saude_mental" : isCardio ? "?modulo=cardiometabolico" : ""
                }`
              )
            }
          >
            + Nova Atividade
          </Button>

          <Button
            onClick={() => navigate("/ocupacoes-profissionais/nova")}
          >
            + Nova Ocupação
          </Button>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Vínculo Atividade x Ocupação</h3>

          <label style={labelStyle}>Atividade terapêutica</label>

          <select
            style={inputStyle}
            value={atividadeSelecionada}
            onChange={(e) => { setAtividadeSelecionada(e.target.value); setLinhasSelecionadas(atividades.find(a => a.id === Number(e.target.value))?.modulo_ids || []); }}
          >
            <option value="">Selecione uma atividade</option>

            {atividades.map((atividade) => (
              <option key={atividade.id} value={atividade.id}>
                {atividade.nome}
              </option>
            ))}
          </select>

          {atividadeSelecionada && (
            <>
              <LinhasAtividade linhas={linhas} selecionadas={linhasSelecionadas} onChange={setLinhasSelecionadas} disabled={loading} />
              <Button onClick={salvarLinhas} disabled={loading}>Salvar linhas aplicáveis</Button>
              <div
                style={{
                  marginTop: 20,
                  marginBottom: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#374151",
                }}
              >
                Profissionais habilitados para executar esta atividade
              </div>

              {ocupacoes.length === 0 ? (
                <div style={{ color: "#6b7280", fontSize: 14 }}>
                  Nenhuma ocupação profissional cadastrada.
                </div>
              ) : (
                <div style={{ marginTop: 10 }}>
                  {ocupacoes.map((ocupacao) => (
                    <label
                      key={ocupacao.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 12,
                        fontSize: 16,
                        color: "#1f2937",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={ocupacoesVinculadas.includes(ocupacao.id)}
                        onChange={() => toggleOcupacao(ocupacao.id)}
                      />

                      {ocupacao.nome}
                    </label>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 22 }}>
                <Button
                  onClick={salvarVinculos}
                  disabled={loading}
                >
                  {loading ? "Salvando..." : "Salvar Vínculos"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  marginBottom: 12,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  color: "#374151",
};

const erroStyle = {
  background: "#fee2e2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  padding: 12,
  borderRadius: 10,
  marginBottom: 16,
};

const sucessoStyle = {
  background: "#dcfce7",
  border: "1px solid #86efac",
  color: "#166534",
  padding: 12,
  borderRadius: 10,
  marginBottom: 16,
};