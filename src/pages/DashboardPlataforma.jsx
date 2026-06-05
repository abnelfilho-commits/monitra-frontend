import { useNavigate } from "react-router-dom";
import "./DashboardPlataforma.css";

export default function DashboardPlataforma() {
  const navigate = useNavigate();

  return (
    <div className="plataforma-page">
      <div className="plataforma-container">

        <div className="plataforma-header">
          <img
            src="/logo-monitra.png"
            alt="Monitra"
            className="plataforma-logo"
          />

          <div>
            <h1 className="plataforma-title">
              Plataforma Inteligente de Monitoramento Clínico Longitudinal
            </h1>
          </div>
        </div>

        <div className="modulos-grid">

          {/* Neuro */}
          <div className="modulo-card">
            <div className="modulo-label blue">
              Neurodesenvolvimento
            </div>

            <h2 className="modulo-title">
              TEA • TDAH • Neuro
            </h2>

            <p className="modulo-description">
              Monitoramento longitudinal de evolução clínica,
              comportamento, e indicadores neurofuncionais.
            </p>

            <button
              className="modulo-button blue"
              onClick={() => navigate("/dashboard")}
            >
              Acessar módulo Neuro
            </button>
          </div>

          {/* Cardiometabólico */}
          <div className="modulo-card">
            <div className="modulo-label green">
              Cardiometabólico
            </div>

            <h2 className="modulo-title">
              Diabetes • Hipertensão • Obesidade
            </h2>

            <p className="modulo-description">
              Monitoramento longitudinal de diabetes, hipertensão,
              obesidade e fatores de risco cardiometabólicos.             
            </p>

            <button
              className="modulo-button green"
              onClick={() =>
                navigate("/cardiometabolico")
              }
            >
              Acessar módulo Cardiometabólico
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
