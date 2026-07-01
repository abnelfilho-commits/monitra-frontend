import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";

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

  const ambiente = import.meta.env.VITE_AMBIENTE;
  const isHml = ambiente === "HML";

  function go(to) {
    navigate(to);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("clinica_id");
    localStorage.removeItem("perfil");
    navigate("/login");
  }

  const pathname = location.pathname;
  const searchParams = new URLSearchParams(location.search);

  const isCardio =
    pathname.startsWith("/cardiometabolico") ||
    searchParams.get("modulo") === "cardiometabolico";

  const moduloQuery = isCardio ? "?modulo=cardiometabolico" : "";

  const perfil = localStorage.getItem("perfil");
  const { user } = useAuth();

  const isAdmin =
    user?.perfil === "ADMIN_CLINICA";
  const isSuporte = user?.perfil === "SUPORTE";
  const isAdminGlobal = user?.perfil === "ADMIN";

  const isProfissional = user?.perfil === "PROFISSIONAL";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        minHeight: "100vh",
        background: "#f8fafc",
        paddingTop: isHml ? 30 : 0,
      }}
    >

      {isHml && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: "#f97316",
            color: "white",
            textAlign: "center",
            fontWeight: 800,
            fontSize: 13,
            padding: "6px 10px",
            letterSpacing: 1,
          }}
        >
          AMBIENTE DE HOMOLOGAÇÃO — NÃO USAR COMO PRODUÇÃO
        </div>
      )}

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
                src="/logo-integracare.png"
                alt="Integra Care"
                style={{
                  width: 260,
                  height: "auto",
                  objectFit: "contain",
                }}
              />
            </div>

            <div
              style={{
                fontSize: 12,
                color: "#000001",
                marginTop: 8,
                textAlign: "center",
              }}
            >
              Inteligência clínica em tempo real
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {isCardio ? (
              <>
                <ItemMenu
                  label="Dashboard Cardio"
                  to="/cardiometabolico"
                  active={pathname === "/cardiometabolico"}
                  onClick={go}
                />

                <ItemMenu
                  label="Pacientes"
                  to="/cardiometabolico/pacientes"
                  active={pathname.startsWith("/cardiometabolico/pacientes")}
                  onClick={go}
                />
              </>
            ) : (
              <>
                <ItemMenu
                  label="Dashboard Neuro"
                  to="/dashboard"
                  active={pathname === "/dashboard"}
                  onClick={go}
                />

                <ItemMenu
                  label="Pacientes"
                  to="/pacientes"
                  active={pathname.startsWith("/pacientes")}
                  onClick={go}
                />
              </>
            )}

            {isAdminGlobal && (
              <ItemMenu
                label="Usuários"
                to={`/usuarios${moduloQuery}`}
                active={pathname.startsWith("/usuarios")}
                onClick={go}
              />
            )}

            {!isProfissional && (
              <ItemMenu
                label="Clínicas"
                to={`/clinicas${moduloQuery}`}
                active={pathname.startsWith("/clinicas")}
                onClick={go}
              />
            )}

            {!isProfissional && (
              <ItemMenu
                label="Profissionais"
                to={`/profissionais${moduloQuery}`}
                active={pathname.startsWith("/profissionais")}
                onClick={go}
              />
            )}

            {!isProfissional && (
              <ItemMenu
                label="Atividades Terapêuticas"
                to={`/atividades-terapeuticas${moduloQuery}`}
                active={pathname.startsWith("/atividades-terapeuticas")}
                onClick={go}
              />
            )}

            <ItemMenu
              label="Responsáveis"
              to={`/responsaveis${moduloQuery}`}
              active={pathname.startsWith("/responsaveis")}
              onClick={go}
            />

            {!isProfissional && (
              <ItemMenu
                label="Dimensionamento"
                to={`/dimensionamento${moduloQuery}`}
                active={pathname.startsWith("/dimensionamento")}
                onClick={go}
              />
            )}

          </div>

          <div
            style={{
              height: 1,
              background: "#e5e7eb",
            }}
          />

          {isAdminGlobal && (
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
                    to={`/clinicas/nova${moduloQuery}`}
                    active={pathname === "/clinicas/nova"}
                    onClick={go}
                  />

                  <ItemMenu
                    label="+ Novo Profissional"
                    to={`/profissionais/novo${moduloQuery}`}
                    active={pathname === "/profissionais/novo"}
                    onClick={go}
                  />

                  <ItemMenu
                    label="+ Novo Paciente"
                    to={isCardio ? "/pacientes/novo?modulo=cardiometabolico" : "/pacientes/novo"}
                    active={pathname === "/pacientes/novo"}
                    onClick={go}
                  />
                </div>
              </div>
          )}
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
