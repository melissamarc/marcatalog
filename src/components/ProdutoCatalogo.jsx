import { useState } from "react";
import {
  Check,
  Package,
  ShoppingBag,
} from "lucide-react";
import { useCarrinho } from "../contexts/CarrinhoContext";
import { registrarEvento } from "../services/eventos";
import {
  SELOS,
  calcularPreco,
  formatarPreco,
  separarMoeda,
} from "../utils/precos";

function ProdutoCatalogo({ produto, empresa }) {
  const { adicionarProduto } = useCarrinho();

  const [variacaoId, setVariacaoId] = useState("");
  const [erro, setErro] = useState("");
  const [adicionado, setAdicionado] =
    useState(false);

  const variacoes = (
    produto.variacoes_produto ?? []
  ).filter((variacao) => variacao.ativo);

  const variacaoSelecionada = variacoes.find(
    (variacao) =>
      variacao.id === variacaoId
  );

  const {
    precoOriginal,
    precoFinal,
    emPromocao,
    percentualDesconto,
  } = calcularPreco(produto, variacaoSelecionada);

  const imagemExibida =
    variacaoSelecionada?.imagem_url ||
    produto.imagem_url ||
    null;

  function selecionarVariacao(variacao) {
    setVariacaoId(variacao.id);
    setErro("");
    setAdicionado(false);
  }

  function adicionar() {
    if (
      variacoes.length > 0 &&
      !variacaoSelecionada
    ) {
      setErro(
        "Selecione uma opção antes de adicionar."
      );
      return;
    }

    adicionarProduto(
      produto,
      empresa.slug,
      variacaoSelecionada ?? null
    );

    registrarEvento(empresa.id, "add_carrinho", {
      produtoId: produto.id,
    });

    setErro("");
    setAdicionado(true);

    setTimeout(() => {
      setAdicionado(false);
    }, 1200);
  }

  return (
    <article className="catalogo-produto-card">
      <div className="catalogo-produto-imagem">
        {imagemExibida ? (
          <img
            key={imagemExibida}
            src={imagemExibida}
            alt={
              variacaoSelecionada
                ? `${produto.nome} - ${variacaoSelecionada.nome}`
                : produto.nome
            }
          />
        ) : (
          <Package size={42} />
        )}

        {!produto.esgotado &&
          (emPromocao ||
            (produto.selo && SELOS[produto.selo])) && (
          <div className="catalogo-selos">
            {emPromocao && (
              <span className="catalogo-selo promocao">
                {percentualDesconto > 0
                  ? `-${percentualDesconto}%`
                  : "Promoção"}
              </span>
            )}

            {produto.selo && SELOS[produto.selo] && (
              <span
                className={`catalogo-selo ${produto.selo}`}
              >
                {SELOS[produto.selo]}
              </span>
            )}
          </div>
        )}

        {produto.esgotado && (
          <span className="catalogo-esgotado">
            Esgotado
          </span>
        )}
      </div>

      <div className="catalogo-produto-conteudo">
        <h3 title={produto.nome}>{produto.nome}</h3>

        {produto.descricao && (
          <p className="catalogo-produto-descricao">
            {produto.descricao}
          </p>
        )}

        {variacoes.length > 0 && (
          <div className="catalogo-variacao">
            <div
              className="catalogo-variacao-opcoes"
              role="group"
              aria-label={`Variações de ${produto.nome}`}
            >
              {variacoes.map((variacao) => {
                const estaSelecionada =
                  variacao.id === variacaoId;

                return (
                  <button
                    className={
                      estaSelecionada
                        ? "catalogo-variacao-botao selecionada"
                        : "catalogo-variacao-botao"
                    }
                    key={variacao.id}
                    type="button"
                    aria-pressed={estaSelecionada}
                    onClick={() =>
                      selecionarVariacao(variacao)
                    }
                  >
                    <span>{variacao.nome}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="catalogo-produto-final">
          <div className="catalogo-preco">
            {emPromocao && (
              <s>{formatarPreco(precoOriginal)}</s>
            )}

            <strong aria-label={formatarPreco(precoFinal)}>
              <small aria-hidden="true">
                {separarMoeda(precoFinal).moeda}
              </small>
              <span aria-hidden="true">
                {separarMoeda(precoFinal).numero}
              </span>
            </strong>
          </div>

          {produto.esgotado ? (
            <button
              className="catalogo-botao-adicionar"
              type="button"
              disabled
              aria-label={`${produto.nome} está indisponível`}
            >
              <ShoppingBag size={18} />
              <span>Indisponível</span>
            </button>
          ) : (
            <button
              className="catalogo-botao-adicionar"
              type="button"
              onClick={adicionar}
              aria-label={`Adicionar ${produto.nome} ao carrinho`}
            >
              {adicionado ? (
                <>
                  <Check size={18} />
                  <span>Adicionado</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={18} />
                  <span>Adicionar</span>
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