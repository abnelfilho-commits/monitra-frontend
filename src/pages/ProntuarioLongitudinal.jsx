import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

import {
  ClinicalHeader,
  ClinicalSection,
  SummaryCard,
  ClinicalField,
  StatusBadge,
} from "../components/clinical";

export default function ProntuarioLongitudinal() {
  const { tipo, id } = useParams();
  const navigate = useNavigate();

  const [evento, setEvento] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarEvento() {
      try {
        setCarregando(true);
        setErro("");

        const response = await api.get(`/timeline/eventos/${tipo}/${id}`);

        setEvento(response.data);
      } catch (err) {
        console.error(err);
        setErro("Não foi possível carregar o evento clínico.");
      } finally {
        setCarregando(false);
      }
    }

    carregarEvento();
  }, [tipo, id]);

  function formatarData(data) {
    if (!data) return "-";

    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function renderValor(item) {
    const valor = item?.label ?? item?.valor;

    if (item?.tipo === "boolean") {
      return <StatusBadge valor={valor} />;
    }

    if (valor === null || valor === undefined || valor === "") {
      return "-";
    }

    if (typeof valor === "object") {
      return (
        <pre style={styles.jsonBox}>
          {JSON.stringify(valor, null, 2)}
        </pre>
      );
    }

    return valor;
  }

  if (carregando) {
    return <div style={styles.container}>Carregando prontuário...</div>;
  }

  if (erro) {
    return (
      <div style={styles.container}>
        <p>{erro}</p>

        <button style={styles.voltar} onClick={() => navigate(-1)}>
          ← Voltar
        </button>
      </div>
    );
  }

  if (!evento) {
    return null;
  }

  return (
    <div style={styles.container}>
      <button style={styles.voltar} onClick={() => navigate(-1)}>
        ← Voltar
      </button>

      <ClinicalHeader
        titulo={evento.titulo}
        paciente={evento.subtitulo}
        data={formatarData(evento.data)}
        profissional={evento.profissional}
        origem={evento.origem}
      />

      {evento.cards?.length > 0 && (
        <ClinicalSection titulo="Resumo Clínico">
          <div style={styles.cards}>
            {evento.cards.map((card, index) => (
              <SummaryCard
                key={index}
                titulo={card.titulo}
                valor={card.label ?? card.valor}
              />
            ))}
          </div>
        </ClinicalSection>
      )}

      {evento.conteudo?.length > 0 && (
        <ClinicalSection titulo="Registro Clínico">
          <div style={styles.lista}>
            {evento.conteudo.map((item, index) => (
              <ClinicalField
                key={index}
                titulo={item.titulo}
                valor={renderValor(item)}
              />
            ))}
          </div>
        </ClinicalSection>
      )}

      {evento.interpretacao && (
        <ClinicalSection titulo="Leitura Clínica">
          <p style={styles.texto}>{evento.interpretacao}</p>
        </ClinicalSection>
      )}

      {evento.conduta && (
        <ClinicalSection titulo="Plano de Conduta">
          <p style={styles.texto}>{evento.conduta}</p>
        </ClinicalSection>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "32px",
    maxWidth: "1100px",
    margin: "0 auto",
  },
  voltar: {
    marginBottom: "20px",
    padding: "8px 14px",
    cursor: "pointer",
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
  },
  lista: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  texto: {
    lineHeight: "1.6",
  },
  jsonBox: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "12px",
    marginTop: "8px",
    whiteSpace: "pre-wrap",
    overflowX: "auto",
    fontSize: "13px",
  },
};