import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import PageLayout from "../../components/layouts/PageLayout/PageLayout";
import ProntuarioSaudeMental from "./ProntuarioSaudeMental";
import Button from "../../components/ui/Button";
import { instituicoesMentais, pessoasMentais, jornadaMental, erroMental } from "../../services/saudeMental";

const card = { background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16 };
const lineLabels = { ATIVA: "Ativa", INATIVA: "Inativa", AUSENTE: "Não vinculada" };
const contextLabels = { ABERTO: "Aberto", ENCERRADO: "Encerrado", PROGRAMADO: "Programado" };
const date = value => value ? value.split("-").reverse().join("/") : "Sem data de encerramento";

function Status({ item }) {
  return <dl>
    <dt>Instituição</dt><dd>{item.instituicao_nome}</dd>
    <dt>Contexto assistencial #{item.contexto_assistencial_id}</dt><dd>{contextLabels[item.contexto_estado]} · {date(item.data_inicio)} — {date(item.data_fim)}</dd>
    <dt>Linha Saúde Mental</dt><dd>{lineLabels[item.linha_estado]}</dd>
  </dl>;
}

export default function SaudeMental() {
  const { pessoaId, contextoId } = useParams();
  const [search, setSearch] = useSearchParams();
  const institution = search.get("instituicao_id") || "";
  const rawOffset = Number(search.get("offset") || 0);
  const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
  const detail = Boolean(pessoaId);
  // Remount on explicit scope changes: previous person's data is never reused.
  const content = <SaudeMentalContent key={`${institution}:${pessoaId}:${contextoId}:${offset}`} {...{institution, pessoaId, contextoId, offset, detail, setSearch}} />;
  return detail ? <div style={{ padding: 24, maxWidth: 1220, margin: "0 auto" }}>{content}</div> : <PageLayout>{content}</PageLayout>;
}

function SaudeMentalContent({ institution, pessoaId, contextoId, offset, detail, setSearch }) {
  const [institutions, setInstitutions] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const location = useLocation();
  const [saved, setSaved] = useState(() => location.state?.diagnosisSaved ? "Diagnóstico registrado com sucesso." : location.state?.checkinSaved ? "Check-in registrado com sucesso." : false);
  useEffect(() => {
    let current = true;
    async function load() {
      setLoading(true); setError(""); setResult(null);
      try {
        if (detail) {
          if (!institution) throw { response: { status: 422 } };
          const value = await jornadaMental(institution, pessoaId, contextoId);
          if (current) setResult(value);
        } else {
          const choices = await instituicoesMentais();
          if (current) setInstitutions(choices);
          if (institution) {
            const value = await pessoasMentais(institution, offset);
            if (current) setResult(value);
          }
        }
      } catch (e) { if (current) setError(erroMental(e)); }
      finally { if (current) setLoading(false); }
    }
    load();
    return () => { current = false; };
  }, [institution, pessoaId, contextoId, offset, detail, retry]);

  return <>
    {!detail && <header style={{ marginBottom: 24 }}><h1>Saúde Mental</h1><p>Jornada assistencial da Pessoa, com contexto institucional explícito.</p></header>}
    {detail ? <Link style={{ display: "inline-block", marginBottom: 16, fontSize: 14 }} to={`/saude-mental?instituicao_id=${encodeURIComponent(institution)}`}>← Pessoas</Link> : <section id="pessoas" style={card}>
      <p><Link to="/operacao-assistencial">Operação contextual — consultar minhas atribuições</Link></p>
      <h2>Pessoas</h2><label htmlFor="mental-institution">Instituição</label>{" "}
      <select id="mental-institution" value={institution} disabled={loading} onChange={e => setSearch(e.target.value ? { instituicao_id: e.target.value } : {})}>
        <option value="">Selecione uma instituição</option>
        {institutions.map(i => <option value={i.id} key={i.id}>{i.nome}</option>)}
      </select>
      <p>A instituição selecionada não concede acesso clínico. Somente contextos autorizados são exibidos.</p>
    </section>}
    {saved && <p role="status">{saved}</p>}
    {loading && <p role="status">Carregando Saúde Mental…</p>}
    {error && <div role="alert" style={card}><p>{error}</p><Button onClick={() => setRetry(n => n + 1)}>Tentar novamente</Button></div>}
    {!loading && !error && !detail && !institution && <p>{institutions.length ? "Selecione explicitamente uma instituição para consultar Pessoas." : "Nenhuma instituição disponível para esta conta. Solicite a verificação do acesso institucional."}</p>}
    {!loading && !error && result && !detail && <>
      {!result.itens.length && <section style={card}><h2>Nenhum contexto acessível</h2><p>Não há Pessoas com contexto autorizado para esta consulta. A existência de um vínculo institucional não concede acesso à jornada.</p><p>O início de contexto e a concessão de acesso não estão disponíveis nesta tela.</p></section>}
      {result.itens.map(item => <article style={card} key={item.contexto_assistencial_id}>
        <h2>{item.nome_social || item.nome_completo}</h2><p>Pessoa #{item.pessoa_id}</p><Status item={item} />
        <Link to={`/saude-mental/pessoas/${item.pessoa_id}/contextos/${item.contexto_assistencial_id}?instituicao_id=${item.instituicao_id}`}>Abrir jornada</Link>
      </article>)}
      <nav aria-label="Paginação de contextos" style={{ display: "flex", gap: 12 }}>
        {offset > 0 && <Button variant="secondary" onClick={() => setSearch({ instituicao_id: institution, offset: String(Math.max(0, offset - 50)) })}>Anterior</Button>}
        {result.tem_mais && <Button onClick={() => setSearch({ instituicao_id: institution, offset: String(offset + 50) })}>Próxima</Button>}
      </nav>
    </>}
    {!loading && !error && result && detail && <ProntuarioSaudeMental
      jornada={result}
      onRefresh={() => { setSaved(false); setRetry(n => n + 1); }}
    />}
  </>;
}
