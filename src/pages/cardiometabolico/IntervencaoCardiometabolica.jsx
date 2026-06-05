import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import Button from "../../components/ui/Button";

export default function IntervencaoCardiometabolica() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tipo, setTipo] = useState("ajuste_medicamentoso");
  const [prioridade, setPrioridade] = useState("moderada");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  async function salvar(e) {
    e.preventDefault();

    try {
      setSalvando(true);
      setErro(null);

      await api.post(
        `/cardiometabolico/pacientes/${id}/intervencoes`,
        {
          tipo,
          prioridade,
          descricao,
        }
      );

      navigate(`/cardiometabolico/pacientes/${id}`);
    } catch (error) {
      console.error(error);
      setErro("Falha ao registrar intervenção.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: "0 auto" }}>
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: 24,
          border: "1px solid #e2e8f0",
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          Nova intervenção cardiometabólica
        </h2>

        <p style={{ color: "#64748b" }}>
          Registre uma ação assistencial relacionada ao cuidado longitudinal.
        </p>

        {erro && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: 12,
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            {erro}
          </div>
        )}

        <form onSubmit={salvar}>
          <label>Tipo de intervenção</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            style={campo}
          >
            <option value="ajuste_medicamentoso">Ajuste medicamentoso</option>
            <option value="nutricao">Encaminhamento nutricional</option>
            <option value="atividade_fisica">Plano de atividade física</option>
            <option value="busca_ativa">Busca ativa</option>
            <option value="telemonitoramento">Telemonitoramento</option>
            <option value="educacao_saude">Educação em saúde</option>
            <option value="reavaliacao">Reavaliação clínica</option>
          </select>

          <label>Prioridade</label>
          <select
            value={prioridade}
            onChange={(e) => setPrioridade(e.target.value)}
            style={campo}
          >
            <option value="baixa">Baixa</option>
            <option value="moderada">Moderada</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>

          <label>Descrição</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={6}
            placeholder="Descreva a intervenção realizada ou planejada..."
            style={{
              ...campo,
              resize: "vertical",
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 18,
              flexWrap: "wrap",
            }}
          >
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar intervenção"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                navigate(`/cardiometabolico/pacientes/${id}`)
              }
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

const campo = {
  width: "100%",
  marginTop: 8,
  marginBottom: 16,
  padding: 12,
  border: "1px solid #d1d5db",
  borderRadius: 10,
  fontSize: 14,
  boxSizing: "border-box",
};