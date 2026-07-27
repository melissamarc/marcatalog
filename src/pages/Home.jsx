import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  MessageCircle,
  ShoppingBag,
  Store,
} from "lucide-react";
import "./Home.css";

function Home() {
  return (
    <main className="home">
      <header className="home-header">
        <Link to="/" className="home-logo">
          <span className="home-logo-icone">
            <Store size={23} />
          </span>

          <span>Marcatalog</span>
        </Link>

        <nav className="home-navegacao">
          <a href="#recursos">Recursos</a>
          <a href="#como-funciona">Como funciona</a>
        </nav>

        <div className="home-acoes">
          <Link to="/login" className="botao-entrar">
            Entrar
          </Link>

          <Link to="/cadastro" className="botao-cereja">
            Criar meu catálogo
          </Link>
        </div>
      </header>

      <section className="home-hero">
        <div className="home-conteudo">
          <div className="home-destaque">
            <span />
            Seu negócio merece um catálogo profissional
          </div>

          <h1>
            Seus produtos.
            <br />
            Sua marca.
            <br />
            <span>Seu catálogo.</span>
          </h1>

          <p className="home-descricao">
            Crie um catálogo digital com carrinho de compras e
            receba os pedidos diretamente pelo WhatsApp.
          </p>

          <div className="home-hero-acoes">
            <Link to="/cadastro" className="botao-cereja botao-grande">
              Criar meu catálogo
              <ArrowRight size={19} />
            </Link>

            <a href="#como-funciona" className="botao-secundario">
              Ver como funciona
            </a>
          </div>

          <div className="home-beneficios">
            <span>
              <Check size={16} />
              Fácil de configurar
            </span>

            <span>
              <Check size={16} />
              Link exclusivo
            </span>

            <span>
              <Check size={16} />
              Sem pagamento online
            </span>
          </div>
        </div>

        <div className="home-demonstracao">
          <div className="demonstracao-brilho" />

          <div className="demonstracao-painel">
            <aside>
              <div className="demonstracao-marca">
                <ShoppingBag size={18} />
                Minha loja
              </div>

              <div className="demonstracao-menu ativo">
                Visão geral
              </div>

              <div className="demonstracao-menu">
                Produtos
              </div>

              <div className="demonstracao-menu">
                Configurações
              </div>
            </aside>

            <div className="demonstracao-conteudo">
              <div className="demonstracao-topo">
                <div>
                  <small>Painel administrativo</small>
                  <strong>Olá, sua loja!</strong>
                </div>

                <span className="demonstracao-avatar">
                  ML
                </span>
              </div>

              <div className="demonstracao-numeros">
                <div>
                  <small>Produtos</small>
                  <strong>128</strong>
                  <span>+12 este mês</span>
                </div>

                <div>
                  <small>Disponíveis</small>
                  <strong>115</strong>
                  <span>89% do catálogo</span>
                </div>

                <div>
                  <small>Esgotados</small>
                  <strong>13</strong>
                  <span>Atualize o estoque</span>
                </div>
              </div>

              <div className="demonstracao-produtos">
                <div className="produto-miniatura cereja" />

                <div>
                  <strong>Produtos recentes</strong>
                  <small>Seu catálogo sempre atualizado</small>
                </div>

                <div className="produto-miniatura bege" />

                <div className="produto-miniatura escura" />
              </div>
            </div>
          </div>

          <div className="demonstracao-whatsapp">
            <span>
              <MessageCircle size={21} />
            </span>

            <div>
              <small>Novo orçamento</small>
              <strong>3 produtos · R$ 249,90</strong>
            </div>

            <span className="status-online" />
          </div>
        </div>
      </section>

      <section id="recursos" className="home-recursos">
        <article>
          <ShoppingBag size={25} />
          <h2>Catálogo completo</h2>
          <p>
            Produtos, imagens, categorias, marcas e variações.
          </p>
        </article>

        <article>
          <Store size={25} />
          <h2>Sua própria marca</h2>
          <p>
            Nome, logotipo e um endereço exclusivo para divulgar.
          </p>
        </article>

        <article>
          <MessageCircle size={25} />
          <h2>Pedidos no WhatsApp</h2>
          <p>
            O cliente monta o carrinho e envia o orçamento pronto.
          </p>
        </article>
      </section>

      <section id="como-funciona" className="home-como-funciona">
        <p>Comece em poucos passos</p>
        <h2>Você cadastra. Compartilha. Vende.</h2>
      </section>
    </main>
  );
}

export default Home;