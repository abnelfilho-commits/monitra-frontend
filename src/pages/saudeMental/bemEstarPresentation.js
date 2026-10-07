// Display labels only; no score, inference or clinical interpretation.
export const responseLabels = { humor: "Humor", ansiedade: "Ansiedade / tensão", estresse: "Estresse percebido", sono: "Sono", energia: "Energia", funcionamento: "Funcionamento", trabalho: "Percepção relacionada ao trabalho", evento_relevante: "Evento relevante", evento_descricao: "Descrição do evento", pedido_ajuda: "Pedido de apoio" };
export const valueLabels = { SIM: "Sim", NAO: "Não", MUITO_RUIM: "Muito ruim", RUIM: "Ruim", REGULAR: "Regular", BOM: "Bom", MUITO_BOM: "Muito bom", NENHUMA: "Nenhuma", POUCA: "Pouca", MODERADA: "Moderada", MUITA: "Muita", EXTREMA: "Extrema", NAO_SE_APLICA: "Não se aplica" };

// Explicit ordinal categories from BEM_ESTAR_V1. No numeric score or inference.
const quality = ["MUITO_RUIM", "RUIM", "REGULAR", "BOM", "MUITO_BOM"];
const intensity = ["NENHUMA", "POUCA", "MODERADA", "MUITA", "EXTREMA"];
export const wellbeingDimensions = ["humor", "ansiedade", "estresse", "sono", "energia", "funcionamento", "trabalho"].map(key => ({
  key, label: responseLabels[key], categories: ["ansiedade", "estresse"].includes(key) ? intensity : quality,
}));
export const displayTimestamp = value => Number.isFinite(typeof value === "number" ? value : Date.parse(value))
  ? new Date(value).toLocaleString("pt-BR") : "Data/hora não informada";

export function orderedCheckins(checkins = []) {
  return [...checkins].sort((a, b) => {
    const left = Date.parse(a.data_hora), right = Date.parse(b.data_hora);
    if (!Number.isFinite(left)) return Number.isFinite(right) ? 1 : a.id - b.id;
    if (!Number.isFinite(right)) return -1;
    return left - right || a.id - b.id;
  });
}

export function wellbeingSeries(checkins, dimension) {
  return orderedCheckins(checkins).filter(item => Number.isFinite(Date.parse(item.data_hora))).map(item => ({
    id: item.id, timestamp: Date.parse(item.data_hora),
    value: dimension.categories.includes(item.respostas[dimension.key]) ? item.respostas[dimension.key] : null,
    // Layout coordinate only: labels retain the persisted ordinal category. Never a clinical score.
    position: dimension.categories.includes(item.respostas[dimension.key]) ? dimension.categories.indexOf(item.respostas[dimension.key]) : null,
    answer: valueLabels[item.respostas[dimension.key]] || item.respostas[dimension.key] || "Não informado",
  }));
}

// Common orientation is visual only; each dimension retains its real answer.
export function wellbeingOverview(checkins = []) {
  return orderedCheckins(checkins).filter(item => Number.isFinite(Date.parse(item.data_hora))).map(item => {
    const row = { id: item.id, timestamp: Date.parse(item.data_hora), answers: {} };
    wellbeingDimensions.forEach(dimension => {
      const answer = item.respostas[dimension.key];
      const position = dimension.categories.indexOf(answer);
      row[dimension.key] = position < 0 ? null
        : ["ansiedade", "estresse"].includes(dimension.key) ? dimension.categories.length - 1 - position : position;
      row.answers[dimension.key] = valueLabels[answer] || "Não informado";
    });
    return row;
  });
}

// Adapter for the existing pure TimelineEvents renderer; no legacy data acquisition.
export function wellbeingEvents(checkins, personName, personId) {
  return orderedCheckins(checkins).sort((a, b) => {
    const left = Date.parse(a.data_hora), right = Date.parse(b.data_hora);
    return (Number.isFinite(right) ? right : -Infinity) - (Number.isFinite(left) ? left : -Infinity) || a.id - b.id;
  }).map(item => ({
    id: `CHECKIN:${item.id}`, tipo: "Check-in de Bem-Estar",
    nome: item.baseline ? "Check-in Inicial · Baseline" : null,
    created_at: Number.isFinite(Date.parse(item.data_hora)) ? item.data_hora : null,
    origem: item.canal === "PORTAL_PROFISSIONAL" ? "Portal Profissional" : item.canal,
    descricao: `Respondente: ${item.respondente_pessoa_id === personId ? personName : "Identificação não disponível"}\nModalidade: ${item.modalidade === "ASSISTIDO" ? "Assistida" : item.modalidade}`,
    metadata: { answers: [
      ...Object.entries(item.respostas).map(([name, value]) => ({ field_id: name, name: responseLabels[name] || name, values: { resposta: valueLabels[value] || value } })),
      ...(item.registrador_profissional_id == null ? [] : [{ field_id: "registrador", name: "Identificação do profissional registrador", values: { id: item.registrador_profissional_id } }]),
    ] },
  }));
}
