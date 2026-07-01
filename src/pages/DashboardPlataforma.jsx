import { useEffect, useState } from "react";
import { meRequest } from "../services/auth";// ajuste o caminho conforme seu projeto

import { useNavigate } from "react-router-dom";
import "./DashboardPlataforma.css";

export default function DashboardPlataforma() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);

  const temNeuro =
    usuario?.modulos?.some(
      (m) => m.slug === "neurodesenvolvimento"
    ) ?? false;

  const temCardio =
    usuario?.modulos?.some(
      (m) => m.slug === "cardiometabolico"
    ) ?? false;

  useEffect(() => {
    async function carregarUsuario() {
      try {
        const me = await meRequest();
        setUsuario(me);
      } catch (err) {
        console.error(err);
      }
    }

    carregarUsuario();
  }, []);
  return (
    <div className="plataforma-page">
      <div className="plataforma-container">

        <div className="plataforma-header">
          <img
            src="/logo-integracare.png"
            alt="Integra Care"
            style={{
              width: 300,
              height: "auto",
              objectFit: "contain"
            }}
            
          />

          <div>
            <h1 className="plataforma-title">
              Inteligência clínica e gestão integrada do cuidado
            </h1>
          </div>
        </div>

        <div className="modulos-grid">

          {/* Neuro */}
          {temNeuro && (
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
          )}
          {/* Cardiometabólico */}
          {temCardio && (
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
          )}
        </div>
      </div>
    </div>
  );
}
