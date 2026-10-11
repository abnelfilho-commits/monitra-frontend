import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PageLayout from "../components/layouts/PageLayout";
import PageHeader from "../components/ui/PageHeader";
import CardWidget from "../components/ui/CardWidget";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import {
  adicionarBeneficiario,
  atualizarContrato,
  criarContrato,
  encerrarBeneficiario,
  listarBeneficiarios,
  listarCandidatosBeneficiarios,
  listarContratos,
  listarTabelas,
  obterContrato,
  publicarContrato,
} from "../services/economia";
import { listarInstituicoes } from "../services/instituicoes";
import "./TabelasPrecos.css";

const date = value => value ? value.split("-").reverse().join("/") : "Sem término";

function Modal({ title, children, close, busy }) {
  const ref = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    ref.current.showModal();
    return () => opener?.focus();
  }, []);

  return (
    <dialog
      ref={ref}
      className="economic-dialog price-dialog"
      aria-label={title}
      onCancel={event => {
        event.preventDefault();
        if (!busy) close();
      }}
    >
      <h2>{title}</h2>
      {children}
      <Button variant="secondary" disabled={busy} onClick={close}>
        Cancelar
      </Button>
    </dialog>
  );
}

const messages = {
  PUBLISHED_IMMUTABLE: "Este contrato já foi publicado e não pode ter seus dados estruturais alterados.",
  INVALID_BENEFICIARY: "O paciente informado não é um beneficiário válido para esta operação.",
  BENEFICIARY_PAYER_MISMATCH: "O paciente não possui vínculo institucional ativo com a instituição pagadora.",
  BENEFICIARY_OUTSIDE_CONTRACT_PERIOD: "O período de cobertura do beneficiário deve estar integralmente dentro da vigência do contrato.",
  BENEFICIARY_ALREADY_CLOSED: "Informe uma data anterior ao término atual da cobertura. Esta operação não permite manter ou prorrogar o término.",
  BENEFICIARY_PERIOD_OVERLAP: "Já existe uma cobertura deste beneficiário no contrato que se sobrepõe ao período informado.",
  INVALID_PERIOD: "A data final não pode ser anterior à data inicial.",
  CONTRACT_CODE_EDITION_EXISTS: "Já existe um contrato com este código e edição para a instituição pagadora.",
  CONTRACT_TABLE_PAYER_MISMATCH: "A tabela de preços selecionada não pertence à instituição pagadora.",
  REFERENCE_NOT_FOUND: "Uma referência não foi encontrada. Atualize a consulta.",
  NOT_FOUND: "Contrato ou beneficiário não encontrado.",
};

function errorText(error) {
  const status = error?.response?.status;
  if (status === 401) return "Sessão expirada. Entre novamente.";
  if (status === 403) return "Esta área é exclusiva do ADMIN global.";

  const code = error?.response?.data?.detail?.code;
  if (messages[code]) return messages[code];

  if (status === 422) return "Confira os campos e períodos informados.";

  return error?.response
    ? "Não foi possível concluir a operação. Tente novamente."
    : error.message || "Não foi possível concluir a operação.";
}

