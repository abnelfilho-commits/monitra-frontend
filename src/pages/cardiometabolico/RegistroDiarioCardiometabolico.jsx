import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  buscarPacienteCardiometabolico,
  salvarRegistroCardiometabolico,
} from "../../services/cardiometabolico";

export default function RegistroDiarioCardiometabolico() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [paciente, setPaciente] = useState(null);

  const [form, setForm] = useState({
    glicemia_jejum: "",
    glicemia_pos_prandial: "",

    pressao_sistolica: "",
    pressao_diastolica: "",

    peso: "",

    uso_medicacao: false,
    adesao_alimentar: false,

    tontura: false,
    cefaleia: false,

    atividade_fisica: "baixa",

    ingestao_hidrica: "",

    humor: "estável",
    fadiga: false,
    sono: "regular",
    dor: false,

    observacoes: "",
  });

  useEffect(() => {
    carregarPaciente();
  }, [id]);

  async function carregarPaciente() {
    try {
      const data =
        await buscarPacienteCardiometabolico(id);

      setPaciente(data);
    } catch (err) {
      console.error(err);
    }
  }

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  async function salvar() {
    try {
      await salvarRegistroCardiometabolico({
        paciente_id: Number(id),

        glicemia_jejum:
          form.glicemia_jejum,
 
        glicemia_pos_prandial:
          form.glicemia_pos_prandial,

        pressao_sistolica:
          form.pressao_sistolica,

        pressao_diastolica:
          form.pressao_diastolica,

        peso:
          form.peso,

        ingestao_hidrica:
          form.ingestao_hidrica,

        atividade_fisica:
          form.atividade_fisica,

        humor:
          form.humor,

        sono:
          form.sono,

        fadiga:
          form.fadiga,

        dor:
          form.dor,

        uso_medicacao:
          form.uso_medicacao,

        adesao_alimentar:
          form.adesao_alimentar,

        tontura:
          form.tontura,

        cefaleia:
          form.cefaleia,

        observacoes:
          form.observacoes,  

      });

      alert("Registro salvo com sucesso!");

      navigate(
        `/cardiometabolico/pacientes/${id}`
      );
    } catch (err) {
      console.error(err);

      alert(
        "Erro ao salvar registro diário."
      );
    }
  }

  if (!paciente) {
    return (
      <div style={{ padding: 24 }}>
        Carregando paciente...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >

      {/* HEADER */}
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: 24,
          border: "1px solid #e2e8f0",
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 24,
            flexWrap: "wrap",
          }}
        >

          <div>

            <h1
              style={{
                margin: 0,
                fontSize: 34,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              Registro diário cardiometabólico
            </h1>

            <div
              style={{
                marginTop: 10,
                color: "#64748b",
                fontSize: 16,
              }}
            >
              {paciente.nome}
            </div>

          </div>

          <button
            onClick={() =>
              navigate(
                `/cardiometabolico/pacientes/${id}`
              )
            }
          >
            ← Voltar
          </button>

        </div>

      </div>

      {/* GLICEMIA */}
      <Box titulo="Controle glicêmico">

        <Grid>

          <Input
            label="Glicemia jejum"
            value={form.glicemia_jejum}
            onChange={(e) =>
              atualizarCampo(
                "glicemia_jejum",
                e.target.value
              )
            }
          />

          <Input
            label="Glicemia pós-prandial"
            value={form.glicemia_pos_prandial}
            onChange={(e) =>
              atualizarCampo(
                "glicemia_pos_prandial",
                e.target.value
              )
            }
          />

        </Grid>

        <Grid>

          <Checkbox
            label="Uso correto da medicação"
            checked={form.uso_medicacao}
            onChange={(e) =>
              atualizarCampo(
                "uso_medicacao",
                e.target.checked
              )
            }
          />

          <Checkbox
            label="Adesão alimentar"
            checked={form.adesao_alimentar}
            onChange={(e) =>
              atualizarCampo(
                "adesao_alimentar",
                e.target.checked
              )
            }
          />

        </Grid>

      </Box>

      {/* PRESSÃO */}
      <Box titulo="Pressão arterial">

        <Grid>

          <Input
            label="Pressão sistólica"
            value={form.pressao_sistolica}
            onChange={(e) =>
              atualizarCampo(
                "pressao_sistolica",
                e.target.value
              )
            }
          />

          <Input
            label="Pressão diastólica"
            value={form.pressao_diastolica}
            onChange={(e) =>
              atualizarCampo(
                "pressao_diastolica",
                e.target.value
              )
            }
          />

        </Grid>

        <Grid>

          <Checkbox
            label="Tontura"
            checked={form.tontura}
            onChange={(e) =>
              atualizarCampo(
                "tontura",
                e.target.checked
              )
            }
          />

          <Checkbox
            label="Cefaleia"
            checked={form.cefaleia}
            onChange={(e) =>
              atualizarCampo(
                "cefaleia",
                e.target.checked
              )
            }
          />

        </Grid>

      </Box>

      {/* ANTROPOMETRIA */}
      <Box titulo="Antropometria">

        <Grid>

          <Input
            label="Peso"
            value={form.peso}
            onChange={(e) =>
              atualizarCampo(
                "peso",
                e.target.value
              )
            }
          />

          <Input
            label="Ingestão hídrica"
            value={form.ingestao_hidrica}
            onChange={(e) =>
              atualizarCampo(
                "ingestao_hidrica",
                e.target.value
              )
            }
          />

        </Grid>

        <Select
          label="Atividade física"
          value={form.atividade_fisica}
          onChange={(e) =>
            atualizarCampo(
              "atividade_fisica",
              e.target.value
            )
          }
          options={[
            "baixa",
            "moderada",
            "alta",
          ]}
        />

      </Box>

      {/* OBSERVACIONAL */}
      <Box titulo="Avaliação observacional">

        <Grid>

          <Select
            label="Humor"
            value={form.humor}
            onChange={(e) =>
              atualizarCampo(
                "humor",
                e.target.value
              )
            }
            options={[
              "estável",
              "irritado",
              "ansioso",
              "triste",
            ]}
          />

          <Select
            label="Sono"
            value={form.sono}
            onChange={(e) =>
              atualizarCampo(
                "sono",
                e.target.value
              )
            }
            options={[
              "bom",
              "regular",
              "ruim",
            ]}
          />

        </Grid>

        <Grid>

          <Checkbox
            label="Fadiga"
            checked={form.fadiga}
            onChange={(e) =>
              atualizarCampo(
                "fadiga",
                e.target.checked
              )
            }
          />

          <Checkbox
            label="Dor"
            checked={form.dor}
            onChange={(e) =>
              atualizarCampo(
                "dor",
                e.target.checked
              )
            }
          />

        </Grid>

        <Textarea
          label="Observações clínicas"
          value={form.observacoes}
          onChange={(e) =>
            atualizarCampo(
              "observacoes",
              e.target.value
            )
          }
        />

      </Box>

      {/* BOTÃO */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
        }}
      >

        <button
          onClick={salvar}
          style={{
            background: "#16a34a",
            color: "#fff",
            border: "none",
            padding: "14px 24px",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          Salvar registro clínico
        </button>

      </div>

    </div>
  );
}

function Box({ titulo, children }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 20,
        padding: 24,
        border: "1px solid #e2e8f0",
      }}
    >

      <h2
        style={{
          marginTop: 0,
          marginBottom: 24,
          color: "#0f172a",
        }}
      >
        {titulo}
      </h2>

      {children}

    </div>
  );
}

