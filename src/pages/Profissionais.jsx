import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listarProfissionais,
  inativarProfissional,
} from "../services/profissionais";
import Button from "../components/ui/Button";

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
    <div
      style={{
        padding: 24,
        maxWidth: 1220,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "flex-start",
          marginBottom: 8,
        }}
      >
        <div style={{ flex: "1 1 320px", minWidth: 280 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Button variant="secondary" onClick={() => navigate("/dashboard")}>
              ← Voltar
            </Button>

            <div>
              <h2 style={{ margin: 0 }}>Profissionais</h2>
              <p style={{ marginTop: 4, color: "#4b5563" }}>
                Gestão da equipe clínica vinculada às clínicas.
              </p>
            </div>
          </div>
        </div>

        <div style={{ flex: "1 1 320px", minWidth: 260 }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <Button onClick={() => navigate("/profissionais/novo")}>
              + Novo Profissional
            </Button>

            <Button variant="secondary" onClick={load} disabled={loading}>
              ↻ Atualizar
            </Button>
          </div>
        </div>
      </div>

      {loading && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            color: "#475467",
          }}
        >
          Carregando profissionais...
        </div>
      )}

      {erro && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #fecaca",
            padding: 14,
            borderRadius: 12,
            marginTop: 16,
            color: "#991b1b",
          }}
        >
          <div>{erro}</div>

          <div style={{ marginTop: 10 }}>
            <Button variant="secondary" onClick={load}>
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {!loading && !erro && profissionais.length === 0 && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            color: "#475467",
          }}
        >
          Nenhum profissional cadastrado.
        </div>
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
                background: "#fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
                {prof.nome}
              </div>

              <div style={{ marginTop: 10, fontSize: 14, color: "#4b5563" }}>
                <div>
                  <b>Especialidade:</b> {prof.especialidade || "-"}
                </div>
                <div style={{ marginTop: 4 }}>
                  <b>Email:</b> {prof.email || "-"}
                </div>
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
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/profissionais/${prof.id}/editar`)}
                >
                  Editar
                </Button>

                <Button
                  variant="danger"
                  onClick={() => onInativar(prof)}
                >
                  Inativar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
