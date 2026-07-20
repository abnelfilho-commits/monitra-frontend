import ScrollManager from "./components/navigation/ScrollManager";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";

import ProtectedRoute from "./routes/ProtectedRoute";

import Layout from "./components/Layout";

import Usuarios from "./pages/Usuarios";

/* Plataforma */
import DashboardPlataforma from "./pages/DashboardPlataforma";

/* Neuro */
import Dashboard from "./pages/dashboard/Dashboard";
import Pacientes from "./pages/Pacientes";
import NovoPaciente from "./pages/NovoPaciente";
import Paciente from "./pages/Paciente";
import NovaIntervencao from "./pages/NovaIntervencao";
import NovoRegistroDiario from "./pages/NovoRegistroDiario";
import EditarPaciente from "./pages/EditarPaciente";
import EditarRegistroDiario from "./pages/EditarRegistroDiario";
import EditarIntervencao from "./pages/EditarIntervencao";

import Profissionais from "./pages/Profissionais";
import NovoProfissional from "./pages/NovoProfissional";
import EditarProfissional from "./pages/EditarProfissional";

import Clinicas from "./pages/Clinicas";
import NovaClinica from "./pages/NovaClinica";
import EditarClinica from "./pages/EditarClinica";
import ClinicaDetalhe from "./pages/ClinicaDetalhe";
import MapaRiscoClinica from "./pages/MapaRiscoClinica";

import Responsaveis from "./pages/Responsaveis";

import ProntuarioLongitudinal from "./pages/ProntuarioLongitudinal";

/* PTS */
import PTS from "./pages/PTS";
import AtividadesTerapeuticas from "./pages/AtividadesTerapeuticas";
import NovaAtividadeTerapeutica from "./pages/NovaAtividadeTerapeutica";
import NovaOcupacaoProfissional from "./pages/NovaOcupacaoProfissional";
import DimensionamentoEquipe from "./pages/DimensionamentoEquipe";

/* Login */
import Login from "./pages/Login";

/* Cardiometabólico */
import PacientesCardiometabolico from "./pages/cardiometabolico/PacientesCardiometabolico";
import PacienteCardiometabolico from "./pages/cardiometabolico/PacienteCardiometabolico";
import DashboardCardiometabolico from "./pages/cardiometabolico/DashboardCardiometabolico";
import RegistroDiarioCardiometabolico
from "./pages/cardiometabolico/RegistroDiarioCardiometabolico";
import MapaRiscoCardiometabolico
from "./pages/cardiometabolico/MapaRiscoCardiometabolico";
import IntervencaoCardiometabolica
from "./pages/cardiometabolico/IntervencaoCardiometabolica";