function Grid({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 16,
        marginBottom: 20,
      }}
    >
      {children}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}) {
  return (
    <div>

      <div
        style={{
          marginBottom: 8,
          fontWeight: 600,
          color: "#334155",
        }}
      >
        {label}
      </div>

      <input
        type="number"
        value={value}
        onChange={onChange}
        style={{
          width: "100%",
          padding: 14,
          borderRadius: 12,
          border: "1px solid #cbd5e1",
          fontSize: 15,
        }}
      />

    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <div>

      <div
        style={{
          marginBottom: 8,
          fontWeight: 600,
        }}
      >
        {label}
      </div>

      <select
        value={value}
        onChange={onChange}
        style={{
          width: "100%",
          padding: 14,
          borderRadius: 12,
          border: "1px solid #cbd5e1",
          fontSize: 15,
        }}
      >

        {options.map((item) => (
          <option
            key={item}
            value={item}
          >
            {item}
          </option>
        ))}

      </select>

    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontWeight: 600,
        color: "#334155",
      }}
    >

      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
      />

      {label}

    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
}) {
  return (
    <div>

      <div
        style={{
          marginBottom: 8,
          fontWeight: 600,
        }}
      >
        {label}
      </div>

      <textarea
        value={value}
        onChange={onChange}
        rows={6}
        style={{
          width: "100%",
          padding: 16,
          borderRadius: 12,
          border: "1px solid #cbd5e1",
          fontSize: 15,
          resize: "vertical",
        }}
      />

    </div>
  );
}
