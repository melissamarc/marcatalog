import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const CarrinhoContext = createContext();

const CHAVE_CARRINHO = "marcatalog-carrinho";

function carregarCarrinhoSalvo() {
  try {
    const carrinhoSalvo = localStorage.getItem(
      CHAVE_CARRINHO
    );

    if (!carrinhoSalvo) {
      return {
        catalogoSlug: null,
        itens: [],
      };
    }

    return JSON.parse(carrinhoSalvo);
  } catch {
    return {
      catalogoSlug: null,
      itens: [],
    };
  }
}

export function CarrinhoProvider({ children }) {
  const [carrinho, setCarrinho] = useState(
    carregarCarrinhoSalvo
  );

  useEffect(() => {
    localStorage.setItem(
      CHAVE_CARRINHO,
      JSON.stringify(carrinho)
    );
  }, [carrinho]);

  function adicionarProduto(
    produto,
    catalogoSlug,
    variacao = null
  ) {
    setCarrinho((carrinhoAtual) => {
      const itensAtuais =
        carrinhoAtual.catalogoSlug === catalogoSlug
          ? carrinhoAtual.itens
          : [];

      const chaveCarrinho = variacao
        ? `${produto.id}-${variacao.id}`
        : produto.id;

      const produtoExistente = itensAtuais.find(
        (item) =>
          item.chaveCarrinho === chaveCarrinho
      );

      if (produtoExistente) {
        return {
          catalogoSlug,
          itens: itensAtuais.map((item) =>
            item.chaveCarrinho === chaveCarrinho
              ? {
                  ...item,
                  quantidade:
                    item.quantidade + 1,
                }
              : item
          ),
        };
      }

      const valorAdicional = variacao
        ? Number(variacao.valor_adicional)
        : 0;

      const imagemFinal =
        variacao?.imagem_url ||
        produto.imagem_url ||
        null;

      return {
        catalogoSlug,
        itens: [
          ...itensAtuais,
          {
            ...produto,
            chaveCarrinho,
            preco:
              Number(produto.preco) +
              valorAdicional,
            imagem_url: imagemFinal,
            variacaoSelecionada: variacao,
            quantidade: 1,
          },
        ],
      };
    });
  }

  function alterarQuantidade(
    chaveCarrinho,
    quantidade
  ) {
    if (quantidade <= 0) {
      removerProduto(chaveCarrinho);
      return;
    }

    setCarrinho((carrinhoAtual) => ({
      ...carrinhoAtual,
      itens: carrinhoAtual.itens.map((item) =>
        item.chaveCarrinho === chaveCarrinho
          ? {
              ...item,
              quantidade,
            }
          : item
      ),
    }));
  }

  function removerProduto(chaveCarrinho) {
    setCarrinho((carrinhoAtual) => ({
      ...carrinhoAtual,
      itens: carrinhoAtual.itens.filter(
        (item) =>
          item.chaveCarrinho !== chaveCarrinho
      ),
    }));
  }

  function limparCarrinho() {
    setCarrinho({
      catalogoSlug: null,
      itens: [],
    });
  }

  const quantidadeTotal = carrinho.itens.reduce(
    (total, item) =>
      total + item.quantidade,
    0
  );

  const valorTotal = carrinho.itens.reduce(
    (total, item) =>
      total +
      Number(item.preco) * item.quantidade,
    0
  );

  return (
    <CarrinhoContext.Provider
      value={{
        carrinho,
        adicionarProduto,
        alterarQuantidade,
        removerProduto,
        limparCarrinho,
        quantidadeTotal,
        valorTotal,
      }}
    >
      {children}
    </CarrinhoContext.Provider>
  );
}

export function useCarrinho() {
  return useContext(CarrinhoContext);
}