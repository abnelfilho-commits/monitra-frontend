import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import DashboardAdmin from "./DashboardAdmin";
import DashboardClinica from "./DashboardClinica";
import DashboardProfissional from "./DashboardProfissional";

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.perfil) {
    case "ADMIN":
    case "SUPORTE":
      return <DashboardAdmin />;

    case "ADMIN_CLINICA":
      return <DashboardClinica />;

    case "PROFISSIONAL":
      return <DashboardProfissional />;

    default:
      return <Navigate to="/login" replace />;
  }
}