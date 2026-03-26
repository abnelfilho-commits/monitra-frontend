import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listarProfissionais,
  inativarProfissional,
} from "../services/profissionais";

export default function Profissionais() {
  const navigate = useNavigate();

  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  async function load() {
    setErro("");
    setLoading(true);

    try {
      const data = await listarProfissionais();
      setProfissionais(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Falha ao carregar profissionais.";
      setErro(String(msg));
    } finally {
      setLoading(false);
    }
  }

  async function onInativar(profissional) {
    const ok = window.confirm(
      `Deseja realmente inativar o profissional "${profissional.nome}"?`
    );
    if (!ok) return;

    try {
      await inativarProfissional(profissional.id);
      await load();
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Falha ao inativar profissional.";
      setErro(String(msg));
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => navigate("/dashboard")}>← Voltar</button>
            <h2 style={{ margin: 0 }}>Profissionais</h2>
          </div>

          <p style={{ marginTop: 6, color: "#4b5563" }}>
            Gestão da equipe clínica vinculada às clínicas.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => navigate("/profissionais/novo")}>
            + Novo Profissional
          </button>
          <button onClick={load}>↻ Atualizar</button>
        </div>
      </div>

      {loading && <p style={{ marginTop: 16 }}>Carregando profissionais...</p>}

      {erro && <p style={{ color: "red", marginTop: 16 }}>{erro}</p>}

      {!loading && !erro && profissionais.length === 0 && (
        <p style={{ marginTop: 16 }}>Nenhum profissional cadastrado.</p>
      )}

      {!loading && !erro && profissionais.length > 0 && (
        <div
          style={{
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 14,
          }}
        >
          {profissionais.map((prof) => (
            <div
              key={prof.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 16,
                background: "white",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 800 }}>{prof.nome}</div>

              <div style={{ marginTop: 10, fontSize: 14, color: "#4b5563" }}>
                <div><b>Especialidade:</b> {prof.especialidade || "-"}</div>
                <div style={{ marginTop: 4 }}><b>Email:</b> {prof.email || "-"}</div>
                <div style={{ marginTop: 4 }}>
                  <b>Clínica:</b> {prof.clinica_nome || prof.clinica_id || "-"}
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button onClick={() => navigate(`/profissionais/${prof.id}/editar`)}>
                  Editar
                </button>

                <button
                  onClick={() => onInativar(prof)}
                  style={{
                    background: "#fff5f5",
                    border: "1px solid #e0b4b4",
                    color: "#a33",
                  }}
                >
                  Inativar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
