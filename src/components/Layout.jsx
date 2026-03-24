import { Outlet, useNavigate, useLocation } from "react-router-dom";

function ItemMenu({ label, to, active, onClick }) {
  return (
    <button
      onClick={() => onClick(to)}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        background: active ? "#ecfdf5" : "white",
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
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
          background: "white",
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img
              src="/logo-monitra.png"
              alt="Monitra"
              style={{
                width: 150,
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
        </div>

        <hr style={{ margin: "18px 0" }} />

        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
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

          <button
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("clinica_id");
              navigate("/login");
            }}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #fecaca",
              background: "#fff1f2",
              color: "#b91c1c",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Sair
          </button>
        </div>
      </aside>

      <main style={{ padding: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}
