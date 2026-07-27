import { useState } from "react";
import {
  Check,
  Package,
  ShoppingBag,
} from "lucide-react";
import { useCarrinho } from "../contexts/CarrinhoContext";

function ProdutoCatalogo({ produto, empresa }) {
  const { adicionarProduto } = useCarrinho();

  const [variacaoId, setVariacaoId] = useState("");
  const [erro, setErro] = useState("");
  const [adicionado, setAdicionado] = useState(false);

  const variacoes = (
    produto.variacoes_produto ?? []
  ).filter((variacao) => variacao.ativo);

  const variacaoSelecionada = variacoes.find(
    (variacao) => variacao.id === variacaoId
  );

  const precoFinal =
    Number(produto.preco) +
    Number(variacaoSelecionada?.valor_adicional ?? 0);

  function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function adicionar() {
    if (variacoes.length > 0 && !variacaoSelecionada) {
      setErro("Selecione uma opção antes de adicionar.");
      return;
    }

    adicionarProduto(
      produto,
      empresa.slug,
      variacaoSelecionada ?? null
    );

    setErro("");
    setAdicionado(true);

    setTimeout(() => {
      setAdicionado(false);
    }, 1200);
  }

  return (
    <article className="catalogo-produto-card">
      <div className="catalogo-produto-imagem">
        {produto.imagem_url ? (
          <img
            src={produto.imagem_url}
            alt={produto.nome}
          />
        ) : (
          <Package size={42} />
        )}

        {produto.esgotado && (
          <span className="catalogo-esgotado">
            Esgotado
          </span>
        )}
      </div>

      <div className="catalogo-produto-conteudo">
        <div className="catalogo-produto-etiquetas">
          <span>{produto.categoria}</span>

          {produto.marca && <span>{produto.marca}</span>}
        </div>

        <h3>{produto.nome}</h3>

        {produto.descricao && (
          <p className="catalogo-produto-descricao">
            {produto.descricao}
          </p>
        )}

        {variacoes.length > 0 && (
          <div className="catalogo-variacao">
            <label htmlFor={`variacao-${produto.id}`}>
              Escolha uma opção
            </label>

            <select
              id={`variacao-${produto.id}`}
              value={variacaoId}
              onChange={(evento) => {
                setVariacaoId(evento.target.value);
                setErro("");
              }}
            >
              <option value="">Selecione</option>

              {variacoes.map((variacao) => (
                <option
                  key={variacao.id}
                  value={variacao.id}
                >
                  {variacao.nome}
                  {Number(variacao.valor_adicional) > 0
                    ? ` (+${formatarPreco(
                        variacao.valor_adicional
                      )})`
                    : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="catalogo-produto-final">
          <strong>{formatarPreco(precoFinal)}</strong>

          {produto.esgotado ? (
            <button type="button" disabled>
              Indisponível
            </button>
          ) : (
            <button type="button" onClick={adicionar}>
              {adicionado ? (
                <>
                  <Check size={18} />
                  Adicionado
                </>
              ) : (
                <>
                  <ShoppingBag size={18} />
                  Adicionar
                </>
              )}
            </button>
          )}
        </div>

        {erro && (
          <p className="catalogo-produto-erro">
            {erro}
          </p>
        )}
      </div>
    </article>
  );
}

export default ProdutoCatalogo;