import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Button from "../components/ui/Button";

import {
  criarAtividadeTerapeutica,
} from "../services/atividadesTerapeuticas";

export default function NovaAtividadeTerapeutica() {
  const navigate = useNavigate();

  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);

  const isCardio =
    searchParams.get("modulo") === "cardiometabolico";

  const moduloId = isCardio ? 2 : 1;

  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    duracao_minutos: "",
  });

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [saving, setSaving] = useState(false);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();

    setErro("");
    setMensagem("");

    if (!form.nome.trim()) {
      setErro("Informe o nome da atividade.");
      return;
    }

    setSaving(true);

    try {
      await criarAtividadeTerapeutica({
        nome: form.nome.trim(),
        descricao: form.descricao?.trim() || null,
        duracao_minutos: form.duracao_minutos
          ? Number(form.duracao_minutos)
          : null,
        modulo_id: moduloId,
      });

      setMensagem("Atividade cadastrada com sucesso.");

      setTimeout(() => {
        navigate(
          `/atividades-terapeuticas${
            isCardio ? "?modulo=cardiometabolico" : ""
          }`
        );
      }, 900);
    } catch (e2) {
      setErro(
        e2?.response?.data?.detail ||
          e2?.message ||
          "Falha ao cadastrar atividade."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0 }}>Nova Atividade Terapêutica</h2>
            <div style={subtitleStyle}>
              Cadastro de atividade terapêutica
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={() =>
              navigate(
                `/atividades-terapeuticas${
                  isCardio ? "?modulo=cardiometabolico" : ""
                }`
              )
            }
            disabled={saving}
          >
            ← Voltar
          </Button>
        </div>

        {erro && <div style={erroStyle}>{erro}</div>}
        {mensagem && <div style={sucessoStyle}>{mensagem}</div>}

        <div style={cardStyle}>
          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Nome</label>
              <input
                placeholder="Ex.: Integração Sensorial"
                value={form.nome}
                onChange={(e) => setField("nome", e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Descrição</label>
              <textarea
                placeholder="Descrição da atividade"
                value={form.descricao}
                onChange={(e) => setField("descricao", e.target.value)}
                style={textareaStyle}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Duração em minutos</label>
              <input
                type="number"
                min="0"
                placeholder="Ex.: 60"
                value={form.duracao_minutos}
                onChange={(e) => setField("duracao_minutos", e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={actionsStyle}>
              <Button
                variant="secondary"
                type="button"
                onClick={() =>
                  navigate(
                    `/atividades-terapeuticas${
                      isCardio ? "?modulo=cardiometabolico" : ""
                    }`
                  )
                }
                disabled={saving}
              >
                Cancelar
              </Button>

              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar atividade"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 18,
};

const subtitleStyle = {
  fontSize: 14,
  color: "#6b7280",
  marginTop: 4,
};

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 24,
  background: "#fff",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 110,
  resize: "vertical",
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  color: "#374151",
};

const actionsStyle = {
  marginTop: 20,
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
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