export default function ContratosEconomicos() {
  const { user, loading: authLoading } = useAuth();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ loading: true });
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({});

  useEffect(() => {
    if (authLoading || user?.perfil !== "ADMIN") return;

    let current = true;
    setState({ loading: true });

    Promise.all([
      listarContratos(),
      listarInstituicoes(),
      listarTabelas(),
    ])
      .then(([contracts, institutions, tables]) => {
        if (current) {
          setState({
            loading: false,
            data: { contracts, institutions, tables },
          });
        }
      })
      .catch(error => {
        if (current) setState({ loading: false, error: errorText(error) });
      });

    return () => {
      current = false;
    };
  }, [authLoading, user?.perfil, revision]);

  if (authLoading) return <p role="status">Carregando...</p>;
  if (user?.perfil !== "ADMIN") return <Navigate to="/dashboard" replace />;

  const contracts = state.data?.contracts || [];
  const institutions = state.data?.institutions || [];
  const tables = state.data?.tables || [];
  const availableTables = form?.pagador_instituicao_id
    ? tables.filter(
        table =>
          String(table.proprietario_instituicao_id) ===
          String(form.pagador_instituicao_id)
      )
    : [];

  async function submit(event) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setFeedback({});

    try {
      await criarContrato({
        pagador_instituicao_id: Number(form.pagador_instituicao_id),
        codigo: form.codigo.trim(),
        edicao: Number(form.edicao),
        tabela_preco_id: Number(form.tabela_preco_id),
        inicio: form.inicio,
        fim: form.fim || null,
      });
      setForm(null);
      setFeedback({ success: "Contrato criado com sucesso." });
      setRevision(value => value + 1);
    } catch (error) {
      setFeedback({ error: errorText(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageLayout>
      <Link to="/admin/economia">Voltar à Administração Econômica</Link>

      <PageHeader
        title="Contratos"
        description="Contratos econômicos vinculam uma instituição pagadora à sua tabela de preços e definem a vigência da cobertura."
        actions={
          <Button
            disabled={state.loading || !!state.error || busy}
            onClick={() => {
              setFeedback({});
              setForm({
                pagador_instituicao_id: "",
                codigo: "",
                edicao: "1",
                tabela_preco_id: "",
                inicio: "",
                fim: "",
              });
            }}
          >
            Novo Contrato
          </Button>
        }
      />

      <Button
        variant="secondary"
        disabled={state.loading}
        onClick={() => setRevision(value => value + 1)}
      >
        Atualizar
      </Button>

      {feedback.error && !form && <p role="alert">{feedback.error}</p>}
      {feedback.success && !form && <p role="status">{feedback.success}</p>}
      {state.loading && <p role="status">Carregando...</p>}
      {state.error && <p role="alert">{state.error}</p>}

      {!state.loading && !state.error && (
        <CardWidget title="Contratos cadastrados">
          {!contracts.length ? (
            <EmptyState
              title="Nenhum contrato cadastrado"
              description="Os contratos econômicos cadastrados aparecerão aqui."
            />
          ) : (
            <div className="price-table">
              <table>
                <thead>
                  <tr>
                    <th>Instituição pagadora</th>
                    <th>Código</th>
                    <th>Edição</th>
                    <th>Tabela de Preços</th>
                    <th>Vigência</th>
                    <th>Estado</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map(row => (
                    <tr key={row.id}>
                      <td>{row.pagador_nome}</td>
                      <td>{row.codigo}</td>
                      <td>{row.edicao}</td>
                      <td>{row.tabela_codigo} — {row.tabela_nome}</td>
                      <td>{date(row.inicio)} a {date(row.fim)}</td>
                      <td>{row.estado === "DRAFT" ? "RASCUNHO" : "PUBLICADO"}</td>
                      <td>
                        <Link to={`/admin/economia/contratos/${row.id}`}>
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardWidget>
      )}

      {form && (
        <Modal title="Novo Contrato" busy={busy} close={() => setForm(null)}>
          {feedback.error && <p role="alert">{feedback.error}</p>}

          <form onSubmit={submit}>
            <fieldset disabled={busy}>
              <div className="economic-fields">
                <label>
                  Instituição pagadora *
                  <select
                    required
                    value={form.pagador_instituicao_id}
                    onChange={event =>
                      setForm({
                        ...form,
                        pagador_instituicao_id: event.target.value,
                        tabela_preco_id: "",
                      })
                    }
                  >
                    <option value="">Selecione</option>
                    {institutions.map(row => (
                      <option key={row.id} value={row.id}>
                        {row.nome_fantasia || row.razao_social}
                        {row.ativo ? "" : " — Inativa"}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Tabela de Preços *
                  <select
                    required
                    disabled={!form.pagador_instituicao_id}
                    value={form.tabela_preco_id}
                    onChange={event =>
                      setForm({ ...form, tabela_preco_id: event.target.value })
                    }
                  >
                    <option value="">
                      {form.pagador_instituicao_id
                        ? "Selecione"
                        : "Selecione primeiro a instituição pagadora"}
                    </option>
                    {availableTables.map(row => (
                      <option key={row.id} value={row.id}>
                        {row.codigo} — {row.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Código *
                  <input
                    required
                    maxLength={64}
                    value={form.codigo}
                    onChange={event =>
                      setForm({ ...form, codigo: event.target.value })
                    }
                  />
                </label>

                <label>
                  Edição *
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={form.edicao}
                    onChange={event =>
                      setForm({ ...form, edicao: event.target.value })
                    }
                  />
                </label>

                <label>
                  Início *
                  <input
                    required
                    type="date"
                    value={form.inicio}
                    onChange={event =>
                      setForm({ ...form, inicio: event.target.value })
                    }
                  />
                </label>

                <label>
                  Fim
                  <input
                    type="date"
                    min={form.inicio || undefined}
                    value={form.fim}
                    onChange={event =>
                      setForm({ ...form, fim: event.target.value })
                    }
                  />
                </label>
              </div>

              {form.pagador_instituicao_id && !availableTables.length && (
                <p role="note">
                  Esta instituição ainda não possui tabela de preços cadastrada.
                </p>
              )}

              <p>O contrato será criado como RASCUNHO.</p>
              <Button type="submit" disabled={!availableTables.length}>
                Criar Contrato
              </Button>
            </fieldset>
          </form>
        </Modal>
      )}
    </PageLayout>
  );
}

export function DetalheContratoEconomico() {
  const { contratoId } = useParams();
  return <DetalheContrato key={contratoId} id={contratoId} />;
}

function DetalheContrato({ id }) {
  const { user, loading: authLoading } = useAuth();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ loading: true });
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({});
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (authLoading || user?.perfil !== "ADMIN") return;

    let current = true;
    setState({ loading: true });

    Promise.all([
      obterContrato(id),
      listarInstituicoes(),
      listarTabelas(),
      listarBeneficiarios(id),
      listarCandidatosBeneficiarios(id),
    ])
      .then(([contract, institutions, tables, beneficiaries, candidates]) => {
        if (current) {
          setState({
            loading: false,
            data: {
              contract,
              institutions,
              tables,
              beneficiaries,
              candidates,
            },
          });
        }
      })
      .catch(error => {
        if (current) setState({ loading: false, error: errorText(error) });
      });

    return () => {
      current = false;
    };
  }, [authLoading, user?.perfil, id, revision]);

  if (authLoading) return <p role="status">Carregando...</p>;
  if (user?.perfil !== "ADMIN") return <Navigate to="/dashboard" replace />;

  const contract = state.data?.contract;
  const institutions = state.data?.institutions || [];
  const tables = state.data?.tables || [];
  const beneficiaries = state.data?.beneficiaries || [];
  // Compare calendar DATE values directly; do not parse them as UTC timestamps.
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const candidates = state.data?.candidates || [];
  const draft = contract?.estado === "DRAFT";

  const availableTables = editor?.type === "edit"
    ? tables.filter(
        table =>
          String(table.proprietario_instituicao_id) ===
          String(editor.form.pagador_instituicao_id)
      )
    : [];

  async function run(operation, success) {
    if (busy) return;

    setBusy(true);
    setFeedback({});

    try {
      await operation();
      setEditor(null);
      setConfirmed(false);
      setFeedback({ success });
      setRevision(value => value + 1);
    } catch (error) {
      setFeedback({ error: errorText(error) });
    } finally {
      setBusy(false);
    }
  }

  function openEdit() {
    setFeedback({});
    setEditor({
      type: "edit",
      form: {
        pagador_instituicao_id: String(contract.pagador_instituicao_id),
        codigo: contract.codigo,
        edicao: String(contract.edicao),
        tabela_preco_id: String(contract.tabela_preco_id),
        inicio: contract.inicio,
        fim: contract.fim || "",
      },
    });
  }

  return (
    <PageLayout>
      <Link to="/admin/economia/contratos">Voltar aos Contratos</Link>

      <PageHeader title="Detalhe do Contrato" />

      {!editor && feedback.error && <p role="alert">{feedback.error}</p>}
      {!editor && feedback.success && <p role="status">{feedback.success}</p>}

      <Button
        variant="secondary"
        disabled={state.loading || busy || !!editor}
        onClick={() => setRevision(value => value + 1)}
      >
        Atualizar
      </Button>

      {state.loading && <p role="status">Carregando...</p>}
      {state.error && <p role="alert">{state.error}</p>}

      {contract && (
        <CardWidget
          title={`${contract.codigo} — Edição ${contract.edicao}`}
        >
          <p>
            <strong>Instituição pagadora:</strong> {contract.pagador_nome}
          </p>
          <p>
            <strong>Tabela de Preços:</strong>{" "}
            {contract.tabela_codigo} — {contract.tabela_nome}
          </p>
          <p>
            <strong>Vigência:</strong> {date(contract.inicio)} a {date(contract.fim)}
          </p>
          <p>
            <strong>Estado:</strong>{" "}
            {draft ? "RASCUNHO" : "PUBLICADO"}
          </p>

          {contract.publicado_em && (
            <p>
              <strong>Publicado em:</strong>{" "}
              {new Date(contract.publicado_em).toLocaleString("pt-BR")}
            </p>
          )}

          {draft ? (
            <div className="economic-actions">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={openEdit}
              >
                Editar Contrato
              </Button>

              <Button
                disabled={busy}
                onClick={() => {
                  setFeedback({});
                  setConfirmed(false);
                  setEditor({ type: "publish" });
                }}
              >
                Publicar Contrato
              </Button>
            </div>
          ) : (
            <p>Contrato publicado. Dados estruturais somente leitura.</p>
          )}
        </CardWidget>
      )}

      {contract && (
        <CardWidget title="Beneficiários">
          <p>
            Pacientes vinculados à instituição pagadora que possuem cobertura
            econômica neste contrato.
          </p>

          <p>
            {beneficiaries.length} cobertura(s) cadastrada(s) ·{" "}
            {candidates.length} paciente(s) elegível(is) no vínculo institucional.
          </p>

          <Button
            disabled={busy || !!editor || !candidates.length}
            onClick={() => {
              setFeedback({});
              setEditor({
                type: "beneficiary",
                form: {
                  paciente_id: "",
                  inicio: contract.inicio,
                  fim: "",
                  identificador_beneficiario: "",
                },
              });
            }}
          >
            Adicionar Beneficiário
          </Button>

          {!candidates.length && (
            <p>Não há pacientes elegíveis disponíveis no vínculo institucional.</p>
          )}

          {!beneficiaries.length ? (
            <EmptyState
              title="Nenhum beneficiário cadastrado"
              description="Adicione um paciente elegível para iniciar sua cobertura neste contrato."
            />
          ) : (
            <div className="price-table">
              <table>
                <thead>
                  <tr>
                    <th>Beneficiário</th>
                    <th>Nascimento</th>
                    <th>Identificador</th>
                    <th>Início</th>
                    <th>Fim</th>
                    <th>Situação</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {beneficiaries.map(row => (
                    <tr key={row.id}>
                      <th scope="row">{row.paciente_nome}</th>
                      <td>{date(row.data_nascimento)}</td>
                      <td>{row.identificador_beneficiario || "—"}</td>
                      <td>{date(row.inicio)}</td>
                      <td>{row.fim ? date(row.fim) : "—"}</td>
                      <td>{row.fim && row.fim < today ? "ENCERRADA" : row.fim ? "VIGENTE — TÉRMINO PROGRAMADO" : "VIGENTE — SEM TÉRMINO DEFINIDO"}</td>
                      <td>
                        {row.fim && row.fim < today ? (
                          "Histórico preservado"
                        ) : (
                          <Button
                            variant="secondary"
                            disabled={busy || !!editor}
                            onClick={() => {
                              setFeedback({});
                              setEditor({
                                type: "close-beneficiary",
                                row,
                                fim: "",
                              });
                            }}
                          >
                            Encerrar cobertura
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardWidget>
      )}

      {editor?.type === "beneficiary" && contract && (
        <Modal
          title="Adicionar Beneficiário"
          busy={busy}
          close={() => setEditor(null)}
        >

          {feedback.error && <p role="alert">{feedback.error}</p>}

          <form
            onSubmit={event => {
              event.preventDefault();

              run(
                () =>
                  adicionarBeneficiario(id, {
                    paciente_id: Number(editor.form.paciente_id),
                    inicio: editor.form.inicio,
                    fim: editor.form.fim || null,
                    identificador_beneficiario:
                      editor.form.identificador_beneficiario.trim() || null,
                  }),
                "Beneficiário adicionado com sucesso."
              );
            }}
          >
            <fieldset disabled={busy}>
              <div className="economic-fields">
                <label>
                  Paciente *
                  <select
                    required
                    value={editor.form.paciente_id}
                    onChange={event =>
                      setEditor({
                        ...editor,
                        form: {
                          ...editor.form,
                          paciente_id: event.target.value,
                        },
                      })
                    }
                  >
                    <option value="">Selecione</option>
                    {candidates.map(row => (
                      <option key={row.paciente_id} value={row.paciente_id}>
                        {row.paciente_nome}
                        {row.data_nascimento
                          ? ` · ${date(row.data_nascimento)}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Início da cobertura *
                  <input
                    required
                    type="date"
                    min={contract.inicio}
                    max={contract.fim || undefined}
                    value={editor.form.inicio}
                    onChange={event =>
                      setEditor({
                        ...editor,
                        form: { ...editor.form, inicio: event.target.value },
                      })
                    }
                  />
                </label>

                <label>
                  Fim da cobertura{contract.fim ? " *" : ""}
                  <input
                    type="date"
                    required={!!contract.fim}
                    min={editor.form.inicio || contract.inicio}
                    max={contract.fim || undefined}
                    value={editor.form.fim}
                    onChange={event =>
                      setEditor({
                        ...editor,
                        form: { ...editor.form, fim: event.target.value },
                      })
                    }
                  />
                </label>

                <label>
                  Identificador do beneficiário
                  <input
                    maxLength={128}
                    value={editor.form.identificador_beneficiario}
                    onChange={event =>
                      setEditor({
                        ...editor,
                        form: {
                          ...editor.form,
                          identificador_beneficiario: event.target.value,
                        },
                      })
                    }
                  />
                </label>
              </div>

              <p>
                O paciente já deve existir e possuir vínculo institucional ativo
                com a instituição pagadora.
              </p>

              <Button type="submit">Adicionar Beneficiário</Button>
            </fieldset>
          </form>
        </Modal>
      )}

      {editor?.type === "close-beneficiary" && contract && (
        <Modal
          title="Encerrar Cobertura"
          busy={busy}
          close={() => setEditor(null)}
        >

          {feedback.error && <p role="alert">{feedback.error}</p>}

          <p>
            Beneficiário: <strong>{editor.row.paciente_nome}</strong>
          </p>
          <p>Início da cobertura: {date(editor.row.inicio)}</p>
          {editor.row.fim && <p>Término atual: {date(editor.row.fim)}. Informe uma data anterior para antecipá-lo.</p>}

          <form
            onSubmit={event => {
              event.preventDefault();

              run(
                () => encerrarBeneficiario(editor.row.id, editor.fim),
                "Término da cobertura atualizado com sucesso."
              );
            }}
          >
            <fieldset disabled={busy}>
              <div className="economic-fields">
                <label>
                  Data final da cobertura *
                  <input
                    required
                    type="date"
                    min={editor.row.inicio}
                    max={contract.fim || undefined}
                    value={editor.fim}
                    onChange={event =>
                      setEditor({ ...editor, fim: event.target.value })
                    }
                  />
                </label>
              </div>

              <div className="price-warning" role="note">
                O histórico será preservado. Esta operação não exclui o
                beneficiário do contrato.
              </div>

              <Button type="submit">Confirmar encerramento</Button>
            </fieldset>
          </form>
        </Modal>
      )}

      {editor?.type === "edit" && contract && (
        <Modal
          title="Editar Contrato"
          busy={busy}
          close={() => setEditor(null)}
        >

          {feedback.error && <p role="alert">{feedback.error}</p>}

          <form
            onSubmit={event => {
              event.preventDefault();

              run(
                () =>
                  atualizarContrato(id, {
                    pagador_instituicao_id: Number(
                      editor.form.pagador_instituicao_id
                    ),
                    codigo: editor.form.codigo.trim(),
                    edicao: Number(editor.form.edicao),
                    tabela_preco_id: Number(editor.form.tabela_preco_id),
                    inicio: editor.form.inicio,
                    fim: editor.form.fim || null,
                  }),
                "Contrato atualizado com sucesso."
              );
            }}
          >
            <fieldset disabled={busy}>
              <div className="economic-fields">
                <label>
                  Instituição pagadora *
                  <select
                    required
                    value={editor.form.pagador_instituicao_id}
                    onChange={event =>
                      setEditor({
                        ...editor,
                        form: {
                          ...editor.form,
                          pagador_instituicao_id: event.target.value,
                          tabela_preco_id: "",
                        },
                      })
                    }
                  >
                    <option value="">Selecione</option>
                    {institutions.map(row => (
                      <option key={row.id} value={row.id}>
                        {row.nome_fantasia || row.razao_social}
                        {row.ativo ? "" : " — Inativa"}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Tabela de Preços *
                  <select
                    required
                    value={editor.form.tabela_preco_id}
                    onChange={event =>
                      setEditor({
                        ...editor,
                        form: {
                          ...editor.form,
                          tabela_preco_id: event.target.value,
                        },
                      })
                    }
                  >
                    <option value="">Selecione</option>
                    {availableTables.map(row => (
                      <option key={row.id} value={row.id}>
                        {row.codigo} — {row.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Código *
                  <input
                    required
                    maxLength={64}
                    value={editor.form.codigo}
                    onChange={event =>
                      setEditor({
                        ...editor,
                        form: { ...editor.form, codigo: event.target.value },
                      })
                    }
                  />
                </label>

                <label>
                  Edição *
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={editor.form.edicao}
                    onChange={event =>
                      setEditor({
                        ...editor,
                        form: { ...editor.form, edicao: event.target.value },
                      })
                    }
                  />
                </label>

                <label>
                  Início *
                  <input
                    required
                    type="date"
                    value={editor.form.inicio}
                    onChange={event =>
                      setEditor({
                        ...editor,
                        form: { ...editor.form, inicio: event.target.value },
                      })
                    }
                  />
                </label>

                <label>
                  Fim
                  <input
                    type="date"
                    min={editor.form.inicio || undefined}
                    value={editor.form.fim}
                    onChange={event =>
                      setEditor({
                        ...editor,
                        form: { ...editor.form, fim: event.target.value },
                      })
                    }
                  />
                </label>
              </div>

              <Button type="submit">Salvar alterações</Button>
            </fieldset>
          </form>
        </Modal>
      )}

      {editor?.type === "publish" && contract && (
        <Modal
          title="Publicar Contrato"
          busy={busy}
          close={() => setEditor(null)}
        >

          {feedback.error && <p role="alert">{feedback.error}</p>}

          <div className="price-warning" role="note">
            <p>
              {contract.pagador_nome} · {contract.codigo} · Edição{" "}
              {contract.edicao}
            </p>
            <p>
              Vigência: {date(contract.inicio)} a {date(contract.fim)}
            </p>
            <strong>
              Após publicar, os dados estruturais deste contrato não poderão
              mais ser alterados.
            </strong>
          </div>

          <label className="price-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy}
              onChange={event => setConfirmed(event.target.checked)}
            />
            Entendo que a publicação torna o contrato estruturalmente somente
            leitura.
          </label>

          <Button
            disabled={busy || !confirmed}
            onClick={() =>
              run(
                () => publicarContrato(id),
                "Contrato publicado com sucesso."
              )
            }
          >
            Confirmar publicação
          </Button>
        </Modal>
      )}
    </PageLayout>
  );
}
