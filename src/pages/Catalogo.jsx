import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  PackageSearch,
  Search,
  SlidersHorizontal,
  Star,
  Store,
  X,
} from "lucide-react";
import { supabase } from "../services/supabase";
import {
  jaRegistrouVisita,
  registrarEvento,
} from "../services/eventos";
import {
  calcularPreco,
  formatarPreco,
} from "../utils/precos";
import Carrinho from "../components/Carrinho";
import ProdutoCatalogo from "../components/ProdutoCatalogo";
import ModalProduto from "../components/ModalProduto";
import "./Catalogo.css";
import "./CatalogoExtras.css";

const CATEGORIA_DESTAQUES = "__destaques__";

function Catalogo() {
  const { slug } = useParams();

  const [empresa, setEmpresa] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [marca, setMarca] = useState("");
  const [ordenacao, setOrdenacao] = useState("recentes");
  const [painelAberto, setPainelAberto] = useState(false);
  const [precoMax, setPrecoMax] = useState(null);
  const [apenasDisponiveis, setApenasDisponiveis] =
    useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [detalhe, setDetalhe] = useState(null);
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

      if (!jaRegistrouVisita(dadosEmpresa.id)) {
        registrarEvento(dadosEmpresa.id, "visita");
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

  const possuiDestaques = useMemo(
    () =>
      produtos.some(
        (produto) => produto.selo === "destaque"
      ),
    [produtos]
  );

  const precoTeto = useMemo(() => {
    const maior = produtos.reduce(
      (maximo, produto) =>
        Math.max(
          maximo,
          calcularPreco(produto).precoFinal
        ),
      0
    );

    return Math.ceil(maior);
  }, [produtos]);

  const limitePreco =
    precoMax === null ? precoTeto : precoMax;

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
          !categoria ||
          (categoria === CATEGORIA_DESTAQUES
            ? produto.selo === "destaque"
            : produto.categoria === categoria);

        const correspondeMarca =
          !marca || produto.marca === marca;

        const correspondePreco =
          precoMax === null ||
          calcularPreco(produto).precoFinal <=
            precoMax;

        const correspondeDisponibilidade =
          !apenasDisponiveis || !produto.esgotado;

        return (
          correspondeBusca &&
          correspondeCategoria &&
          correspondeMarca &&
          correspondePreco &&
          correspondeDisponibilidade
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
            calcularPreco(produtoA).precoFinal -
            calcularPreco(produtoB).precoFinal
          );
        }

        if (ordenacao === "maior-preco") {
          return (
            calcularPreco(produtoB).precoFinal -
            calcularPreco(produtoA).precoFinal
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
  }, [
    produtos,
    busca,
    categoria,
    marca,
    precoMax,
    apenasDisponiveis,
    ordenacao,
  ]);

  // Métrica: busca que não encontrou nenhum produto
  useEffect(() => {
    const termo = busca.trim();

    if (
      !empresa ||
      termo.length < 3 ||
      produtosFiltrados.length > 0
    ) {
      return undefined;
    }

    const temporizador = setTimeout(() => {
      registrarEvento(empresa.id, "busca_sem_resultado", {
        termo,
      });
    }, 1500);

    return () => clearTimeout(temporizador);
  }, [busca, empresa, produtosFiltrados.length]);

  // Fecha o painel de filtros com a tecla Esc
  useEffect(() => {
    if (!painelAberto) {
      return undefined;
    }

    function aoPressionar(evento) {
      if (evento.key === "Escape") {
        setPainelAberto(false);
      }
    }

    window.addEventListener("keydown", aoPressionar);

    return () =>
      window.removeEventListener("keydown", aoPressionar);
  }, [painelAberto]);

  function limparFiltros() {
    setBusca("");
    setCategoria("");
    setMarca("");
    setOrdenacao("recentes");
    setPrecoMax(null);
    setApenasDisponiveis(false);
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

  const produtoAberto = detalhe
    ? produtos.find(
        (produto) => produto.id === detalhe.produtoId
      )
    : null;

  const filtrosNoPainel =
    (marca ? 1 : 0) +
    (precoMax !== null && precoMax < precoTeto ? 1 : 0) +
    (apenasDisponiveis ? 1 : 0) +
    (ordenacao !== "recentes" ? 1 : 0);

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
          <button
            className="catalogo-botao-filtros"
            type="button"
            onClick={() => setPainelAberto(true)}
          >
            <SlidersHorizontal size={18} />
            Filtros
            {filtrosNoPainel > 0 && (
              <strong>{filtrosNoPainel}</strong>
            )}
          </button>
        </div>
      </section>

      <nav
        className="catalogo-categorias"
        aria-label="Categorias"
      >
        <button
          className={!categoria ? "ativa" : ""}
          type="button"
          onClick={() => setCategoria("")}
        >
          Todos
        </button>

        {possuiDestaques && (
          <button
            className={
              categoria === CATEGORIA_DESTAQUES
                ? "ativa"
                : ""
            }
            type="button"
            onClick={() =>
              setCategoria(CATEGORIA_DESTAQUES)
            }
          >
            <Star size={14} />
            Destaques
          </button>
        )}

        {categorias.map((nomeCategoria) => (
          <button
            className={
              categoria === nomeCategoria ? "ativa" : ""
            }
            key={nomeCategoria}
            type="button"
            onClick={() => setCategoria(nomeCategoria)}
          >
            {nomeCategoria}
          </button>
        ))}
      </nav>

      <div
        className={
          painelAberto
            ? "catalogo-painel-fundo aberto"
            : "catalogo-painel-fundo"
        }
        onClick={() => setPainelAberto(false)}
      />

      <aside
        className={
          painelAberto
            ? "catalogo-painel-filtros aberto"
            : "catalogo-painel-filtros"
        }
        aria-label="Filtros"
        aria-hidden={!painelAberto}
      >
        <header>
          <h2>Filtros</h2>

          <button
            type="button"
            onClick={() => setPainelAberto(false)}
            aria-label="Fechar filtros"
          >
            <X size={20} />
          </button>
        </header>

        <div className="catalogo-painel-corpo">
          <div className="catalogo-painel-grupo">
            <label htmlFor="filtro-ordenacao">
              Ordenar por
            </label>

            <select
              id="filtro-ordenacao"
              value={ordenacao}
              onChange={(evento) =>
                setOrdenacao(evento.target.value)
              }
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
              <option value="nome">Nome de A a Z</option>
            </select>
          </div>

          {marcas.length > 0 && (
            <div className="catalogo-painel-grupo">
              <label htmlFor="filtro-marca">Marca</label>

              <select
                id="filtro-marca"
                value={marca}
                onChange={(evento) =>
                  setMarca(evento.target.value)
                }
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
            </div>
          )}

          {precoTeto > 0 && (
            <div className="catalogo-painel-grupo">
              <label htmlFor="filtro-preco">
                Preço até{" "}
                <strong>
                  {precoMax === null ||
                  precoMax >= precoTeto
                    ? "sem limite"
                    : formatarPreco(limitePreco)}
                </strong>
              </label>

              <input
                id="filtro-preco"
                type="range"
                min="0"
                max={precoTeto}
                step={precoTeto > 200 ? 5 : 1}
                value={limitePreco}
                onChange={(evento) => {
                  const valor = Number(
                    evento.target.value
                  );

                  setPrecoMax(
                    valor >= precoTeto ? null : valor
                  );
                }}
              />
            </div>
          )}

          <label className="catalogo-painel-check">
            <input
              type="checkbox"
              checked={apenasDisponiveis}
              onChange={(evento) =>
                setApenasDisponiveis(
                  evento.target.checked
                )
              }
            />
            Mostrar só produtos disponíveis
          </label>
        </div>

        <footer>
          <button
            className="secundario"
            type="button"
            onClick={limparFiltros}
          >
            Limpar filtros
          </button>

          <button
            type="button"
            onClick={() => setPainelAberto(false)}
          >
            Ver {produtosFiltrados.length}{" "}
            {produtosFiltrados.length === 1
              ? "produto"
              : "produtos"}
          </button>
        </footer>
      </aside>

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
                onAbrir={
                  empresa.recursos_novos
                    ? (produtoClicado, variacaoId) =>
                        setDetalhe({
                          produtoId: produtoClicado.id,
                          variacaoId,
                        })
                    : undefined
                }
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

      {empresa.recursos_novos && produtoAberto && (
        <ModalProduto
          key={produtoAberto.id}
          produto={produtoAberto}
          empresa={empresa}
          variacaoInicialId={detalhe.variacaoId}
          aoFechar={() => setDetalhe(null)}
        />
      )}
    </main>
  );
}

export default Catalogo;