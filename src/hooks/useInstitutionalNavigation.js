import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
  const items = [];
  const cardio = new URLSearchParams(search).get("modulo") === "cardiometabolico" ? "?modulo=cardiometabolico" : "";
  if (profile === "ADMIN") items.push(
    { label: "Instituições", to: "/admin/instituicoes" },
    { label: "Pessoas", to: "/admin/pessoas" },
    { label: "Usuários / Acessos", to: "/usuarios" },
  );
  // Preserve the legacy menu predicate; this does not confer endpoint access.
  if (user && profile !== "PROFISSIONAL") items.push({ label: "Profissionais", to: `/profissionais${cardio}` });
  if (profile === "ADMIN" || (operational?.id === id && operational?.profile === profile && operational.allowed)) {
    items.push({ label: "Operação Assistencial", to: "/operacao-assistencial" });
  }
  if (user && profile !== "PROFISSIONAL") items.push({ label: "Dimensionamento", to: `/dimensionamento${cardio}` });
  if (["ADMIN", "ADMIN_CLINICA"].includes(profile)) items.push({ label: "Financeiro Institucional", to: "/financeiro/institucional" });
  return items;
}
