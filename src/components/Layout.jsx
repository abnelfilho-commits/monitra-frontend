import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Button from "../components/ui/Button";

function ItemMenu({ label, to, active, onClick }) {
  return (
    <button
      onClick={() => onClick(to)}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: 10,
        border: active ? "1px solid #bbf7d0" : "1px solid #e5e7eb",
        background: active ? "#ecfdf5" : "#fff",
        fontWeight: active ? 700 : 500,
        color: "#111827",
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "#f9fafb";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "#fff";
      }}
    >
      {label}
    </button>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  function go(to) {
    navigate(to);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("clinica_id");
    navigate("/login");
  }

  const pathname = location.pathname;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        minHeight: "100vh",
        background: "#f8fafc",
      }}
    >
      <aside
        style={{
          borderRight: "1px solid #e5e7eb",
          padding: 16,
          background: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <img
                src="/logo-monitra.png"
                alt="Monitra"
                style={{
                  width: 140,
                  height: "auto",
                  objectFit: "contain",
                }}
              />
            </div>

            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginTop: 8,
                textAlign: "center",
              }}
            >
              Inteligência clínica em tempo real
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <ItemMenu
              label="Dashboard"
              to="/dashboard"
              active={pathname === "/dashboard"}
              onClick={go}
            />

            <ItemMenu
              label="Clínicas"
              to="/clinicas"
              active={pathname.startsWith("/clinicas")}
              onClick={go}
            />

            <ItemMenu
              label="Profissionais"
              to="/profissionais"
              active={pathname.startsWith("/profissionais")}
              onClick={go}
            />

            <ItemMenu
              label="Pacientes"
              to="/pacientes"
              active={pathname.startsWith("/pacientes")}
              onClick={go}
            />

            <ItemMenu
              label="Responsáveis"
              to="/responsaveis"
              active={pathname.startsWith("/responsaveis")}
              onClick={go}
            />
          </div>

          <div
            style={{
              height: 1,
              background: "#e5e7eb",
            }}
          />

          <div>
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Ações rápidas
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ItemMenu
                label="+ Nova Clínica"
                to="/clinicas/nova"
                active={pathname === "/clinicas/nova"}
                onClick={go}
              />

              <ItemMenu
                label="+ Novo Profissional"
                to="/profissionais/novo"
                active={pathname === "/profissionais/novo"}
                onClick={go}
              />

              <ItemMenu
                label="+ Novo Paciente"
                to="/pacientes/novo"
                active={pathname === "/pacientes/novo"}
                onClick={go}
              />
            </div>
          </div>

          <div
            style={{
              height: 1,
              background: "#e5e7eb",
            }}
          />

          <div>
            <Button
              variant="danger"
              onClick={logout}
              style={{ width: "100%" }}
            >
              Sair
            </Button>
          </div>
        </div>
      </aside>

      <main
        style={{
          padding: 0,
          overflow: "auto",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
