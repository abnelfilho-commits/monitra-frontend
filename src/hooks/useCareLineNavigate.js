import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function authorizedLine(value, modules) {
  const id = ({ NEURO: "1", CARDIO: "2" })[value] || value;
  return id && modules?.some(module => String(module.id) === id) ? id : null;
}

// URL context only; backend authorization remains authoritative.
export function withCareLine(target, line, modules) {
  if (typeof target !== "string" || !target.startsWith("/") || target.startsWith("//")) return target;
  const url = new URL(target, "http://navigation.local");
  if (!/^\/(dashboard|pacientes|cardiometabolico|avaliacoes|diagnosticos|sessoes-assistenciais|agenda-assistencial|pts|prontuario|intervencoes)(\/|$)/.test(url.pathname)) return target;
  const explicit = url.searchParams.getAll("care_line");
  if (explicit.length) {
    // An invalid explicit choice is removed, never replaced with another line.
    if (explicit.length !== 1 || !authorizedLine(explicit[0], modules)) url.searchParams.delete("care_line");
  } else if (authorizedLine(line, modules)) {
    url.searchParams.set("care_line", line);
  }
  return url.pathname + url.search + url.hash;
}

export default function useCareLineNavigate() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { user } = useAuth();
  const requested = new URLSearchParams(search).getAll("care_line");
  const line = requested.length === 1 ? authorizedLine(requested[0], user?.modulos) : null;
  return useCallback((to, options) => {
    if (user?.perfil !== "PROFISSIONAL") return navigate(to, options);
    const state = options?.state;
    const nextOptions = state?.returnTo ? { ...options, state: { ...state, returnTo: withCareLine(state.returnTo, line, user.modulos) } } : options;
    return navigate(withCareLine(to, line, user.modulos), nextOptions);
  }, [navigate, line, user]);
}
