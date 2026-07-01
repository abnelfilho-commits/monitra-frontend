import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import Button from "../components/ui/Button";

import {
  listarPTS,
  criarPTS,
  criarObjetivoPTS,
  encerrarPTS,
  reabrirPTS,
} from "../services/pts";

import {
  listarAgendaPorObjetivo,
  criarAgendaCuidado,
  excluirAgendaCuidado,
  registrarFrequenciaAgenda,
} from "../services/agendaCuidados";

import {
  listarAtividadesTerapeuticas,
  listarOcupacoesDaAtividade,
} from "../services/atividadesTerapeuticas";

function hojeISO() {
  return new Date().toISOString().split("T")[0];
}

function formatarData(data) {
  if (!data) return "-";
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

export default function PTS() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const pacienteId = Number(id);
  
  const searchParams = new URLSearchParams(location.search);

  const isCardio =
    location.pathname.startsWith("/cardiometabolico") ||
    searchParams.get("modulo") === "cardiometabolico";

  const moduloId = isCardio ? 2 : 1;

  const [pts, setPts] = useState([]);
  const [paciente, setPaciente] = useState(null);
  const [atividades, setAtividades] = useState([]);
  const [agendaPorObjetivo, setAgendaPorObjetivo] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [mostrarNovoPTS, setMostrarNovoPTS] = useState(false);
  const [formPTS, setFormPTS] = useState({
    objetivo_geral: "",
    observacoes: "",
  });

  const [objetivoAbertoPTSId, setObjetivoAbertoPTSId] = useState(null);
  const [formObjetivo, setFormObjetivo] = useState({
    descricao: "",
    prioridade: "MEDIA",
  });

  const [objetivoAgendaAbertoId, setObjetivoAgendaAbertoId] = useState(null);
  const [ocupacoesDisponiveis, setOcupacoesDisponiveis] = useState([]);

  const [formAgenda, setFormAgenda] = useState({
    atividade_id: "",
    ocupacao_id: "",
    frequencia_semanal: 1,
    duracao_minutos: 60,
    data_inicio: hojeISO(),
    data_fim: "",
    observacoes: "",
  });

  const [agendaFrequenciaAbertaId, setAgendaFrequenciaAbertaId] = useState(null);

  const [formFrequencia, setFormFrequencia] = useState({
    data_realizacao: hojeISO(),
    observacao_execucao: "",
  });

  useEffect(() => {
    carregar();
  }, [pacienteId, moduloId]);

  const ptsDoModulo = useMemo(() => {
    return pts.filter((item) => Number(item.modulo_id) === moduloId);
  }, [pts, moduloId]);

  const ptsAtivo = useMemo(() => {
    return ptsDoModulo.find((item) => item.status === "ATIVO") || null;
  }, [ptsDoModulo]);

  async function carregar() {
    try {
      setLoading(true);
      setErro("");

      const [atividadesData, ptsData, pacienteData] =
        await Promise.all([
          listarAtividadesTerapeuticas(),
          listarPTS(pacienteId),
          api.get(`/pacientes/${pacienteId}`),
        ]);

      setPaciente(pacienteData.data);
      setAtividades(Array.isArray(atividadesData) ? atividadesData : []);
      setPts(Array.isArray(ptsData) ? ptsData : []);
    } catch (e) {
      setErro(e?.response?.data?.detail || e?.message || "Erro ao carregar PTS.");
    } finally {
      setLoading(false);
    }
  }

  function mostrarMensagem(texto) {
    setMensagem(texto);
    setTimeout(() => setMensagem(""), 3000);
  }

  async function salvarPTS(e) {
    e.preventDefault();

    if (!formPTS.objetivo_geral.trim()) {
      setErro("Informe o objetivo geral do PTS.");
      return;
    }

    try {
      setSaving(true);
      setErro("");
      setMensagem("");

      await criarPTS({
        paciente_id: pacienteId,
        modulo_id: moduloId,
        data_inicio: hojeISO(),
        objetivo_geral: formPTS.objetivo_geral.trim(),
        observacoes: formPTS.observacoes.trim() || null,
      });

      setFormPTS({ objetivo_geral: "", observacoes: "" });
      setMostrarNovoPTS(false);
      mostrarMensagem("PTS criado com sucesso.");

      await carregar();
    } catch (e2) {
      setErro(e2?.response?.data?.detail || e2?.message || "Erro ao criar PTS.");
    } finally {
      setSaving(false);
    }
  }

  async function salvarObjetivo(e, ptsId) {
    e.preventDefault();

    if (!formObjetivo.descricao.trim()) {
      setErro("Informe a descrição do objetivo.");
      return;
    }

    try {
      setSaving(true);
      setErro("");
      setMensagem("");

      await criarObjetivoPTS(ptsId, {
        descricao: formObjetivo.descricao.trim(),
        prioridade: formObjetivo.prioridade || null,
      });

      setFormObjetivo({ descricao: "", prioridade: "MEDIA" });
      setObjetivoAbertoPTSId(null);
      mostrarMensagem("Objetivo criado com sucesso.");

      await carregar();
    } catch (e2) {
      setErro(e2?.response?.data?.detail || e2?.message || "Erro ao criar objetivo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEncerrar(ptsId) {
    try {
      setSaving(true);
      setErro("");

      await encerrarPTS(ptsId);
      mostrarMensagem("PTS encerrado com sucesso.");

      await carregar();
    } catch (e) {
      setErro(e?.response?.data?.detail || e?.message || "Erro ao encerrar PTS.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReabrir(ptsId) {
    try {
      setSaving(true);
      setErro("");

      await reabrirPTS(ptsId);
      mostrarMensagem("PTS reaberto com sucesso.");

      await carregar();
    } catch (e) {
      setErro(e?.response?.data?.detail || e?.message || "Erro ao reabrir PTS.");
    } finally {
      setSaving(false);
    }
  }

  async function carregarAgendaObjetivo(objetivoId) {
    try {
      const dados = await listarAgendaPorObjetivo(objetivoId);

      setAgendaPorObjetivo((prev) => ({
        ...prev,
        [objetivoId]: Array.isArray(dados) ? dados : [],
      }));
    } catch (e) {
      console.error(e);
    }
  }

  async function abrirPlanejamento(objetivoId) {
    const abrindo = objetivoAgendaAbertoId !== objetivoId;

    setObjetivoAgendaAbertoId(abrindo ? objetivoId : null);
    setOcupacoesDisponiveis([]);

    setFormAgenda({
      atividade_id: "",
      ocupacao_id: "",
      frequencia_semanal: 1,
      duracao_minutos: 60,
      data_inicio: hojeISO(),
      data_fim: "",
      observacoes: "",
    });

    if (abrindo) {
      await carregarAgendaObjetivo(objetivoId);
    }
  }

  async function selecionarAtividade(atividadeId) {
    const atividade = atividades.find((a) => Number(a.id) === Number(atividadeId));

    setFormAgenda((prev) => ({
      ...prev,
      atividade_id: atividadeId,
      ocupacao_id: "",
      duracao_minutos: atividade?.duracao_minutos || prev.duracao_minutos || 60,
    }));

    if (!atividadeId) {
      setOcupacoesDisponiveis([]);
      return;
    }

    try {
      const ocupacoes = await listarOcupacoesDaAtividade(atividadeId);
      setOcupacoesDisponiveis(Array.isArray(ocupacoes) ? ocupacoes : []);
    } catch (e) {
      setErro(
        e?.response?.data?.detail ||
          e?.message ||
          "Erro ao carregar ocupações da atividade."
      );
    }
  }

  async function salvarAgenda(e, ptsId, objetivoId) {
    e.preventDefault();

    if (!formAgenda.atividade_id) {
      setErro("Selecione a atividade terapêutica.");
      return;
    }

    if (!formAgenda.ocupacao_id) {
      setErro("Selecione a ocupação profissional.");
      return;
    }

    if (!formAgenda.data_inicio) {
      setErro("Informe a data de início.");
      return;
    }

    try {
      setSaving(true);
      setErro("");
      setMensagem("");

      await criarAgendaCuidado({
        pts_id: Number(ptsId),
        objetivo_id: Number(objetivoId),
        atividade_id: Number(formAgenda.atividade_id),
        ocupacao_id: Number(formAgenda.ocupacao_id),
        frequencia_semanal: Number(formAgenda.frequencia_semanal || 1),
        duracao_minutos: Number(formAgenda.duracao_minutos || 60),
        data_inicio: formAgenda.data_inicio,
        data_fim: formAgenda.data_fim || null,
        observacoes: formAgenda.observacoes?.trim() || null,
      });

      setFormAgenda({
        atividade_id: "",
        ocupacao_id: "",
        frequencia_semanal: 1,
        duracao_minutos: 60,
        data_inicio: hojeISO(),
        data_fim: "",
        observacoes: "",
      });

      setOcupacoesDisponiveis([]);
      mostrarMensagem("Planejamento criado com sucesso.");

      await carregarAgendaObjetivo(objetivoId);
    } catch (e2) {
      setErro(
        e2?.response?.data?.detail ||
          e2?.message ||
          "Erro ao criar planejamento."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removerAgenda(agendaId, objetivoId) {
    const confirmar = window.confirm("Deseja remover este planejamento?");
    if (!confirmar) return;

    try {
      setSaving(true);
      setErro("");

      await excluirAgendaCuidado(agendaId);
      mostrarMensagem("Planejamento removido com sucesso.");

      await carregarAgendaObjetivo(objetivoId);
    } catch (e) {
      setErro(e?.response?.data?.detail || e?.message || "Erro ao remover planejamento.");
    } finally {
      setSaving(false);
    }
  }

  function nomeAtividade(id) {
    return atividades.find((a) => Number(a.id) === Number(id))?.nome || `Atividade #${id}`;
  }

  function nomeOcupacao(id, objetivoId) {
    const agenda = agendaPorObjetivo[objetivoId] || [];
    const item = agenda.find((a) => Number(a.ocupacao_id) === Number(id));

    const ocupacaoDisponivel = ocupacoesDisponiveis.find(
      (o) => Number(o.id) === Number(id)
    );

    return item?.ocupacao_nome || ocupacaoDisponivel?.nome || `Ocupação #${id}`;
  }

  async function salvarFrequencia(e, agendaId, objetivoId) {
    e.preventDefault();

    try {
      setSaving(true);
      setErro("");
      setMensagem("");

      await registrarFrequenciaAgenda(agendaId, {
        status_execucao: formFrequencia.status_execucao,
        data_realizacao: formFrequencia.data_realizacao || null,
        observacao_execucao:
          formFrequencia.observacao_execucao?.trim() || null,
      });

      setAgendaFrequenciaAbertaId(null);
      setFormFrequencia({
        status_execucao: "REALIZADO",
        data_realizacao: hojeISO(),
        observacao_execucao: "",
      });

      mostrarMensagem("Frequência registrada com sucesso.");

      await carregarAgendaObjetivo(objetivoId);
    } catch (e) {
      setErro(
        e?.response?.data?.detail ||
          e?.message ||
          "Erro ao registrar frequência."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!id || Number.isNaN(pacienteId) || pacienteId <= 0) {
    return (
      <div style={{ padding: 24 }}>
        <p>Paciente inválido.</p>
        <Button
          variant="secondary"
          onClick={() =>
            navigate(isCardio ? "/cardiometabolico/pacientes" : "/pacientes")
          }
        >
          Voltar
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>Carregando PTS...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0 }}>
              Plano Terapêutico Singular
            </h2>

            {paciente && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                {paciente.nome}
              </div>
            )}

            <div style={subtitleStyle}>
              {isCardio
                ? "Módulo Cardiometabólico"
                : "Módulo Neurodesenvolvimento"}
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={() =>
              navigate(
                isCardio
                  ? `/cardiometabolico/pacientes/${pacienteId}`
                  : `/pacientes/${pacienteId}`
              )
            }
          >
            ← Voltar
          </Button>
        </div>

        {erro && <div style={erroStyle}>{erro}</div>}
        {mensagem && <div style={sucessoStyle}>{mensagem}</div>}

        {!ptsAtivo && !mostrarNovoPTS && (
          <div style={emptyStyle}>
            <h3 style={{ marginTop: 0 }}>Nenhum PTS ativo cadastrado.</h3>
            <p style={{ color: "#6b7280", marginTop: 6 }}>
              Crie um Plano Terapêutico Singular para organizar os objetivos clínicos deste paciente.
            </p>
            <Button onClick={() => setMostrarNovoPTS(true)}>+ Criar PTS</Button>
          </div>
        )}

        {mostrarNovoPTS && (
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Novo PTS</h3>

            <form onSubmit={salvarPTS}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Objetivo Geral</label>
                <textarea
                  value={formPTS.objetivo_geral}
                  onChange={(e) =>
                    setFormPTS((prev) => ({
                      ...prev,
                      objetivo_geral: e.target.value,
                    }))
                  }
                  placeholder="Ex.: Melhorar interação social e comunicação funcional."
                  style={textareaStyle}
                  required
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Observações</label>
                <textarea
                  value={formPTS.observacoes}
                  onChange={(e) =>
                    setFormPTS((prev) => ({
                      ...prev,
                      observacoes: e.target.value,
                    }))
                  }
                  placeholder="Observações clínicas ou plano inicial."
                  style={textareaStyle}
                />
              </div>

              <div style={actionsStyle}>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  onClick={() => setMostrarNovoPTS(false)}
                >
                  Cancelar
                </Button>

                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar PTS"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {ptsDoModulo.map((item) => (
          <div key={item.id} style={cardStyle}>
            <div style={ptsHeaderStyle}>
              <div>
                <h3 style={{ margin: 0 }}>Plano Terapêutico</h3>

                <div style={{ marginTop: 8 }}>
                  <span
                    style={{
                      ...badgeStyle,
                      background: item.status === "ATIVO" ? "#dcfce7" : "#f3f4f6",
                      color: item.status === "ATIVO" ? "#166534" : "#374151",
                      border:
                        item.status === "ATIVO"
                          ? "1px solid #86efac"
                          : "1px solid #d1d5db",
                    }}
                  >
                    {item.status}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {item.status === "ATIVO" ? (
                  <Button
                    variant="danger"
                    disabled={saving}
                    onClick={() => handleEncerrar(item.id)}
                  >
                    Encerrar PTS
                  </Button>
                ) : (
                  <Button
                    disabled={saving || Boolean(ptsAtivo)}
                    onClick={() => handleReabrir(item.id)}
                  >
                    Reabrir PTS
                  </Button>
                )}
              </div>
            </div>

            <div style={infoGridStyle}>
              <div>
                <div style={smallLabelStyle}>Data de início</div>
                <div>{formatarData(item.data_inicio)}</div>
              </div>

              <div>
                <div style={smallLabelStyle}>Data de fim</div>
                <div>{formatarData(item.data_fim)}</div>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={smallLabelStyle}>Objetivo Geral</div>
              <div style={textBlockStyle}>{item.objetivo_geral || "-"}</div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={smallLabelStyle}>Observações</div>
              <div style={textBlockStyle}>{item.observacoes || "-"}</div>
            </div>

            <hr style={{ margin: "24px 0", borderColor: "#e5e7eb" }} />

            <div style={sectionHeaderStyle}>
              <h4 style={{ margin: 0 }}>Objetivos Terapêuticos</h4>

              {item.status === "ATIVO" && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    setObjetivoAbertoPTSId(objetivoAbertoPTSId === item.id ? null : item.id)
                  }
                >
                  + Novo Objetivo
                </Button>
              )}
            </div>

            {objetivoAbertoPTSId === item.id && (
              <form
                onSubmit={(e) => salvarObjetivo(e, item.id)}
                style={objetivoFormStyle}
              >
                <div>
                  <label style={labelStyle}>Descrição</label>
                  <textarea
                    value={formObjetivo.descricao}
                    onChange={(e) =>
                      setFormObjetivo((prev) => ({
                        ...prev,
                        descricao: e.target.value,
                      }))
                    }
                    placeholder="Ex.: Reduzir episódios de desregulação sensorial."
                    style={textareaStyle}
                    required
                  />
                </div>

                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>Prioridade</label>
                  <select
                    value={formObjetivo.prioridade}
                    onChange={(e) =>
                      setFormObjetivo((prev) => ({
                        ...prev,
                        prioridade: e.target.value,
                      }))
                    }
                    style={inputStyle}
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                  </select>
                </div>

                <div style={actionsStyle}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => setObjetivoAbertoPTSId(null)}
                  >
                    Cancelar
                  </Button>

                  <Button type="submit" disabled={saving}>
                    {saving ? "Salvando..." : "Salvar Objetivo"}
                  </Button>
                </div>
              </form>
            )}

            {!item.objetivos || item.objetivos.length === 0 ? (
              <p style={{ color: "#6b7280", marginTop: 14 }}>
                Nenhum objetivo cadastrado.
              </p>
            ) : (
              item.objetivos.map((objetivo) => (
                <div key={objetivo.id} style={objetivoCardStyle}>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <span style={prioridadeStyle}>
                      {objetivo.prioridade || "SEM PRIORIDADE"}
                    </span>

                    <span style={statusObjetivoStyle}>{objetivo.status}</span>
                  </div>

                  <div style={{ lineHeight: 1.6 }}>{objetivo.descricao}</div>

                  <div style={{ marginTop: 12 }}>
                    <Button
                      variant="secondary"
                      onClick={() => abrirPlanejamento(objetivo.id)}
                    >
                      Planejar Atividade
                    </Button>
                  </div>

                  {objetivoAgendaAbertoId === objetivo.id && (
                    <div style={agendaBoxStyle}>
                      <h4 style={{ marginTop: 0 }}>Agenda de Cuidados</h4>

                      <form onSubmit={(e) => salvarAgenda(e, item.id, objetivo.id)}>
                        <div style={gridFormStyle}>
                          <div>
                            <label style={labelStyle}>Atividade Terapêutica</label>
                            <select
                              value={formAgenda.atividade_id}
                              onChange={(e) => selecionarAtividade(e.target.value)}
                              style={inputStyle}
                              required
                            >
                              <option value="">Selecione</option>
                              {atividades.map((atividade) => (
                                <option key={atividade.id} value={atividade.id}>
                                  {atividade.nome}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label style={labelStyle}>Ocupação habilitada</label>
                            <select
                              value={formAgenda.ocupacao_id}
                              onChange={(e) =>
                                setFormAgenda((prev) => ({
                                  ...prev,
                                  ocupacao_id: e.target.value,
                                }))
                              }
                              style={inputStyle}
                              required
                              disabled={!formAgenda.atividade_id}
                            >
                              <option value="">
                                {!formAgenda.atividade_id
                                  ? "Selecione a atividade primeiro"
                                  : "Selecione"}
                              </option>

                              {ocupacoesDisponiveis.map((ocupacao) => (
                                <option key={ocupacao.id} value={ocupacao.id}>
                                  {ocupacao.nome}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label style={labelStyle}>Frequência semanal</label>
                            <input
                              type="number"
                              min="1"
                              value={formAgenda.frequencia_semanal}
                              onChange={(e) =>
                                setFormAgenda((prev) => ({
                                  ...prev,
                                  frequencia_semanal: e.target.value,
                                }))
                              }
                              style={inputStyle}
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Duração em minutos</label>
                            <input
                              type="number"
                              min="1"
                              value={formAgenda.duracao_minutos}
                              onChange={(e) =>
                                setFormAgenda((prev) => ({
                                  ...prev,
                                  duracao_minutos: e.target.value,
                                }))
                              }
                              style={inputStyle}
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Data de início</label>
                            <input
                              type="date"
                              value={formAgenda.data_inicio}
                              onChange={(e) =>
                                setFormAgenda((prev) => ({
                                  ...prev,
                                  data_inicio: e.target.value,
                                }))
                              }
                              style={inputStyle}
                              required
                            />
                          </div>

                          <div>
                            <label style={labelStyle}>Data de fim</label>
                            <input
                              type="date"
                              value={formAgenda.data_fim}
                              onChange={(e) =>
                                setFormAgenda((prev) => ({
                                  ...prev,
                                  data_fim: e.target.value,
                                }))
                              }
                              style={inputStyle}
                            />
                          </div>
                        </div>

                        <div style={{ marginTop: 12 }}>
                          <label style={labelStyle}>Observações</label>
                          <textarea
                            value={formAgenda.observacoes}
                            onChange={(e) =>
                              setFormAgenda((prev) => ({
                                ...prev,
                                observacoes: e.target.value,
                              }))
                            }
                            placeholder="Observações sobre o planejamento."
                            style={textareaStyle}
                          />
                        </div>

                        <div style={actionsStyle}>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setObjetivoAgendaAbertoId(null)}
                          >
                            Fechar
                          </Button>

                          <Button type="submit" disabled={saving}>
                            {saving ? "Salvando..." : "Salvar Planejamento"}
                          </Button>
                        </div>
                      </form>

                      <div style={{ marginTop: 20 }}>
                        <h4>Planejamento Atual</h4>

                        {(agendaPorObjetivo[objetivo.id] || []).length === 0 ? (
                          <p style={{ color: "#6b7280" }}>
                            Nenhuma atividade planejada para este objetivo.
                          </p>
                        ) : (
                          (agendaPorObjetivo[objetivo.id] || []).map((agenda) => (
                            <div key={agenda.id} style={agendaItemStyle}>
                              <div>
                                <strong>
                                  {agenda.atividade_nome || nomeAtividade(agenda.atividade_id)}
                                </strong>
                              </div>

                              <div style={{ marginTop: 6, color: "#4b5563" }}>
                                <strong>Profissional:</strong> {agenda.ocupacao_nome || nomeOcupacao(agenda.ocupacao_id, objetivo.id)}
                              </div>

                              <div style={{ marginTop: 8, color: "#4b5563" }}>
                                <strong>Status:</strong> {agenda.status}
                              </div>
                              <div style={{ marginTop: 8, color: "#4b5563" }}>
                                <strong>Execução:</strong> {agenda.status_execucao || "PLANEJADO"}
                              </div>

                              <div style={{ marginTop: 8, color: "#4b5563" }}>
                                <strong>Data de realização:</strong>{" "}
                                {formatarData(agenda.data_realizacao)}
                              </div>

                              {agenda.observacao_execucao && (
                                <div style={{ marginTop: 10 }}>
                                  <strong>Observação da execução:</strong>
                                  <div
                                    style={{
                                      marginTop: 6,
                                      padding: 10,
                                      background: "#f0fdf4",
                                      borderRadius: 8,
                                    }}
                                  >
                                    {agenda.observacao_execucao}
                                  </div>
                                </div>
                              )}
                              <div style={{ marginTop: 8, color: "#4b5563" }}>
                                <strong>Frequência:</strong> {agenda.frequencia_semanal}x por semana
                              </div>

                              <div style={{ marginTop: 8, color: "#4b5563" }}>
                                <strong>Duração:</strong> {agenda.duracao_minutos} minutos
                              </div>

                              <div style={{ marginTop: 8, color: "#4b5563" }}>
                                <strong>Carga semanal:</strong>{" "}
                                {agenda.frequencia_semanal * agenda.duracao_minutos} min/semana
                              </div>

                              <div style={{ marginTop: 8, color: "#4b5563" }}>
                                <strong>Período:</strong>{" "}
                                {formatarData(agenda.data_inicio)}
                                {" a "}
                                {formatarData(agenda.data_fim)}
                              </div>

                              {agenda.observacoes && (
                                <div style={{ marginTop: 10 }}>
                                  <strong>Observações:</strong>

                                  <div
                                    style={{
                                      marginTop: 6,
                                      padding: 10,
                                      background: "#f9fafb",
                                      borderRadius: 8,
                                    }}
                                  >
                                    {agenda.observacoes}
                                  </div>
                                </div>
                              )}

                              <div style={{ marginTop: 12 }}>
                                <Button
                                  variant="secondary"
                                  disabled={saving}
                                  onClick={() => {
                                    setAgendaFrequenciaAbertaId(
                                      agendaFrequenciaAbertaId === agenda.id ? null : agenda.id
                                    );

                                    setFormFrequencia({
                                      status_execucao:
                                        agenda.status_execucao && agenda.status_execucao !== "PLANEJADO"
                                          ? agenda.status_execucao
                                          : "REALIZADO",
                                      data_realizacao: agenda.data_realizacao || hojeISO(),
                                      observacao_execucao: agenda.observacao_execucao || "",
                                    });
                                  }}
                                >
                                  Registrar Frequência
                                </Button>
                                <Button
                                  variant="danger"
                                  disabled={saving}
                                  onClick={() => removerAgenda(agenda.id, objetivo.id)}
                                >
                                  Excluir Planejamento
                                </Button>
                              </div>
                              {agendaFrequenciaAbertaId === agenda.id && (
                                <form
                                  onSubmit={(e) => salvarFrequencia(e, agenda.id, objetivo.id)}
                                  style={frequenciaBoxStyle}
                                >
                                  <h4 style={{ marginTop: 0 }}>Registrar Frequência</h4>

                                  <div style={gridFormStyle}>
                                    <div>
                                      <label style={labelStyle}>Status da execução</label>
                                      <select
                                        value={formFrequencia.status_execucao}
                                        onChange={(e) =>
                                          setFormFrequencia((prev) => ({
                                            ...prev,
                                            status_execucao: e.target.value,
                                          }))
                                        }
                                        style={inputStyle}
                                      >
                                        <option value="REALIZADO">Realizado</option>
                                        <option value="FALTOU">Faltou</option>
                                        <option value="CANCELADO">Cancelado</option>
                                        <option value="REAGENDADO">Reagendado</option>
                                        <option value="ABANDONOU">Abandonou</option>
                                      </select>
                                    </div>

                                    <div>
                                      <label style={labelStyle}>Data</label>
                                      <input
                                        type="date"
                                        value={formFrequencia.data_realizacao}
                                        onChange={(e) =>
                                          setFormFrequencia((prev) => ({
                                            ...prev,
                                            data_realizacao: e.target.value,
                                          }))
                                        }
                                        style={inputStyle}
                                      />
                                    </div>
                                  </div>

                                  <div style={{ marginTop: 12 }}>
                                    <label style={labelStyle}>Observações</label>
                                    <textarea
                                      value={formFrequencia.observacao_execucao}
                                      onChange={(e) =>
                                        setFormFrequencia((prev) => ({
                                          ...prev,
                                          observacao_execucao: e.target.value,
                                        }))
                                      }
                                      style={textareaStyle}
                                      placeholder="Ex.: Paciente compareceu normalmente."
                                    />
                                  </div>

                                  <div style={actionsStyle}>
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      onClick={() => setAgendaFrequenciaAbertaId(null)}
                                      disabled={saving}
                                    >
                                      Cancelar
                                    </Button>

                                    <Button type="submit" disabled={saving}>
                                      {saving ? "Salvando..." : "Salvar Frequência"}
                                    </Button>
                                  </div>
                                </form>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 18,
};

const subtitleStyle = {
  fontSize: 14,
  color: "#6b7280",
  marginTop: 4,
};

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 24,
  background: "#fff",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
  marginBottom: 18,
};

const emptyStyle = {
  ...cardStyle,
  textAlign: "left",
};

const ptsHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const infoGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginTop: 18,
};

const textBlockStyle = {
  marginTop: 6,
  padding: 12,
  borderRadius: 12,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  whiteSpace: "pre-wrap",
};

const smallLabelStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: "#374151",
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 100,
  resize: "vertical",
};

const actionsStyle = {
  marginTop: 20,
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
};

const objetivoFormStyle = {
  marginTop: 16,
  padding: 16,
  borderRadius: 14,
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
};

const objetivoCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  marginTop: 12,
  background: "#f9fafb",
};

const agendaBoxStyle = {
  marginTop: 16,
  padding: 16,
  borderRadius: 14,
  background: "#fff",
  border: "1px solid #d1d5db",
};

const gridFormStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const agendaItemStyle = {
  marginTop: 12,
  padding: 14,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
};

const prioridadeStyle = {
  ...badgeStyle,
  background: "#dbeafe",
  color: "#1e40af",
  border: "1px solid #bfdbfe",
};

const statusObjetivoStyle = {
  ...badgeStyle,
  background: "#f3f4f6",
  color: "#374151",
  border: "1px solid #d1d5db",
};

const erroStyle = {
  background: "#fee2e2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  padding: 12,
  borderRadius: 10,
  marginBottom: 16,
};

const sucessoStyle = {
  background: "#dcfce7",
  border: "1px solid #86efac",
  color: "#166534",
  padding: 12,
  borderRadius: 10,
  marginBottom: 16,
};

const frequenciaBoxStyle = {
  marginTop: 14,
  padding: 14,
  borderRadius: 12,
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
};