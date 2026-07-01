export const assessmentLabels = {
  MCHAT: "M-CHAT",
  DENVER: "Denver II",
};

export function getAssessmentLabel(codigo) {
  return assessmentLabels[codigo] || codigo;
}