import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  obterProfissional,
  atualizarProfissional,
} from "../services/profissionais";
import { listarClinicas } from "../services/clinicas";
import { listarOcupacoesProfissionais } from "../services/atividadesTerapeuticas";
import Button from "../components/ui/Button";

const MODULOS = [
  {
    id: 1,
    nome: "Neurodesenvolvimento",
    descricao: "Módulo Neuro",
  },
  {
    id: 2,
    nome: "Cardiometabólico",
    descricao: "Módulo Cardiometabólico",
  },
];

export default function EditarProfissional() {
  const { id } = useParams();
  const profissionalId = Number(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nome: "",
    email: "",
    ocupacao_id: "",
    especialidade: "",
    clinica_id: "",
    ativo: true,
    modulo_ids: [],
  });

  const [usuarioId, setUsuarioId] = useState(null);
  const [usuarioAtivo, setUsuarioAtivo] = useState(null);

  const [clinicas, setClinicas] = useState([]);
  const [ocupacoes, setOcupacoes] = useState([]);
  const [loadingOcupacoes, setLoadingOcupacoes] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingClinicas, setLoadingClinicas] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  function setField(name, value) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function toggleModulo(moduloId) {
    setForm((prev) => {
      const jaSelecionado = prev.modulo_ids.includes(moduloId);

      return {
        ...prev,
        modulo_ids: jaSelecionado
          ? prev.modulo_ids.filter((id) => id !== moduloId)
          : [...prev.modulo_ids, moduloId],
      };
    });
  }

  async function load() {
    setErro("");
    setLoading(true);

    try {
      const [prof, listaClinicas, listaOcupacoes] = await Promise.all([
        obterProfissional(profissionalId),
        listarClinicas(),
        listarOcupacoesProfissionais(),
      ]);
      setClinicas(
        Array.isArray(listaClinicas)
          ? listaClinicas
          : []
      );
      setOcupacoes(
        Array.isArray(listaOcupacoes)
          ? listaOcupacoes.filter((item) => item.ativo !== false)
          : []
      );
      setForm({
        nome: prof?.nome || "",
        email: prof?.email || "",
        ocupacao_id: prof?.ocupacao_id
          ? String(prof.ocupacao_id)
          : "",
        especialidade: prof?.especialidade || "",
        clinica_id: prof?.clinica_id
          ? String(prof.clinica_id)
          : "",
        ativo: prof?.ativo ?? true,
        modulo_ids: Array.isArray(prof?.modulo_ids)
          ? prof.modulo_ids
          : [],
      });

      setUsuarioId(prof?.usuario_id ?? null);
      setUsuarioAtivo(prof?.usuario_ativo ?? null);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Falha ao carregar profissional.";

      setErro(String(msg));
    } finally {
      setLoading(false);
      setLoadingClinicas(false);
      setLoadingOcupacoes(false);
    }
  }

  useEffect(() => {
    if (!profissionalId || Number.isNaN(profissionalId)) {
      return;
    }

    load();
  }, [profissionalId]);

  async function onSubmit(e) {
    e.preventDefault();
    setErro("");

    if (!form.nome.trim()) {
      setErro("Informe o nome do profissional.");
      return;
    }

    if (!form.email.trim()) {
      setErro("Informe o email do profissional.");
      return;
    }

    if (!form.ocupacao_id) {
      setErro("Selecione a ocupação profissional.");
      return;
    }

    if (!form.clinica_id) {
      setErro("Selecione a clínica.");
      return;
    }

    if (!form.modulo_ids.length) {
      setErro("Selecione pelo menos um módulo de acesso.");
      return;
    }

    setSaving(true);

    try {
      await atualizarProfissional(
        profissionalId,
        {
          nome: form.nome.trim(),
          email: form.email.trim(),
          ocupacao_id: Number(form.ocupacao_id),
          especialidade:
            form.especialidade?.trim() || null,
          clinica_id: Number(form.clinica_id),
          ativo: !!form.ativo,
          modulo_ids: form.modulo_ids,
        }
      );

      navigate(-1);
    } catch (e2) {
      const msg =
        e2?.response?.data?.detail ||
        e2?.message ||
        "Falha ao atualizar profissional.";

      setErro(String(msg));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <p>Carregando profissional...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>
              Editar Profissional
            </h2>

            <div
              style={{
                fontSize: 14,
                color: "#6b7280",
                marginTop: 4,
              }}
            >
              Gestão do cadastro assistencial, acesso e módulos habilitados
            </div>
          </div>

          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate(-1)}
            disabled={saving}
          >
            ← Voltar
          </Button>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 24,
            background: "#fff",
            boxShadow:
              "0 8px 24px rgba(15, 23, 42, 0.05)",
          }}
        >
          <form
            onSubmit={onSubmit}
            autoComplete="off"
          >
            <SectionTitle
              title="Dados do profissional"
              description="Atualize a identidade assistencial do profissional."
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <div>
                <label style={labelStyle}>
                  Nome
                </label>

                <input
                  name="editar-profissional-nome"
                  autoComplete="off"
                  value={form.nome}
                  onChange={(e) =>
                    setField("nome", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Email
                </label>

                <input
                  name="editar-profissional-email"
                  autoComplete="off"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setField("email", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Ocupação Profissional *
                </label>

                <select
                  name="editar-profissional-ocupacao"
                  value={form.ocupacao_id}
                  onChange={(e) =>
                    setField("ocupacao_id", e.target.value)
                  }
                  disabled={loadingOcupacoes}
                  style={inputStyle}
                >
                  <option value="">
                    {loadingOcupacoes
                      ? "Carregando ocupações..."
                      : "Selecione uma ocupação"}
                  </option>

                  {ocupacoes.map((ocupacao) => (
                    <option
                      key={ocupacao.id}
                      value={ocupacao.id}
                    >
                      {ocupacao.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  Especialidade
                </label>

                <input
                  name="editar-profissional-especialidade"
                  autoComplete="off"
                  placeholder="Ex.: Neuropsicologia, Integração Sensorial..."
                  value={form.especialidade}
                  onChange={(e) =>
                    setField("especialidade", e.target.value)
                  }
                  style={inputStyle}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>
                  Clínica
                </label>

                <select
                  value={form.clinica_id}
                  onChange={(e) =>
                    setField(
                      "clinica_id",
                      e.target.value
                    )
                  }
                  disabled={loadingClinicas}
                  style={inputStyle}
                >
                  <option value="">
                    {loadingClinicas
                      ? "Carregando clínicas..."
                      : "Selecione"}
                  </option>

                  {clinicas.map((clinica) => (
                    <option
                      key={clinica.id}
                      value={clinica.id}
                    >
                      {clinica.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <SectionTitle
              title="Acesso à plataforma"
              description="Este acesso está vinculado ao cadastro assistencial do profissional."
            />

            {usuarioId ? (
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #bbf7d0",
                  background: "#f0fdf4",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#166534",
                  }}
                >
                  Usuário profissional vinculado
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    color: "#4b5563",
                  }}
                >
                  O nome, email, clínica e status de acesso
                  são mantidos sincronizados com este
                  cadastro profissional.
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #fde68a",
                  background: "#fffbeb",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#92400e",
                  }}
                >
                  Profissional sem usuário vinculado
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    color: "#4b5563",
                  }}
                >
                  Este é um cadastro legado e não possui
                  acesso de usuário vinculado.
                </div>
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) =>
                    setField(
                      "ativo",
                      e.target.checked
                    )
                  }
                />

                Profissional ativo
              </label>

              {usuarioId && (
                <div style={helpTextStyle}>
                  Ao alterar este status, o acesso do usuário
                  vinculado também será atualizado.
                </div>
              )}

              {usuarioId && usuarioAtivo !== null && (
                <div style={helpTextStyle}>
                  Status atual do acesso:{" "}
                  <strong>
                    {usuarioAtivo
                      ? "Ativo"
                      : "Inativo"}
                  </strong>
                </div>
              )}
            </div>

            <SectionTitle
              title="Módulos habilitados"
              description="Selecione as linhas de cuidado que este profissional poderá acessar."
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 12,
              }}
            >
              {MODULOS.map((modulo) => {
                const selecionado =
                  form.modulo_ids.includes(modulo.id);

                return (
                  <label
                    key={modulo.id}
                    style={{
                      border: selecionado
                        ? "1px solid #0f8f5b"
                        : "1px solid #e5e7eb",
                      background: selecionado
                        ? "#ecfdf3"
                        : "#fff",
                      borderRadius: 14,
                      padding: 14,
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selecionado}
                      onChange={() =>
                        toggleModulo(modulo.id)
                      }
                      style={{ marginTop: 3 }}
                    />

                    <span>
                      <span
                        style={{
                          display: "block",
                          fontWeight: 800,
                          color: "#111827",
                        }}
                      >
                        {modulo.nome}
                      </span>

                      <span
                        style={{
                          display: "block",
                          fontSize: 13,
                          color: "#6b7280",
                          marginTop: 4,
                        }}
                      >
                        {modulo.descricao}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            {erro && (
              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 10,
                  background: "#fee2e2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                }}
              >
                {erro}
              </div>
            )}

            <div
              style={{
                marginTop: 20,
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Button
                variant="secondary"
                type="button"
                onClick={() => navigate(-1)}
                disabled={saving}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Salvando..."
                  : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, description }) {
  return (
    <div
      style={{
        marginTop: 22,
        marginBottom: 14,
        paddingTop: 18,
        borderTop: "1px solid #eef2f7",
      }}
    >
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: "#111827",
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize: 13,
          color: "#6b7280",
        }}
      >
        {description}
      </div>
    </div>
  );
}

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

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  color: "#374151",
};

const helpTextStyle = {
  marginTop: 6,
  fontSize: 12,
  color: "#6b7280",
};