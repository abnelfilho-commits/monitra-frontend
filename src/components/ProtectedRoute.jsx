export default function ProtectedRoute({ children }) {
  const usuario = localStorage.getItem("usuario");

  if (!usuario) {
    window.location.href = "/";
    return null;
  }

  return children;
}

