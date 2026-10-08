// Display only: scores, domain labels and interpretation are persisted backend evidence.
export default function CBIResult({ result }) {
  return <div aria-label="Resultados por domínio CBI">
    {result.dominios.map(domain => <p key={domain.codigo}><strong>{domain.nome}: {domain.score} / {domain.score_max}</strong></p>)}
    <p>{result.interpretacao}</p>
    <small>CBI · Versão brasileira para profissionais de saúde — Moser et al. (2023). Fonte original: Borritz et al., Scandinavian Journal of Public Health (2006), 34:49–58.</small>
  </div>;
}
