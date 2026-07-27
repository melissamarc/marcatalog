import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Crown,
  MessageCircle,
  Sparkles,
  Store,
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import "./Planos.css";

function Planos() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [planos, setPlanos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function buscarPlanos() {
      const { data, error } = await supabase
        .from("planos")
        .select("*")
        .eq("ativo", true)
        .order("preco", { ascending: true });

      if (error) {
        setErro("Não foi possível carregar os planos.");
        setCarregando(false);
        return;
      }

      setPlanos(data ?? []);
      setCarregando(false);
    }

    buscarPlanos();
  }, []);

  function escolherPlano(plano) {
    localStorage.setItem(
      "marcatalog-plano-selecionado",
      plano.codigo
    );

    if (usuario) {
      navigate("/assinar");
    } else {
      navigate("/cadastro");
    }
  }

  function solicitarMontagem() {
    localStorage.setItem(
      "marcatalog-servico-selecionado",
      "montagem-personalizada"
    );

    if (usuario) {
      navigate("/assinar");
    } else {
      navigate("/cadastro");
    }
  }

  function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <main className="planos-pagina">
      <header className="planos-header">
        <button
          className="planos-logo"
          type="button"
          onClick={() => navigate("/")}
        >
          <span>
            <Store size={23} />
          </span>

          Marcatalog
        </button>

        <button
          className="planos-entrar"
          type="button"
          onClick={() =>
            navigate(usuario ? "/admin" : "/login")
          }
        >
          {usuario ? "Acessar painel" : "Entrar"}
        </button>
      </header>

      <section className="planos-apresentacao">
        <div className="planos-etiqueta">
          <Sparkles size={16} />
          Planos simples e transparentes
        </div>

        <h1>Escolha como manter seu catálogo ativo.</h1>

        <p>
          Sem taxas sobre as vendas e sem comissão nos pedidos.
          Escolha o plano que combina com seu negócio.
        </p>
      </section>

      {carregando ? (
        <section className="planos-carregando">
          <div />
          <p>Carregando planos...</p>
        </section>
      ) : erro ? (
        <p className="planos-erro">{erro}</p>
      ) : (
        <section className="planos-grid">
          {planos.map((plano) => {
            const planoAnual =
              plano.periodicidade === "anual";

            return (
              <article
                className={
                  planoAnual
                    ? "plano-card destaque"
                    : "plano-card"
                }
                key={plano.id}
              >
                {planoAnual && (
                  <div className="plano-recomendado">
                    <Crown size={15} />
                    Melhor escolha
                  </div>
                )}

                <span className="plano-icone">
                  <CalendarDays size={24} />
                </span>

                <p className="plano-periodicidade">
                  Plano {plano.periodicidade}
                </p>

                <h2>{plano.nome}</h2>

                <div className="plano-preco">
                  <strong>{formatarPreco(plano.preco)}</strong>

                  <span>
                    /{planoAnual ? "ano" : "mês"}
                  </span>
                </div>

                {planoAnual ? (
                  <p className="plano-economia">
                    Equivale a R$ 33,25 por mês
                  </p>
                ) : (
                  <p className="plano-economia">
                    Cancele quando quiser
                  </p>
                )}

                <ul>
                  <li>
                    <Check size={17} />
                    Catálogo público com link exclusivo
                  </li>

                  <li>
                    <Check size={17} />
                    Produtos e categorias
                  </li>

                  <li>
                    <Check size={17} />
                    Variações de produtos
                  </li>

                  <li>
                    <Check size={17} />
                    Carrinho de compras
                  </li>

                  <li>
                    <Check size={17} />
                    Pedidos enviados pelo WhatsApp
                  </li>

                  <li>
                    <Check size={17} />
                    Painel administrativo
                  </li>
                </ul>

                <button
                  type="button"
                  onClick={() => escolherPlano(plano)}
                >
                  Escolher plano {plano.periodicidade}
                  <ArrowRight size={18} />
                </button>
              </article>
            );
          })}
        </section>
      )}

      <section className="planos-montagem">
        <div className="planos-montagem-icone">
          <MessageCircle size={27} />
        </div>

        <div>
          <p>Não quer cadastrar tudo sozinha?</p>

          <h2>Contrate a montagem personalizada.</h2>

          <span>
            Nós configuramos sua empresa e cadastramos até 50
            produtos a partir de R$ 500.
          </span>
        </div>

        <button type="button" onClick={solicitarMontagem}>
          Solicitar montagem
          <ArrowRight size={18} />
        </button>
      </section>

      <footer className="planos-footer">
        <p>
          A montagem personalizada não substitui a assinatura
          mensal ou anual.
        </p>
      </footer>
    </main>
  );
}

export default Planos;