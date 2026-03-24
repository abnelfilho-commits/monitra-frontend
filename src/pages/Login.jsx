import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      await login(email, senha);
      navigate("/dashboard");
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Falha ao realizar login.";
      setErro(String(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #f7faf9 0%, #eef6f2 100%)",
        padding: 20,
      }}
    >
      <div
        style={{
          width: 380,
          background: "white",
          padding: 32,
          borderRadius: 14,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            src="/logo-monitra.png"
            alt="Monitra"
            style={{
              width: 170,
              height: "auto",
              marginBottom: 10,
              objectFit: "contain",
            }}
          />
          <p style={{ marginTop: 0, fontSize: 14, color: "#6b7280" }}>
            Inteligência clínica em tempo real
          </p>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                marginTop: 6,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                marginTop: 6,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ textAlign: "right", marginBottom: 18, fontSize: 13 }}>
            <a
              href="#"
              style={{
                color: "#0f8f5b",
                textDecoration: "none",
              }}
            >
              Esqueceu a senha?
            </a>
          </div>

          {erro && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                padding: 10,
                borderRadius: 8,
                marginBottom: 12,
                color: "#991b1b",
                fontSize: 14,
              }}
            >
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 12,
              background: "#0f8f5b",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 15,
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div
          style={{
            textAlign: "center",
            marginTop: 18,
            fontSize: 13,
            color: "#6b7280",
          }}
        >
          Plataforma clínica Monitra
        </div>
      </div>
    </div>
  );
}
