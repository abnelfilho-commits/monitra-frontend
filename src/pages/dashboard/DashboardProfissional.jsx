import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NeuroDashboard from "./NeuroDashboard";
import DashboardCardiometabolico from "../cardiometabolico/DashboardCardiometabolico";

const VIEWS = { 1: NeuroDashboard, 2: DashboardCardiometabolico };

export default function DashboardProfissional() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const line = params.get("care_line") || "";
  const authorized = user?.modulos?.some(module => String(module.id) === line);
  const View = authorized ? VIEWS[line] : null;
  return <>
    <label>Linha de Cuidado ativa <select aria-label="Linha de Cuidado ativa" value={line}
      onChange={event => setParams(event.target.value ? {care_line:event.target.value} : {})}>
      <option value="">Selecione a Linha</option>
      {(user?.modulos || []).map(module => <option key={module.id} value={module.id}>{module.nome}</option>)}
    </select></label>
    {View ? <View key={line} professional /> : <p role="status">Selecione uma Linha de Cuidado autorizada para abrir o Cockpit.</p>}
  </>;
}
