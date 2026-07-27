import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Boxes,
  Edit3,
  Layers3,
  Package,
  PackagePlus,
  Power,
  Search,
  Trash2,
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import "./GerenciarProdutos.css";

function GerenciarProdutos() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function buscarProdutos() {
      const { data: empresa, error: erroEmpresa } =
        await supabase
          .from("empresas")
          .select("id")
          .eq("usuario_id", usuario.id)
          .single();

      if (erroEmpresa) {
        setErro("Não foi possível encontrar sua empresa.");
        setCarregando(false);
        return;
      }

      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("empresa_id", empresa.id)
        .order("criado_em", { ascending: false });

      if (error) {
        setErro("Não foi possível carregar os produtos.");
        setCarregando(false);
        return;
      }

      setProdutos(data ?? []);
      setCarregando(false);
    }

    buscarProdutos();
  }, [usuario]);

  const produtosFiltrados = useMemo(() => {
    const texto = busca.toLowerCase().trim();

    if (!texto) {
      return produtos;
    }

    return produtos.filter((produto) => {
      return (
        produto.nome.toLowerCase().includes(texto) ||
        produto.categoria.toLowerCase().includes(texto) ||
        produto.marca?.toLowerCase().includes(texto)
      );
    });
  }, [produtos, busca]);

  async function alterarEsgotado(produto) {
    const novoValor = !produto.esgotado;

    const { error } = await supabase
      .from("produtos")
      .update({ esgotado: novoValor })
      .eq("id", produto.id);

    if (error) {
      setErro("Não foi possível alterar a disponibilidade.");
      return;
    }

    setProdutos((produtosAtuais) =>
      produtosAtuais.map((item) =>
        item.id === produto.id
          ? { ...item, esgotado: novoValor }
          : item
      )
    );
  }

  async function alterarAtivo(produto) {
    const novoValor = !produto.ativo;

    const { error } = await supabase
      .from("produtos")
      .update({ ativo: novoValor })
      .eq("id", produto.id);

    if (error) {
      setErro("Não foi possível alterar o produto.");
      return;
    }

    setProdutos((produtosAtuais) =>
      produtosAtuais.map((item) =>
        item.id === produto.id
          ? { ...item, ativo: novoValor }
          : item
      )
    );
  }

  function obterCaminhoImagem(url) {
    if (!url) {
      return null;
    }

    const identificador =
      "/storage/v1/object/public/produtos/";

    const partes = url.split(identificador);

    if (partes.length !== 2) {
      return null;
    }

    return decodeURIComponent(partes[1]);
  }

  async function excluirProduto(produto) {
    const confirmou = window.confirm(
      `Tem certeza que deseja excluir "${produto.nome}"?`
    );

    if (!confirmou) {
      return;
    }

    setErro("");

    const { error } = await supabase
      .from("produtos")
      .delete()
      .eq("id", produto.id);

    if (error) {
      setErro("Não foi possível excluir o produto.");
      return;
    }

    if (produto.imagem_url) {
      const caminhoImagem = obterCaminhoImagem(
        produto.imagem_url
      );

      if (caminhoImagem) {
        await supabase.storage
          .from("produtos")
          .remove([caminhoImagem]);
      }
    }

    setProdutos((produtosAtuais) =>
      produtosAtuais.filter(
        (item) => item.id !== produto.id
      )
    );
  }

  function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function obterSituacao(produto) {
    if (!produto.ativo) {
      return {
        texto: "Inativo",
        classe: "inativo",
      };
    }

    if (produto.esgotado) {
      return {
        texto: "Esgotado",
        classe: "esgotado",
      };
    }

    return {
      texto: "Disponível",
      classe: "disponivel",
    };
  }

  if (carregando) {
    return (
      <main className="produtos-carregando">
        <div />
        <p>Carregando produtos...</p>
      </main>
    );
  }

  return (
    <main className="gestao-produtos">
      <header className="gestao-topo">
        <div>
          <button
            className="gestao-voltar"
            type="button"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft size={18} />
            Voltar ao painel
          </button>

          <h1>Gerenciar produtos</h1>

          <p>
            Atualize preços, variações e disponibilidade.
          </p>
        </div>

        <button
          className="gestao-adicionar"
          type="button"
          onClick={() =>
            navigate("/admin/produtos/novo")
          }
        >
          <PackagePlus size={19} />
          Adicionar produto
        </button>
      </header>

      <section className="gestao-resumo">
        <div>
          <span>
            <Boxes size={20} />
          </span>

          <p>
            <strong>{produtos.length}</strong>
            produtos cadastrados
          </p>
        </div>

        <div className="gestao-pesquisa">
          <Search size={18} />

          <input
            type="search"
            value={busca}
            onChange={(evento) =>
              setBusca(evento.target.value)
            }
            placeholder="Pesquisar por nome, categoria ou marca"
          />
        </div>
      </section>

      {erro && <p className="gestao-erro">{erro}</p>}

      {produtosFiltrados.length === 0 ? (
        <section className="gestao-vazio">
          <span>
            <Package size={32} />
          </span>

          <h2>
            {produtos.length === 0
              ? "Nenhum produto cadastrado"
              : "Nenhum produto encontrado"}
          </h2>

          <p>
            {produtos.length === 0
              ? "Cadastre seu primeiro produto para começar."
              : "Tente pesquisar usando outro termo."}
          </p>

          {produtos.length === 0 && (
            <button
              type="button"
              onClick={() =>
                navigate("/admin/produtos/novo")
              }
            >
              <PackagePlus size={18} />
              Adicionar produto
            </button>
          )}
        </section>
      ) : (
        <section className="gestao-grid">
          {produtosFiltrados.map((produto) => {
            const situacao = obterSituacao(produto);

            return (
              <article
                className="gestao-produto-card"
                key={produto.id}
              >
                <div className="gestao-produto-imagem">
                  {produto.imagem_url ? (
                    <img
                      src={produto.imagem_url}
                      alt={produto.nome}
                    />
                  ) : (
                    <Package size={35} />
                  )}

                  <span
                    className={`produto-status ${situacao.classe}`}
                  >
                    {situacao.texto}
                  </span>
                </div>

                <div className="gestao-produto-conteudo">
                  <div className="gestao-produto-categoria">
                    <span>{produto.categoria}</span>

                    {produto.marca && (
                      <span>{produto.marca}</span>
                    )}
                  </div>

                  <h2>{produto.nome}</h2>

                  <strong>
                    {formatarPreco(produto.preco)}
                  </strong>

                  <div className="gestao-produto-acoes">
                    <button
                      type="button"
                      title="Editar produto"
                      onClick={() =>
                        navigate(
                          `/admin/produtos/${produto.id}/editar`
                        )
                      }
                    >
                      <Edit3 size={17} />
                      Editar
                    </button>

                    <button
                      type="button"
                      title="Gerenciar variações"
                      onClick={() =>
                        navigate(
                          `/admin/produtos/${produto.id}/variacoes`
                        )
                      }
                    >
                      <Layers3 size={17} />
                      Variações
                    </button>

                    <button
                      type="button"
                      title={
                        produto.esgotado
                          ? "Marcar como disponível"
                          : "Marcar como esgotado"
                      }
                      disabled={!produto.ativo}
                      onClick={() =>
                        alterarEsgotado(produto)
                      }
                    >
                      <Boxes size={17} />
                      {produto.esgotado
                        ? "Disponível"
                        : "Esgotar"}
                    </button>

                    <button
                      type="button"
                      title={
                        produto.ativo
                          ? "Desativar produto"
                          : "Ativar produto"
                      }
                      onClick={() => alterarAtivo(produto)}
                    >
                      <Power size={17} />
                      {produto.ativo ? "Desativar" : "Ativar"}
                    </button>

                    <button
                      className="acao-excluir"
                      type="button"
                      title="Excluir produto"
                      onClick={() => excluirProduto(produto)}
                    >
                      <Trash2 size={17} />
                      Excluir
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

export default GerenciarProdutos;