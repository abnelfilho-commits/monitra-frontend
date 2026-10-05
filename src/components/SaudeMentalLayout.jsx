import { Link, Outlet, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "./ui/Button";

// Shell da vertical existente, não um contrato de espaços ou de permissões.
export default function SaudeMentalLayout() {
  const { user, logout } = useAuth();
  const [search] = useSearchParams();
  const institution = search.get("instituicao_id");
  const people = institution
    ? `/saude-mental?instituicao_id=${encodeURIComponent(institution)}`
    : "/saude-mental";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {import.meta.env.VITE_AMBIENTE === "HML" && (
        <div style={{ background: "#f97316", color: "white", textAlign: "center", padding: 6 }}>
          AMBIENTE DE HOMOLOGAÇÃO — NÃO USAR COMO PRODUÇÃO
        </div>
      )}
      <header style={{ background: "white", borderBottom: "1px solid #e5e7eb", padding: "16px 24px" }}>
        <strong>Integra Care · Saúde Mental</strong>
        <p>Jornada assistencial · acesso sujeito à autorização contextual.</p>
        {user?.perfil === "ADMIN" && <p>Conta de administração global. Este perfil não concede acesso clínico.</p>}
        <nav aria-label="Navegação Saúde Mental" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
          <Link to="/plataforma">Voltar à Plataforma</Link>
          <Link to={people}>Pessoas e contextos autorizados</Link>
          <Button variant="secondary" onClick={logout}>Sair</Button>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
