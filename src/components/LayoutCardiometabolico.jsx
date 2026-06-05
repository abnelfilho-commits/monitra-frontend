import "../styles/cardiometabolico.css";

import { NavLink, Outlet, useNavigate } from "react-router-dom";

export default function LayoutCardiometabolico() {
  const navigate = useNavigate();

  return (
    <div className="cardio-layout">

      {/* Sidebar */}
      <aside className="cardio-sidebar">

        <img
          src="/logo-monitra.png"
          alt="Monitra"
          className="cardio-logo"
        />

        <p className="cardio-module-label">
          Módulo Cardiometabólico
        </p>

        <h1 className="cardio-module-title">
          Diabetes • Hipertensão • Obesidade
        </h1>

        <nav className="cardio-nav">

          <NavLink
            to="/cardiometabolico/pacientes"
            className="px-4 py-3 rounded-xl hover:bg-emerald-50 font-medium text-slate-700"
          >
            Pacientes
          </NavLink>

          <NavLink
            to="/cardiometabolico"
            className="px-4 py-3 rounded-xl hover:bg-emerald-50 font-medium text-slate-700"
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/cardiometabolico/alertas"
            className="px-4 py-3 rounded-xl hover:bg-emerald-50 font-medium text-slate-700"
          >
            Alertas
          </NavLink>

        </nav>

        <button
          onClick={() => navigate("/plataforma")}
          className="mt-auto bg-slate-200 hover:bg-slate-300 rounded-xl py-3 font-semibold"
        >
          Trocar módulo
        </button>

      </aside>

      {/* Conteúdo */}
      <main className="cardio-main">
        <Outlet />
      </main>

    </div>
  );
}
