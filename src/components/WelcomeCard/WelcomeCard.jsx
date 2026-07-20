import "./welcome.css";

export default function WelcomeCard({
  nome = "Profissional",
  mensagem,
  destaque,
  children,
}) {
  return (
    <div className="welcome-card">

      <div className="welcome-header">

        <div className="welcome-icon">
          👋
        </div>

        <div>

          <h1>
            Bom dia, {nome}!
          </h1>

          <p className="welcome-message">
            {mensagem}
          </p>

          {destaque && (
            <div className="welcome-highlight">
              {destaque}
            </div>
          )}

        </div>

      </div>

      {children}

    </div>
  );
}