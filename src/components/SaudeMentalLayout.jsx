import { Link, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "./ui/Button";
import "./SaudeMentalLayout.css";

// Navegação visual somente: a autorização contextual permanece no backend.
export default function SaudeMentalLayout() {
  const { user, logout } = useAuth();
  const [search] = useSearchParams();
  const location = useLocation();
  const institution = search.get("instituicao_id");
  const overview = institution
    ? `/saude-mental?instituicao_id=${encodeURIComponent(institution)}`
    : "/saude-mental";
  const peopleActive = location.pathname.startsWith("/saude-mental/pessoas/") || location.hash === "#pessoas";
  const isHml = import.meta.env.VITE_AMBIENTE === "HML";

  return (
    <div className={`mental-shell${isHml ? " mental-shell--hml" : ""}`}>
      {isHml && <div className="mental-shell-banner">AMBIENTE DE HOMOLOGAÇÃO — NÃO USAR COMO PRODUÇÃO</div>}
      <aside className="mental-shell-sidebar" aria-label="Saúde Mental">
        <div className="mental-shell-brand">
          <img src="/logo-integracare.png" alt="Integra Care" />
          <div>Inteligência clínica em tempo real</div>
        </div>
        <div className="mental-shell-module">
          <strong>Saúde Mental</strong>
          <p>Jornada assistencial · acesso sujeito à autorização contextual.</p>
        </div>
        <nav aria-label="Navegação Saúde Mental" className="mental-shell-navigation">
          <Link className="mental-shell-item" to={overview} aria-current={!peopleActive ? "page" : undefined}>Visão Geral</Link>
          <Link className="mental-shell-item" to={`${overview}#pessoas`} aria-current={peopleActive ? "page" : undefined}>Pessoas</Link>
          <Link className="mental-shell-item" to="/plataforma">Voltar à Plataforma</Link>
        </nav>
        {user?.perfil === "ADMIN" && <p className="mental-shell-admin">Conta de administração global. Este perfil não concede acesso clínico.</p>}
        <div className="mental-shell-separator" />
        <Button variant="danger" onClick={logout} style={{ width: "100%" }}>Sair</Button>
      </aside>
      <div className="mental-shell-content"><Outlet /></div>
    </div>
  );
}
