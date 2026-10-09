import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageLayout from "../components/layouts/PageLayout";
import PageHeader from "../components/ui/PageHeader";
import CardWidget from "../components/ui/CardWidget";

export default function AdministracaoEconomica() {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Carregando...</p>;
  if (user?.perfil !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return <PageLayout>
    <PageHeader title="Administração Econômica" description="Configuração econômica da plataforma. Projeções e análises permanecem no Financeiro Institucional." />
    <CardWidget title="Serviços Econômicos"><p>Catálogo global de serviços que podem ser precificados em diferentes tabelas.</p><Link to="/admin/economia/servicos">Administrar Serviços Econômicos</Link></CardWidget>
    {["Tabelas de Preços", "Contratos", "Mapeamentos Econômicos"].map(title => <CardWidget key={title} title={title}><p>Disponível em uma próxima etapa.</p></CardWidget>)}
  </PageLayout>;
}
