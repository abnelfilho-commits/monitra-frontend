import { useEffect, useState } from "react";
import { meRequest } from "../services/auth";// ajuste o caminho conforme seu projeto

import { useNavigate } from "react-router-dom";
import "./DashboardPlataforma.css";
import useInstitutionalNavigation from "../hooks/useInstitutionalNavigation";

export default function DashboardPlataforma() {
  const navigate = useNavigate();
  const institutionalItems = useInstitutionalNavigation();
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

        <h2 className="plataforma-section-title">Linhas de cuidado</h2>
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
                onClick={() => navigate("/dashboard?care_line=1")}
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
          {/* Saúde Mental */}
          <div className="modulo-card">
            <div className="modulo-label blue">Saúde Mental</div>
            <h2 className="modulo-title">
              Saúde mental no contexto do trabalho
            </h2>
            <p className="modulo-description">
              Acompanhamento longitudinal de bem-estar e jornada assistencial
              em contexto institucional.
            </p>
            <button
              className="modulo-button blue"
              onClick={() => navigate("/saude-mental")}
            >
              Acessar módulo Saúde Mental
            </button>
          </div>
        </div>
        {institutionalItems.length > 0 && <section className="plataforma-gestao" aria-labelledby="gestao-title">
          <h2 id="gestao-title" className="plataforma-section-title">Gestão</h2>
          <div className="gestao-card"><h3>Gestão Institucional / Administração</h3><p>Cadastros, operação contextual e capacidades transversais. Não é uma linha de cuidado e não concede acesso clínico.</p><button className="modulo-button blue" onClick={() => navigate("/gestao-institucional")}>Acessar Gestão Institucional</button></div>
        </section>}
      </div>
    </div>
  );
}
