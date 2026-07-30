import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Filter,
  PackageSearch,
  Search,
  Store,
} from "lucide-react";
import { supabase } from "../services/supabase";
import Carrinho from "../components/Carrinho";
import ProdutoCatalogo from "../components/ProdutoCatalogo";
import "./Catalogo.css";

function Catalogo() {
  const { slug } = useParams();

  const [empresa, setEmpresa] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [marca, setMarca] = useState("");
  const [ordenacao, setOrdenacao] = useState("recentes");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
const [vendedores, setVendedores] = useState([]);

  useEffect(() => {
    async function carregarCatalogo() {
      setCarregando(true);
      setErro("");

      const { data: dadosEmpresa, error: erroEmpresa } =
        await supabase
          .from("empresas")
          .select("*")
          .eq("slug", slug)
          .eq("ativo", true)
          .single();

      if (erroEmpresa || !dadosEmpresa) {
        setErro("Catálogo não encontrado.");
        setCarregando(false);
        return;
      }

      const { data: dadosProdutos, error: erroProdutos } =
        await supabase
          .from("produtos")
          .select("*, variacoes_produto(*)")
          .eq("empresa_id", dadosEmpresa.id)
          .eq("ativo", true)
          .order("criado_em", { ascending: false });

      if (erroProdutos) {
        setErro("Não foi possível carregar os produtos.");
        setCarregando(false);
        return;
      }

      const { data: dadosVendedores, error: erroVendedores } =
  await supabase
    .from("vendedores")
    .select("id, nome, whatsapp")
    .eq("empresa_id", dadosEmpresa.id)
    .eq("ativo", true)
    .order("nome", { ascending: true });

if (erroVendedores) {
  setErro("Não foi possível carregar os vendedores.");
  setCarregando(false);
  return;
}

      setEmpresa(dadosEmpresa);
      setProdutos(dadosProdutos ?? []);
      setVendedores(dadosVendedores ?? []);
      setCarregando(false);
    }

    carregarCatalogo();
  }, [slug]);

  const categorias = useMemo(() => {
    return [
      ...new Set(
        produtos
          .map((produto) => produto.categoria)
          .filter(Boolean)
      ),
    ].sort((categoriaA, categoriaB) =>
      categoriaA.localeCompare(categoriaB, "pt-BR")
    );
  }, [produtos]);

  const marcas = useMemo(() => {
    return [
      ...new Set(
        produtos
          .map((produto) => produto.marca)
          .filter(Boolean)
      ),
    ].sort((marcaA, marcaB) =>
      marcaA.localeCompare(marcaB, "pt-BR")
    );
  }, [produtos]);

  const produtosFiltrados = useMemo(() => {
    const buscaNormalizada = busca
      .toLocaleLowerCase("pt-BR")
      .trim();

    const produtosEncontrados = produtos.filter(
      (produto) => {
        const nome = produto.nome
          ?.toLocaleLowerCase("pt-BR") ?? "";

        const descricao = produto.descricao
          ?.toLocaleLowerCase("pt-BR") ?? "";

        const correspondeBusca =
          !buscaNormalizada ||
          nome.includes(buscaNormalizada) ||
          descricao.includes(buscaNormalizada);

        const correspondeCategoria =
          !categoria || produto.categoria === categoria;

        const correspondeMarca =
          !marca || produto.marca === marca;

        return (
          correspondeBusca &&
          correspondeCategoria &&
          correspondeMarca
        );
      }
    );

    return [...produtosEncontrados].sort(
      (produtoA, produtoB) => {
        if (ordenacao === "antigos") {
          return (
            new Date(produtoA.criado_em).getTime() -
            new Date(produtoB.criado_em).getTime()
          );
        }

        if (ordenacao === "menor-preco") {
          return (
            Number(produtoA.preco ?? 0) -
            Number(produtoB.preco ?? 0)
          );
        }

        if (ordenacao === "maior-preco") {
          return (
            Number(produtoB.preco ?? 0) -
            Number(produtoA.preco ?? 0)
          );
        }

        if (ordenacao === "nome") {
          return (produtoA.nome ?? "").localeCompare(
            produtoB.nome ?? "",
            "pt-BR"
          );
        }

        return (
          new Date(produtoB.criado_em).getTime() -
          new Date(produtoA.criado_em).getTime()
        );
      }
    );
  }, [produtos, busca, categoria, marca, ordenacao]);

  function limparFiltros() {
    setBusca("");
    setCategoria("");
    setMarca("");
    setOrdenacao("recentes");
  }

  if (carregando) {
    return (
      <main className="catalogo-carregando">
        <div />

        <p>Carregando catálogo...</p>
      </main>
    );
  }

  if (erro || !empresa) {
    return (
      <main className="catalogo-nao-encontrado">
        <Store size={40} />

        <h1>Marcatalog</h1>

        <p>{erro || "Catálogo não encontrado."}</p>
      </main>
    );
  }

  const possuiFiltros =
    busca ||
    categoria ||
    marca ||
    ordenacao !== "recentes";

  return (
    <main
      className={`catalogo-pagina catalogo-tema-${
        empresa.tema_catalogo ?? "claro"
      } catalogo-cor-${
        empresa.cor_catalogo ?? "cereja"
      }`}
    >
      <header className="catalogo-header">
        <div className="catalogo-header-conteudo">
          <div className="catalogo-empresa">
            {empresa.logo_url ? (
              <div className="catalogo-logo">
                <img
                  src={empresa.logo_url}
                  alt={`Logotipo da ${empresa.nome}`}
                />
              </div>
            ) : (
              <div className="catalogo-logo catalogo-logo-padrao">
                <Store size={26} />
              </div>
            )}

            <div>
              <small>Catálogo digital</small>

              <h1>{empresa.nome}</h1>
            </div>
          </div>

         <Carrinho
  empresa={empresa}
  vendedores={vendedores}
/>
        </div>
      </header>

      <section className="catalogo-filtros-container">
        <div className="catalogo-busca">
          <Search size={20} />

          <input
            type="search"
            value={busca}
            onChange={(evento) =>
              setBusca(evento.target.value)
            }
            placeholder="O que você está procurando?"
            aria-label="Pesquisar produtos"
          />
        </div>

        <div className="catalogo-filtros">
          <span>
            <Filter size={18} />
            Filtros
          </span>

          <select
            value={categoria}
            onChange={(evento) =>
              setCategoria(evento.target.value)
            }
            aria-label="Filtrar por categoria"
          >
            <option value="">Todas as categorias</option>

            {categorias.map((nomeCategoria) => (
              <option
                key={nomeCategoria}
                value={nomeCategoria}
              >
                {nomeCategoria}
              </option>
            ))}
          </select>

          <select
            value={marca}
            onChange={(evento) =>
              setMarca(evento.target.value)
            }
            aria-label="Filtrar por marca"
          >
            <option value="">Todas as marcas</option>

            {marcas.map((nomeMarca) => (
              <option
                key={nomeMarca}
                value={nomeMarca}
              >
                {nomeMarca}
              </option>
            ))}
          </select>

          <select
            value={ordenacao}
            onChange={(evento) =>
              setOrdenacao(evento.target.value)
            }
            aria-label="Ordenar produtos"
          >
            <option value="recentes">
              Mais recentes
            </option>

            <option value="antigos">
              Mais antigos
            </option>

            <option value="menor-preco">
              Menor preço
            </option>

            <option value="maior-preco">
              Maior preço
            </option>

            <option value="nome">
              Nome de A a Z
            </option>
          </select>

          {possuiFiltros && (
            <button
              type="button"
              onClick={limparFiltros}
            >
              Limpar
            </button>
          )}
        </div>
      </section>

      <section className="catalogo-produtos-secao">
        <div className="catalogo-produtos-topo">
          <div>
            <p>Nossa seleção</p>

            <h2>Produtos</h2>
          </div>

          <span>
            {produtosFiltrados.length}{" "}
            {produtosFiltrados.length === 1
              ? "produto"
              : "produtos"}
          </span>
        </div>

        {produtosFiltrados.length === 0 ? (
          <div className="catalogo-vazio">
            <span>
              <PackageSearch size={34} />
            </span>

            <h3>Nenhum produto encontrado</h3>

            <p>
              Tente pesquisar outro nome ou remova os filtros.
            </p>

            <button
              type="button"
              onClick={limparFiltros}
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="catalogo-produtos-grid">
            {produtosFiltrados.map((produto) => (
              <ProdutoCatalogo
                key={produto.id}
                produto={produto}
                empresa={empresa}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="catalogo-footer">
        <div>
          {empresa.logo_url ? (
            <img
              src={empresa.logo_url}
              alt={`Logotipo da ${empresa.nome}`}
            />
          ) : (
            <Store size={22} />
          )}

          <strong>{empresa.nome}</strong>
        </div>

        <p>
          Catálogo criado com <span>Marcatalog</span>
        </p>
      </footer>
    </main>
  );
}

export default Catalogo;