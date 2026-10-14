import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { cockpitGestaoMental, MANAGEMENT_DENIED, MANAGEMENT_AVAILABLE } from "../services/cockpitGestaoMental";
import { instituicoesOperacionais } from "../services/operacaoAssistencial";

// Discovery only. Existing page guards and backend contracts remain authoritative.
export default function useInstitutionalNavigation() {
  const { user } = useAuth();
  const { search } = useLocation();
  const [operational, setOperational] = useState(null);
  const id = user?.id;
  const profile = user?.perfil;
  useEffect(() => {
    let current = true;
    if (id && profile !== "ADMIN") {
      instituicoesOperacionais().then(rows => {
        if (current) setOperational({ id, profile, allowed: Array.isArray(rows) && rows.length > 0 });
      }).catch(() => {
        if (current) setOperational({ id, profile, allowed: false });
      });
    }
    return () => { current = false; };
  }, [id, profile]);
  const [management, setManagement] = useState(null);
  useEffect(() => {
    if (!id) return;
    let current = true;
    const controller = new AbortController();
    const denied = () => {
      current = false; controller.abort();
      setManagement({ id, profile, status: "denied" });
    };
    const available = () => setManagement({ id, profile, status: "allowed" });
    window.addEventListener(MANAGEMENT_AVAILABLE, available);
    window.addEventListener(MANAGEMENT_DENIED, denied);
    cockpitGestaoMental(4, null, controller.signal).then(() => {
      if (current) setManagement({ id, profile, status: "allowed" });
    }).catch(error => {
      if (current) setManagement({ id, profile, status: [401, 403].includes(error?.response?.status) ? "denied" : "error" });
    });
    return () => { current = false; controller.abort(); window.removeEventListener(MANAGEMENT_DENIED, denied); window.removeEventListener(MANAGEMENT_AVAILABLE, available); };
  }, [id, profile]);
  const items = [];
  const cardio = new URLSearchParams(search).get("modulo") === "cardiometabolico" ? "?modulo=cardiometabolico" : "";
  if (profile === "ADMIN") items.push(
    { label: "Administração Econômica", to: "/admin/economia" },
    { label: "Instituições", to: "/admin/instituicoes" },
    { label: "Pessoas", to: "/admin/pessoas" },
    { label: "Usuários / Acessos", to: "/usuarios" },
  );
  if (["ADMIN", "ADMINISTRADOR", "ADMIN_CLINICA", "SUPORTE"].includes(profile)) items.push({ label: "Atividades Terapêuticas", to: "/atividades-terapeuticas" });
  // Preserve the legacy menu predicate; this does not confer endpoint access.
  if (user && profile !== "PROFISSIONAL") items.push({ label: "Profissionais", to: `/profissionais${cardio}` });
  if (profile === "ADMIN" || (operational?.id === id && operational?.profile === profile && operational.allowed)) {
    items.push({ label: "Operação Assistencial", to: "/operacao-assistencial" });
  }
  if (user && profile !== "PROFISSIONAL") items.push({ label: "Dimensionamento", to: `/dimensionamento${cardio}` });
  if (["ADMIN", "ADMIN_CLINICA"].includes(profile)) items.push({ label: "Financeiro Institucional", to: "/financeiro/institucional" });
  if (management?.id === id && management?.profile === profile && management.status !== "denied") {
    items.push({ label: management.status === "allowed" ? "Cockpit Gestor/RH — Saúde Mental" : "Cockpit Gestor/RH — Saúde Mental (verificar acesso)", to: "/saude-mental/gestao" });
  }
  return items;
}
