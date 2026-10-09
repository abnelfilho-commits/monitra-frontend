import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useInstitutionalNavigation from "../hooks/useInstitutionalNavigation";
import Button from "./ui/Button";
import "./AdministracaoLayout.css";

export default function AdministracaoLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const items = useInstitutionalNavigation();
  const isHml = import.meta.env.VITE_AMBIENTE === "HML";
  const legacy = pathname === "/usuarios" || pathname.startsWith("/profissionais");
  return <div className={`institutional-shell${isHml ? " institutional-shell--hml" : ""}`}>
    {isHml && <div className="institutional-shell-banner">AMBIENTE DE HOMOLOGAÇÃO — NÃO USAR COMO PRODUÇÃO</div>}
    <aside className="institutional-shell-sidebar" aria-label="Gestão Institucional">
      <div className="institutional-shell-brand"><img src="/logo-integracare.png" alt="Integra Care" /><div>Inteligência clínica em tempo real</div></div>
      <div className="institutional-shell-module"><strong>Gestão Institucional</strong><p>Administração e capacidades transversais da plataforma.</p></div>
      <nav aria-label="Navegação institucional" className="institutional-shell-navigation">
        <span className="institutional-shell-caption">GESTÃO</span>
        {items.map(item => <Link key={item.to} className="institutional-shell-item" to={item.to} aria-current={pathname === item.to.split("?")[0] || pathname.startsWith(item.to.split("?")[0] + "/") ? "page" : undefined}>{item.label}</Link>)}
      </nav>
      {user?.perfil === "ADMIN" && <p className="institutional-shell-note">Administração global. Este espaço não concede acesso clínico.</p>}
      <div className="institutional-shell-separator" />
      <Link className="institutional-shell-item" to="/plataforma">Voltar à Plataforma</Link>
      <div className="institutional-shell-separator" />
      <Button variant="danger" onClick={logout} style={{ width: "100%" }}>Sair</Button>
    </aside>
    <main className="institutional-shell-content">
      {pathname === "/gestao-institucional" && <section className="institutional-shell-intro"><h1>Gestão Institucional</h1><p>Escolha uma capacidade na navegação. Cada operação mantém suas próprias regras de acesso.</p><p>Linhas de cuidado são acessadas pela Plataforma. Nenhuma permissão clínica é concedida por entrar neste espaço.</p>{!items.length && <p>Nenhuma capacidade institucional disponível para esta conta.</p>}</section>}
      {legacy && <div className="institutional-shell-notice"><strong>Cadastro legado</strong> — esta página ainda utiliza Clínica e seus vínculos existentes. Não representa convergência para Instituição. {user?.perfil !== "PROFISSIONAL" && <Link to="/clinicas">Abrir Clínicas (legado)</Link>}</div>}
      {pathname === "/dimensionamento" && <div className="institutional-shell-notice">Dimensionamento transversal da demanda assistencial planejada por linha de cuidado.</div>}
      <Outlet />
    </main>
  </div>;
}
