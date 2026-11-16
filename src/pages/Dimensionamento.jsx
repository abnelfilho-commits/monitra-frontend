import { useId, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import DimensionamentoEquipe from "./DimensionamentoEquipe";
import ConsolidacaoMensal from "../components/ConsolidacaoMensal";
import "./Dimensionamento.css";

export default function Dimensionamento() {
  const { user, loading } = useAuth();
  const admin = !loading && user?.perfil === "ADMIN";
  // Reset restricted navigation when the authenticated identity changes.
  return <DimensionamentoAbas key={`${user?.id ?? "anon"}:${user?.perfil ?? ""}:${Boolean(loading)}`} admin={admin} />;
}

function DimensionamentoAbas({ admin }) {
  const [aba, setAba] = useState("planejamento");
  const [mensalVisitada, setMensalVisitada] = useState(false);
  const prefixo = useId();
  const botoes = useRef([]);
  const abas = [{ id: "planejamento", titulo: "Planejamento de Equipe" },
    ...(admin ? [{ id: "mensal", titulo: "Consolidação Mensal" }] : [])];
  const selecionada = admin ? aba : "planejamento";
  function selecionar(id) {
    if (id === "mensal" && !admin) return;
    if (id === "mensal") setMensalVisitada(true);
    setAba(id);
  }
  function abrirMensal() {
    selecionar("mensal");
    botoes.current[1]?.focus();
  }
  function teclado(event, index) {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % abas.length;
    else if (event.key === "ArrowLeft") next = (index + abas.length - 1) % abas.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = abas.length - 1;
    else return;
    event.preventDefault();
    selecionar(abas[next].id);
    botoes.current[next]?.focus();
  }
  return <div className="dimensionamento-abas">
    <div role="tablist" aria-label="Visões de Dimensionamento" className="dimensionamento-abas-lista">
      {abas.map((item, index) => <button key={item.id} type="button" role="tab"
        id={`${prefixo}-aba-${item.id}`} aria-controls={`${prefixo}-painel-${item.id}`}
        aria-selected={selecionada === item.id} tabIndex={selecionada === item.id ? 0 : -1}
        ref={element => { botoes.current[index] = element; }}
        onClick={() => selecionar(item.id)} onKeyDown={event => teclado(event, index)}>{item.titulo}</button>)}
    </div>
    <section role="tabpanel" id={`${prefixo}-painel-planejamento`}
      aria-labelledby={`${prefixo}-aba-planejamento`} hidden={selecionada !== "planejamento"} tabIndex={0}>
      <DimensionamentoEquipe onAbrirConsolidacao={admin ? abrirMensal : undefined} />
    </section>
    {admin && <section role="tabpanel" id={`${prefixo}-painel-mensal`}
      aria-labelledby={`${prefixo}-aba-mensal`} hidden={selecionada !== "mensal"} tabIndex={0}>
      {mensalVisitada && <ConsolidacaoMensal />}
    </section>}
  </div>;
}
