import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  Boxes,
  CheckCircle2,
  Copy,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Package,
  PackagePlus,
  Settings,
  Store,
  Tags,
  XCircle,
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import "./Admin.css";

function Admin() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [empresa, setEmpresa] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [linkCopiado, setLinkCopiado] = useState(false);

  useEffect(() => {
    async function carregarPainel() {
      const { data: dadosEmpresa, error: erroEmpresa } =
        await supabase
          .from("empresas")
          .select("*")
          .eq("usuario_id", usuario.id)
          .maybeSingle();

      if (erroEmpresa) {
        setErro("Não foi possível carregar a empresa.");
        setCarregando(false);
        return;
      }

      if (!dadosEmpresa) {
        navigate("/criar-empresa", { replace: true });
        return;
      }

      const { data: dadosProdutos, error: erroProdutos } =
        await supabase
          .from("produtos")
          .select("id, categoria, esgotado, ativo")
          .eq("empresa_id", dadosEmpresa.id);

      if (erroProdutos) {
        setErro("Não foi possível carregar os produtos.");
        setCarregando(false);
        return;
      }

      setEmpresa(dadosEmpresa);
      setProdutos(dadosProdutos ?? []);
      setCarregando(false);
    }

    carregarPainel();
  }, [usuario, navigate]);

  async function sair() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  async function copiarLink() {
    const link = `${window.location.origin}/catalogo/${empresa.slug}`;

    await navigator.clipboard.writeText(link);

    setLinkCopiado(true);

    setTimeout(() => {
      setLinkCopiado(false);
    }, 2000);
  }

  if (carregando) {
    return (
      <main className="admin-carregando">
        <div className="admin-spinner" />
        <p>Carregando painel...</p>
      </main>
    );
  }

  if (erro) {
    return <p className="admin-erro">{erro}</p>;
  }

  const totalProdutos = produtos.length;

  const produtosDisponiveis = produtos.filter(
    (produto) => produto.ativo && !produto.esgotado
  ).length;

  const produtosEsgotados = produtos.filter(
    (produto) => produto.ativo && produto.esgotado
  ).length;

  const produtosInativos = produtos.filter(
    (produto) => !produto.ativo
  ).length;

  const totalCategorias = new Set(
    produtos
      .map((produto) => produto.categoria)
      .filter(Boolean)
  ).size;

  const linkCatalogo = `${window.location.origin}/catalogo/${empresa.slug}`;

  const mensagemSuporte = encodeURIComponent(
    `Olá! Preciso de ajuda com o catálogo da empresa ${empresa.nome}.`
  );

  const linkSuporte = `https://wa.me/5511939412790?text=${mensagemSuporte}`;

  function abrirSuporte() {
    window.location.href = linkSuporte;
  }

  return (
    <main className="admin-pagina">
      <aside className="admin-sidebar">
        <div>
          <div className="admin-marca">
            <span>
              <Store size={22} />
            </span>

            Marcatalog
          </div>

          <nav className="admin-menu">
            <button className="ativo" type="button">
              <LayoutDashboard size={19} />
              Visão geral
            </button>

            <button
              type="button"
              onClick={() => navigate("/admin/produtos")}
            >
              <Package size={19} />
              Produtos
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/admin/produtos/novo")
              }
            >
              <PackagePlus size={19} />
              Adicionar produto
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/admin/configuracoes")
              }
            >
              <Settings size={19} />
              Configurações
            </button>

            <button
              type="button"
              onClick={abrirSuporte}
            >
              <MessageCircle size={19} />
              Suporte
            </button>
          </nav>
        </div>

        <div className="admin-sidebar-final">
          <div className="admin-empresa-resumo">
            {empresa.logo_url ? (
              <img
                src={empresa.logo_url}
                alt={`Logo da ${empresa.nome}`}
              />
            ) : (
              <span>
                {empresa.nome.charAt(0).toUpperCase()}
              </span>
            )}

            <div>
              <strong>{empresa.nome}</strong>
              <small>{usuario.email}</small>
            </div>
          </div>

          <button
            className="admin-sair"
            type="button"
            onClick={sair}
          >
            <LogOut size={18} />
            Sair da conta
          </button>
        </div>
      </aside>

      <section className="admin-conteudo">
        <header className="admin-topo">
          <div>
            <p>Visão geral</p>
            <h1>Olá, {empresa.nome}!</h1>
            <span>
              Acompanhe e gerencie seu catálogo digital.
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/admin/produtos/novo")
            }
          >
            <PackagePlus size={19} />
            Adicionar produto
          </button>
        </header>

        <section className="admin-estatisticas">
          <article>
            <span className="icone cereja">
              <Boxes size={21} />
            </span>

            <div>
              <p>Produtos cadastrados</p>
              <strong>{totalProdutos}</strong>
            </div>
          </article>

          <article>
            <span className="icone verde">
              <CheckCircle2 size={21} />
            </span>

            <div>
              <p>Disponíveis</p>
              <strong>{produtosDisponiveis}</strong>
            </div>
          </article>

          <article>
            <span className="icone vermelho">
              <XCircle size={21} />
            </span>

            <div>
              <p>Esgotados</p>
              <strong>{produtosEsgotados}</strong>
            </div>
          </article>

          <article>
            <span className="icone bege">
              <Archive size={21} />
            </span>

            <div>
              <p>Inativos</p>
              <strong>{produtosInativos}</strong>
            </div>
          </article>

          <article>
            <span className="icone bege">
              <Tags size={21} />
            </span>

            <div>
              <p>Categorias</p>
              <strong>{totalCategorias}</strong>
            </div>
          </article>
        </section>

        <section className="admin-link-card">
          <div className="admin-link-icone">
            <Store size={25} />
          </div>

          <div className="admin-link-informacao">
            <p>Link do seu catálogo</p>
            <h2>Compartilhe sua vitrine</h2>
            <span>
              Seus clientes não precisam criar uma conta para
              acessar.
            </span>

            <div className="admin-link-campo">
              <p>{linkCatalogo}</p>

              <button type="button" onClick={copiarLink}>
                <Copy size={17} />

                {linkCopiado ? "Copiado!" : "Copiar"}
              </button>
            </div>
          </div>

          <a
            className="admin-abrir-catalogo"
            href={linkCatalogo}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={18} />
            Abrir catálogo
          </a>
        </section>

        <section className="admin-acoes">
          <div className="admin-secao-titulo">
            <div>
              <p>Acesso rápido</p>
              <h2>O que deseja fazer?</h2>
            </div>
          </div>

          <div className="admin-acoes-grid">
            <button
              type="button"
              onClick={() =>
                navigate("/admin/produtos/novo")
              }
            >
              <span>
                <PackagePlus size={23} />
              </span>

              <div>
                <strong>Adicionar produto</strong>
                <small>
                  Cadastre um novo item no catálogo
                </small>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate("/admin/produtos")}
            >
              <span>
                <Package size={23} />
              </span>

              <div>
                <strong>Gerenciar produtos</strong>
                <small>
                  Edite preços e disponibilidade
                </small>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/admin/configuracoes")
              }
            >
              <span>
                <Settings size={23} />
              </span>

              <div>
                <strong>Configurações</strong>
                <small>
                  Atualize os dados da empresa
                </small>
              </div>
            </button>

            <button
              type="button"
              onClick={abrirSuporte}
            >
              <span>
                <MessageCircle size={23} />
              </span>

              <div>
                <strong>Falar com o suporte</strong>
                <small>
                  Tire dúvidas sobre seu catálogo
                </small>
              </div>
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default Admin;