import AssessmentPage from "./pages/assessments/AssessmentPage";
import ExecutarSessaoAssistencial from "./pages/ExecutarSessaoAssistencial";
import SessaoAssistencial from "./pages/SessaoAssistencial";
import DiagnosticoDetalhe from "./pages/DiagnosticoDetalhe";
import RegistrarDiagnostico from "./pages/RegistrarDiagnostico";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollManager />
        <Routes>

          {/* Públicas */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* Protegidas */}
          <Route element={<ProtectedRoute />}>

            {/* Plataforma */}
            <Route
              path="/plataforma"
              element={<DashboardPlataforma />}
            />

            {/* Neuro */}
            <Route element={<Layout />}>

              <Route path="/dashboard" element={<Dashboard />} />

              <Route path="/pacientes" element={<Pacientes />} />
              <Route path="/pacientes/novo" element={<NovoPaciente />} />
              <Route path="/pacientes/:id" element={<Paciente />} />

              <Route
                path="/pacientes/:id/intervencao/nova"
                element={<NovaIntervencao />}
              />

              <Route
                path="/pacientes/:id/registro/novo"
                element={<NovoRegistroDiario />}
              />

              <Route
                path="/pacientes/:id/editar"
                element={<EditarPaciente />}
              />

              <Route
                path="/pacientes/:id/registros/:registroId/editar"
                element={<EditarRegistroDiario />}
              />

              <Route
                path="/pacientes/:id/intervencoes/:intervencaoId/editar"
                element={<EditarIntervencao />}
              />

              <Route path="/profissionais" element={<Profissionais />} />
              <Route path="/profissionais/novo" element={<NovoProfissional />} />

              <Route
                path="/profissionais/:id/editar"
                element={<EditarProfissional />}
              />

              <Route path="/clinicas" element={<Clinicas />} />
              <Route path="/clinicas/nova" element={<NovaClinica />} />

              <Route
                path="/clinicas/:id/editar"
                element={<EditarClinica />}
              />

              <Route
                path="/clinicas/:id"
                element={<ClinicaDetalhe />}
              />

              <Route
                path="/clinicas/:id/mapa-risco"
                element={<MapaRiscoClinica />}
              />

              <Route
                path="/responsaveis"
                element={<Responsaveis />}
              />

              <Route
                path="/usuarios"
                element={<Usuarios />}
              />

              <Route 
                path="/pacientes/:id/pts" 
                element={<PTS />}
              />

              <Route
                path="/atividades-terapeuticas"
                element={<AtividadesTerapeuticas />}
              />

              <Route
                path="/atividades-terapeuticas/nova"
                element={<NovaAtividadeTerapeutica />}
              />

              <Route
                path="/ocupacoes-profissionais/nova"
                element={<NovaOcupacaoProfissional />}
              />

              <Route
                path="/dimensionamento"
                element={<DimensionamentoEquipe />}
              />
              <Route
                path="/prontuario/evento/:tipo/:id"
                element={<ProntuarioLongitudinal />}
              />
              <Route
                path="/sessoes-assistenciais/:sessaoId"
                element={<SessaoAssistencial />}
              />

              <Route
                path="/sessoes-assistenciais/:sessaoId/executar"
                element={<ExecutarSessaoAssistencial />}
              />
              <Route
                path="/diagnosticos/:diagnosticoId"
                element={<DiagnosticoDetalhe />}
              />
              <Route
                path="/pacientes/:pacienteId/diagnosticos/novo"
                element={<RegistrarDiagnostico />}
              />
            </Route>

            {/* Cardiometabólico */}
            <Route element={<Layout />}>

              <Route
                path="/cardiometabolico"
                element={<DashboardCardiometabolico />}
              />

              <Route
                path="/cardiometabolico/pacientes"
                element={<PacientesCardiometabolico />}
              />

              <Route
                path="/cardiometabolico/pacientes/:id"
                element={<PacienteCardiometabolico />}
              />

              <Route
                path="/cardiometabolico/pacientes/:id/dashboard"
                element={<DashboardCardiometabolico />}
              />

              <Route
                path="/cardiometabolico/pacientes/:id/registro-diario"
                element={<RegistroDiarioCardiometabolico />}
              />

              <Route
                path="/cardiometabolico/mapa-risco"
                element={<MapaRiscoCardiometabolico />}
              />

              <Route
                path="/cardiometabolico/pacientes/:id/intervencao"
                element={<IntervencaoCardiometabolica />}
              />              

              <Route 
                path="/cardiometabolico/pacientes/:id/pts" 
                element={<PTS />}
              />

              <Route
                path="/atividades-terapeuticas"
                element={<AtividadesTerapeuticas />}
              />

              <Route
                path="/atividades-terapeuticas/nova"
                element={<NovaAtividadeTerapeutica />}
              />

              <Route
                path="/ocupacoes-profissionais/nova"
                element={<NovaOcupacaoProfissional />}
              />
              <Route
                path="/dimensionamento"
                element={<DimensionamentoEquipe />}
              />
              <Route
                path="/prontuario/evento/:tipo/:id"
                element={<ProntuarioLongitudinal />}
              />
              <Route
                path="/sessoes-assistenciais/:sessaoId"
                element={<SessaoAssistencial />}
              />

              <Route
                path="/sessoes-assistenciais/:sessaoId/executar"
                element={<ExecutarSessaoAssistencial />}
              />
              <Route
                path="/diagnosticos/:diagnosticoId"
                element={<DiagnosticoDetalhe />}
              />
              <Route
                path="/pacientes/:pacienteId/diagnosticos/novo"
                element={<RegistrarDiagnostico />}
              />              
            </Route>

          </Route>

          {/* Fallback */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

          <Route
            path="/avaliacoes/:codigo"
            element={<AssessmentPage />}
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
