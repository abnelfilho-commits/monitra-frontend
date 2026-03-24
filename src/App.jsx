import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
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
import MapaRiscoClinica from "./pages/MapaRiscoClinica";
import ClinicaDetalhe from "./pages/ClinicaDetalhe";

import ProtectedRoute from "./routes/ProtectedRoute";
import Layout from "./components/Layout";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />

              <Route path="/pacientes" element={<Pacientes />} />
              <Route path="/pacientes/novo" element={<NovoPaciente />} />
              <Route path="/pacientes/:id" element={<Paciente />} />
              <Route path="/pacientes/:id/intervencao/nova" element={<NovaIntervencao />} />
              <Route path="/pacientes/:id/registro/novo" element={<NovoRegistroDiario />} />
              <Route path="/pacientes/:id/editar" element={<EditarPaciente />} />
              <Route path="/pacientes/:id/registros/:registroId/editar" element={<EditarRegistroDiario />} />
              <Route path="/pacientes/:id/intervencoes/:intervencaoId/editar" element={<EditarIntervencao />} />
              <Route path="/profissionais" element={<Profissionais />} />
              <Route path="/profissionais/novo" element={<NovoProfissional />} />
              <Route path="/profissionais/:id/editar" element={<EditarProfissional />} />
              <Route path="/clinicas" element={<Clinicas />} />
              <Route path="/clinicas/nova" element={<NovaClinica />} />
              <Route path="/clinicas/:id/editar" element={<EditarClinica />} />
              <Route path="/clinicas/:id" element={<ClinicaDetalhe />} />
              <Route path="/clinicas/:id/mapa-risco" element={<MapaRiscoClinica />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
