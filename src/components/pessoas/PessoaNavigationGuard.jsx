import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker, useOutletContext } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Only voluntary navigation is guarded; invalidated sessions must still end.
export default function PessoaNavigationGuard({ dirty }) {
  const { user } = useAuth();
  const { registerLogoutGuard } = useOutletContext();
  const [logoutAction, setLogoutAction] = useState(null);
  const dialog = useRef(null);
  const continueButton = useRef(null);
  const requiresConfirmation = useCallback(() => user?.perfil === "ADMIN" &&
    Boolean(localStorage.getItem("access_token")) && dirty(), [user, dirty]);
  const blocker = useBlocker(requiresConfirmation);
  const open = blocker.state === "blocked" || Boolean(logoutAction);

  useEffect(() => registerLogoutGuard(action => {
    if (requiresConfirmation()) setLogoutAction(() => action);
    else action();
  }), [registerLogoutGuard, requiresConfirmation]);
  useEffect(() => {
    const unload = event => {
      if (requiresConfirmation()) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [requiresConfirmation]);
  useEffect(() => {
    const element = dialog.current;
    if (open && !element.open) { element.showModal(); continueButton.current?.focus(); }
    if (!open && element.open) element.close();
    return () => { if (element.open) element.close(); };
  }, [open]);
  function stay() {
    setLogoutAction(null);
    if (blocker.state === "blocked") blocker.reset();
  }
  function leave() {
    if (logoutAction) { setLogoutAction(null); logoutAction(); }
    else if (blocker.state === "blocked") blocker.proceed();
  }
  return <dialog ref={dialog} aria-labelledby="pessoa-discard-title" aria-describedby="pessoa-discard-description"
    style={{ maxWidth: "min(480px, 90vw)", border: "1px solid #dce4ed", borderRadius: 12, padding: 24 }}
    onCancel={event => { event.preventDefault(); stay(); }}>
    <h2 id="pessoa-discard-title">Descartar alterações não salvas?</h2>
    <p id="pessoa-discard-description">Os dados ainda não salvos desta Pessoa serão descartados se você sair.</p>
    <div className="pessoas-actions">
      <button ref={continueButton} type="button" onClick={stay}>Continuar editando</button>
      <button type="button" onClick={leave}>Descartar e sair</button>
    </div>
  </dialog>;
}
