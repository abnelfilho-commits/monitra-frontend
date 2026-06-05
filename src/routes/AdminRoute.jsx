import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  const permitido =
    user?.perfil === "ADMIN" ||
    user?.perfil === "ADMIN_CLINICA";

  return permitido
    ? <Outlet />
    : <Navigate to="/dashboard" replace />;
}