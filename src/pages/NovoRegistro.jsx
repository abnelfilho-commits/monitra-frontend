import { useState } from "react";
import { criarRegistro } from "../services/registros";

export default function NovoRegistro({ pacienteId }) {

  const [form, setForm] = useState({
    data: "",
    sono_qualidade: "",
    evacuacao: false,
    consistencia_fezes: "",
    irritabilidade: "",
    crise_sensorial: false,
    observacao: ""
  });

  const salvar = async () => {
    await criarRegistro({
      paciente_id: pacienteId,
      ...form
    });

    alert("Registro salvo com sucesso");
  };

  return (
    <div>

      <h2>Novo Registro Diário</h2>

      <input type="date"
        onChange={(e)=>setForm({...form,data:e.target.value})}
      />

      <input placeholder="Sono"
        onChange={(e)=>setForm({...form,sono_qualidade:e.target.value})}
      />

      <textarea placeholder="Observação"
        onChange={(e)=>setForm({...form,observacao:e.target.value})}
      />

      <button onClick={salvar}>
        Salvar
      </button>

    </div>
  );
}
