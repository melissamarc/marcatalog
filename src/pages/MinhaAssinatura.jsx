import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  RefreshCw,
  Store,
  XCircle,
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import "./MinhaAssinatura.css";

function MinhaAssinatura() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [assinatura, setAssinatura] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [confirmandoCancelamento, setConfirmandoCancelamento] =
    useState(false);
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    async function carregarAssinatura() {
      if (!usuario) {
        return;
      }

      const { data, error } = await supabase
        .from("assinaturas")
        .select(`
          id,
          status,
          origem,
          periodo_inicio,
          periodo_fim,
          criado_em,
          plano:planos (
            id,
            nome,
            codigo,
            periodicidade,
            preco
          )
        `)
        .eq("usuario_id", usuario.id)
        .maybeSingle();

      if (error) {
        setErro("Não foi possível carregar sua assinatura.");
        setCarregando(false);
        return;
      }

      setAssinatura(data);
      setCarregando(false);
    }

    carregarAssinatura();
  }, [usuario]);

  function formatarPreco(valor) {
    return Number(valor ?? 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarData(data) {
    if (!data) {
      return "Ainda não definida";
    }

    return new Date(data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  function nomeStatus(status) {
    const nomes = {
      ativa: "Ativa",
      pendente: "Pagamento pendente",
      atrasada: "Pagamento atrasado",
      cancelada: "Cancelada",
      expirada: "Expirada",
    };

    return nomes[status] || status;
  }

  async function cancelarAssinatura() {
    setCancelando(true);
    setErro("");

    const { data, error } = await supabase.functions.invoke(
      "cancelar-assinatura"
    );

    if (error) {
      let mensagem =
        "Não foi possível cancelar a assinatura. Tente novamente.";

      try {
        const respostaErro = await error.context.json();

        if (respostaErro?.erro) {
          mensagem = respostaErro.erro;
        }
      } catch {
        // Mantém a mensagem padrão.
      }

      setErro(mensagem);
      setCancelando(false);
      return;
    }

    setAssinatura((assinaturaAtual) => ({
      ...assinaturaAtual,
      status: data?.status || "cancelada",
    }));

    setCancelando(false);
    setConfirmandoCancelamento(false);
  }

  if (carregando) {
    return (
      <main className="minha-assinatura-pagina">
        <section className="minha-assinatura-carregando">
          <RefreshCw size={31} />
          <p>Carregando sua assinatura...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="minha-assinatura-pagina">
      <header className="minha-assinatura-header">
        <button
          className="minha-assinatura-logo"
          type="button"
          onClick={() => navigate("/")}
        >
          <span>
            <Store size={22} />
          </span>

          Marcatalog
        </button>

        <button
          className="minha-assinatura-voltar"
          type="button"
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft size={18} />
          Voltar ao painel
        </button>
      </header>

      <section className="minha-assinatura-conteudo">
        <div className="minha-assinatura-titulo">
          <p>Conta e cobrança</p>
          <h1>Minha assinatura</h1>

          <span>
            Consulte seu plano e acompanhe as informações de
            renovação.
          </span>
        </div>

        {erro && (
          <p className="minha-assinatura-erro">{erro}</p>
        )}

        {!assinatura || !assinatura.plano ? (
          <section className="minha-assinatura-vazia">
            <CreditCard size={38} />

            <h2>Nenhum plano contratado</h2>

            <p>
              Escolha um plano para liberar todas as funcionalidades
              do seu catálogo.
            </p>

            <button
              type="button"
              onClick={() => navigate("/planos")}
            >
              Ver planos
            </button>
          </section>
        ) : (
          <>
            <section className="minha-assinatura-card">
              <div className="minha-assinatura-card-topo">
                <div>
                  <p>Plano atual</p>
                  <h2>{assinatura.plano.nome}</h2>
                </div>

                <span
                  className={`minha-assinatura-status ${assinatura.status}`}
                >
                  {assinatura.status === "ativa" ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <XCircle size={16} />
                  )}

                  {nomeStatus(assinatura.status)}
                </span>
              </div>

              <div className="minha-assinatura-dados">
                <article>
                  <span>
                    <CircleDollarSign size={20} />
                  </span>

                  <div>
                    <p>Valor do plano</p>
                    <strong>
                      {formatarPreco(assinatura.plano.preco)}
                    </strong>

                    <small>
                      por{" "}
                      {assinatura.plano.periodicidade === "anual"
                        ? "ano"
                        : "mês"}
                    </small>
                  </div>
                </article>

                <article>
                  <span>
                    <CalendarDays size={20} />
                  </span>

                  <div>
                    <p>Próxima renovação</p>
                    <strong>
                      {formatarData(assinatura.periodo_fim)}
                    </strong>

                    <small>Renovação automática</small>
                  </div>
                </article>
              </div>

              {assinatura.status === "pendente" && (
                <div className="minha-assinatura-aviso">
                  Seu pagamento ainda não foi confirmado. Após a
                  confirmação, o acesso será liberado automaticamente.
                </div>
              )}

              {assinatura.status === "atrasada" && (
                <div className="minha-assinatura-aviso">
                  Existe uma cobrança atrasada. Regularize o pagamento
                  para recuperar o acesso ao painel.
                </div>
              )}
            </section>

            <section className="minha-assinatura-acoes">
              <div>
                <h2>Gerenciar assinatura</h2>

                <p>
                  O cancelamento impede novas cobranças automáticas
                  no Asaas.
                </p>
              </div>

              {assinatura.status !== "cancelada" &&
                assinatura.status !== "expirada" && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmandoCancelamento(true)
                    }
                  >
                    Cancelar assinatura
                  </button>
                )}

              {assinatura.status === "cancelada" && (
                <button
                  className="assinar-novamente"
                  type="button"
                  onClick={() => navigate("/planos")}
                >
                  Assinar novamente
                </button>
              )}
            </section>
          </>
        )}
      </section>

      {confirmandoCancelamento && (
        <div className="cancelamento-fundo">
          <section className="cancelamento-modal">
            <XCircle size={39} />

            <h2>Cancelar assinatura?</h2>

            <p>
              As próximas cobranças automáticas serão interrompidas.
              Você poderá contratar um novo plano posteriormente.
            </p>

            <div>
              <button
                className="cancelamento-voltar"
                type="button"
                onClick={() =>
                  setConfirmandoCancelamento(false)
                }
                disabled={cancelando}
              >
                Manter assinatura
              </button>

              <button
                className="cancelamento-confirmar"
                type="button"
                onClick={cancelarAssinatura}
                disabled={cancelando}
              >
                {cancelando
                  ? "Cancelando..."
                  : "Sim, cancelar"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default MinhaAssinatura;