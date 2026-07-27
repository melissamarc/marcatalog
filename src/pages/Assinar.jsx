import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
  Store,
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import "./Assinar.css";

function Assinar() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [plano, setPlano] = useState(null);
  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarPlano() {
      if (!usuario) {
        navigate("/login", { replace: true });
        return;
      }

      const codigoPlano = localStorage.getItem(
        "marcatalog-plano-selecionado"
      );

      if (!codigoPlano) {
        setCarregando(false);
        return;
      }

      const { data, error } = await supabase
        .from("planos")
        .select("*")
        .eq("codigo", codigoPlano)
        .eq("ativo", true)
        .maybeSingle();

      if (error || !data) {
        setErro("Não foi possível carregar o plano selecionado.");
        setCarregando(false);
        return;
      }

      setPlano(data);

      const nomeSalvo =
        usuario.user_metadata?.nome ||
        usuario.user_metadata?.name ||
        "";

      setNome(nomeSalvo);
      setCarregando(false);
    }

    carregarPlano();
  }, [usuario, navigate]);

  function formatarDocumento(valor) {
    const numeros = valor.replace(/\D/g, "").slice(0, 14);

    if (numeros.length <= 11) {
      return numeros
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }

    return numeros
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  }

  function alterarDocumento(evento) {
    setCpfCnpj(formatarDocumento(evento.target.value));
  }

  function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  async function continuarPagamento(evento) {
    evento.preventDefault();

    setErro("");

    if (!plano) {
      setErro("Escolha um plano antes de continuar.");
      return;
    }

    if (nome.trim().length < 3) {
      setErro("Informe seu nome completo.");
      return;
    }

    const documentoNumeros = cpfCnpj.replace(/\D/g, "");

    if (
      documentoNumeros.length !== 11 &&
      documentoNumeros.length !== 14
    ) {
      setErro("Informe um CPF ou CNPJ válido.");
      return;
    }

    setEnviando(true);

    const { data, error } = await supabase.functions.invoke(
      "criar-assinatura",
      {
        body: {
          planoId: plano.id,
          nome: nome.trim(),
          cpfCnpj: documentoNumeros,
        },
      }
    );

    if (error) {
      let mensagem =
        "Não foi possível iniciar o pagamento. Tente novamente.";

      try {
        const respostaErro = await error.context.json();

        if (respostaErro?.erro) {
          mensagem = respostaErro.erro;
        }
      } catch {
        // Mantém a mensagem padrão.
      }

      setErro(mensagem);
      setEnviando(false);
      return;
    }

    if (!data?.linkPagamento) {
      setErro("O link de pagamento não foi encontrado.");
      setEnviando(false);
      return;
    }

    window.location.href = data.linkPagamento;
  }

  if (carregando) {
    return (
      <main className="assinar-pagina">
        <section className="assinar-carregando">
          <div />
          <p>Preparando sua assinatura...</p>
        </section>
      </main>
    );
  }

  if (!plano) {
    return (
      <main className="assinar-pagina">
        <section className="assinar-sem-plano">
          <CalendarDays size={38} />

          <h1>Nenhum plano selecionado</h1>

          <p>
            Escolha o plano mensal ou anual antes de continuar.
          </p>

          <button type="button" onClick={() => navigate("/planos")}>
            Ver planos
            <ArrowRight size={18} />
          </button>
        </section>
      </main>
    );
  }

  const planoAnual = plano.periodicidade === "anual";

  return (
    <main className="assinar-pagina">
      <header className="assinar-header">
        <button
          className="assinar-logo"
          type="button"
          onClick={() => navigate("/")}
        >
          <span>
            <Store size={22} />
          </span>

          Marcatalog
        </button>

        <button
          className="assinar-voltar"
          type="button"
          onClick={() => navigate("/planos")}
        >
          <ArrowLeft size={18} />
          Voltar aos planos
        </button>
      </header>

      <section className="assinar-conteudo">
        <div className="assinar-formulario-area">
          <div className="assinar-titulo">
            <span>
              <LockKeyhole size={21} />
            </span>

            <div>
              <p>Finalizar assinatura</p>
              <h1>Complete seus dados.</h1>
            </div>
          </div>

          <p className="assinar-descricao">
            Essas informações serão utilizadas para gerar sua
            cobrança com segurança no Asaas.
          </p>

          <form onSubmit={continuarPagamento}>
            <label htmlFor="nome">
              Nome completo ou razão social
            </label>

            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              placeholder="Digite seu nome completo"
              autoComplete="name"
              disabled={enviando}
            />

            <label htmlFor="documento">CPF ou CNPJ</label>

            <input
              id="documento"
              type="text"
              inputMode="numeric"
              value={cpfCnpj}
              onChange={alterarDocumento}
              placeholder="000.000.000-00"
              disabled={enviando}
            />

            <div className="assinar-email">
              <span>E-mail da assinatura</span>
              <strong>{usuario?.email}</strong>
            </div>

            {erro && <p className="assinar-erro">{erro}</p>}

            <button
              className="assinar-continuar"
              type="submit"
              disabled={enviando}
            >
              {enviando ? (
                "Preparando pagamento..."
              ) : (
                <>
                  Continuar para pagamento
                  <ArrowRight size={19} />
                </>
              )}
            </button>
          </form>

          <div className="assinar-seguranca">
            <ShieldCheck size={19} />

            <p>
              Seus dados de pagamento serão preenchidos diretamente
              no ambiente seguro do Asaas.
            </p>
          </div>
        </div>

        <aside className="assinar-resumo">
          <div className="assinar-resumo-topo">
            <span>
              <CreditCard size={22} />
            </span>

            <p>Resumo da assinatura</p>
          </div>

          <div className="assinar-plano">
            <div>
              <span>Plano escolhido</span>
              <h2>{plano.nome}</h2>
            </div>

            <button
              type="button"
              onClick={() => navigate("/planos")}
            >
              Alterar
            </button>
          </div>

          <ul>
            <li>
              <CheckCircle2 size={18} />
              Catálogo com link exclusivo
            </li>

            <li>
              <CheckCircle2 size={18} />
              Produtos e variações
            </li>

            <li>
              <CheckCircle2 size={18} />
              Carrinho e orçamento pelo WhatsApp
            </li>

            <li>
              <CheckCircle2 size={18} />
              Painel administrativo completo
            </li>
          </ul>

          <div className="assinar-total">
            <div>
              <span>Total</span>

              <small>
                Cobrança {planoAnual ? "anual" : "mensal"}
              </small>
            </div>

            <strong>{formatarPreco(plano.preco)}</strong>
          </div>

          <p className="assinar-renovacao">
            A assinatura será renovada automaticamente a cada{" "}
            {planoAnual ? "ano" : "mês"}.
          </p>
        </aside>
      </section>
    </main>
  );
}

export default Assinar;