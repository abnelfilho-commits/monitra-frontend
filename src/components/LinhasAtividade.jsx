export default function LinhasAtividade({ linhas, selecionadas, onChange, disabled = false }) {
  return <fieldset disabled={disabled} style={{ border: "1px solid #d1d5db", borderRadius: 12, padding: 14, marginBottom: 16 }}>
    <legend>Linhas aplicáveis</legend>
    {linhas.map(linha => <label key={linha.id} style={{ display: "block", marginBottom: 8 }}>
      <input type="checkbox" checked={selecionadas.includes(linha.id)} onChange={e => onChange(e.target.checked ? [...selecionadas, linha.id] : selecionadas.filter(id => id !== linha.id))} /> {linha.nome}
    </label>)}
  </fieldset>;
}
