import { useEffect, useState } from "react";
import {
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  User,
  UsersRound,
  X,
} from "lucide-react";
import { useCarrinho } from "../contexts/CarrinhoContext";
import "./Carrinho.css";

function Carrinho({ empresa, vendedores = [] }) {
  const {
    carrinho,
    alterarQuantidade,
    removerProduto,
    limparCarrinho,
  } = useCarrinho();

  const [aberto, setAberto] = useState(false);
  const [nomeCliente, setNomeCliente] = useState("");
  const [vendedorSelecionadoId, setVendedorSelecionadoId] =
    useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (vendedores.length === 1) {
      setVendedorSelecionadoId(vendedores[0].id);
      return;
    }

    const vendedorAindaExiste = vendedores.some(
      (vendedor) =>
        vendedor.id === vendedorSelecionadoId
    );

    if (!vendedorAindaExiste) {
      setVendedorSelecionadoId("");
    }
  }, [vendedores, vendedorSelecionadoId]);

  const itens =
    carrinho.catalogoSlug === empresa.slug
      ? carrinho.itens
      : [];

  const quantidadeTotal = itens.reduce(
    (total, item) => total + item.quantidade,
    0
  );

  const valorTotal = itens.reduce(
    (total, item) =>
      total + Number(item.preco) * item.quantidade,
    0
  );

  const vendedorSelecionado = vendedores.find(
    (vendedor) =>
      vendedor.id === vendedorSelecionadoId
  );

  function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function enviarPedido() {
    setErro("");

    if (!nomeCliente.trim()) {
      setErro("Informe seu nome antes de enviar o pedido.");
      return;
    }

    if (itens.length === 0) {
      setErro("Adicione pelo menos um produto ao carrinho.");
      return;
    }

    if (
      vendedores.length > 1 &&
      !vendedorSelecionado
    ) {
      setErro(
        "Selecione o vendedor que irá atender seu pedido."
      );
      return;
    }

    const produtosMensagem = itens
      .map((item) => {
        const subtotal =
          Number(item.preco) * item.quantidade;

        const variacaoTexto = item.variacaoSelecionada
          ? ` - ${item.variacaoSelecionada.nome}`
          : "";

        return `${item.quantidade}x ${item.nome}${variacaoTexto} - ${formatarPreco(
          subtotal
        )}`;
      })
      .join("\n");

    const saudacao = vendedorSelecionado
      ? `Olá, ${vendedorSelecionado.nome}!`
      : "Olá!";

    const mensagem = `${saudacao} Gostaria de solicitar um orçamento.

Nome: ${nomeCliente.trim()}

Produtos:
${produtosMensagem}

Total: ${formatarPreco(valorTotal)}`;

    const whatsappDestino =
      vendedorSelecionado?.whatsapp ||
      empresa.whatsapp ||
      "";

    const numeroDigitado = whatsappDestino.replace(
      /\D/g,
      ""
    );

    if (!numeroDigitado) {
      setErro(
        "O WhatsApp para recebimento do pedido não está configurado."
      );
      return;
    }

    const numeroWhatsapp = numeroDigitado.startsWith("55")
      ? numeroDigitado
      : `55${numeroDigitado}`;

    const linkWhatsapp = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(
      mensagem
    )}`;

    window.open(
      linkWhatsapp,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="carrinho">
      <button
        className="carrinho-abrir"
        type="button"
        onClick={() => setAberto(true)}
      >
        <ShoppingCart size={20} />

        <span>Carrinho</span>

        {quantidadeTotal > 0 && (
          <strong>{quantidadeTotal}</strong>
        )}
      </button>

      {aberto && (
        <div
          className="carrinho-overlay"
          onClick={() => setAberto(false)}
        >
          <aside
            className="carrinho-painel"
            onClick={(evento) =>
              evento.stopPropagation()
            }
          >
            <header className="carrinho-topo">
              <div>
                <span>
                  <ShoppingCart size={22} />
                </span>

                <div>
                  <h2>Seu carrinho</h2>

                  <p>
                    {quantidadeTotal}{" "}
                    {quantidadeTotal === 1
                      ? "item selecionado"
                      : "itens selecionados"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar carrinho"
              >
                <X size={21} />
              </button>
            </header>

            {itens.length === 0 ? (
              <div className="carrinho-vazio">
                <span>
                  <ShoppingBag size={35} />
                </span>

                <h3>Seu carrinho está vazio</h3>

                <p>
                  Escolha os produtos do catálogo para montar
                  seu orçamento.
                </p>

                <button
                  type="button"
                  onClick={() => setAberto(false)}
                >
                  Continuar escolhendo
                </button>
              </div>
            ) : (
              <>
                <section className="carrinho-itens">
                  {itens.map((item) => (
                    <article
                      className="carrinho-item"
                      key={item.chaveCarrinho}
                    >
                      <div className="carrinho-item-imagem">
                        {item.imagem_url ? (
                          <img
                            src={item.imagem_url}
                            alt={item.nome}
                          />
                        ) : (
                          <ShoppingBag size={24} />
                        )}
                      </div>

                      <div className="carrinho-item-informacao">
                        <h3>{item.nome}</h3>

                        {item.variacaoSelecionada && (
                          <p>
                            Opção:{" "}
                            {
                              item.variacaoSelecionada
                                .nome
                            }
                          </p>
                        )}

                        <strong>
                          {formatarPreco(item.preco)}
                        </strong>

                        <div className="carrinho-item-final">
                          <div className="carrinho-quantidade">
                            <button
                              type="button"
                              onClick={() =>
                                alterarQuantidade(
                                  item.chaveCarrinho,
                                  item.quantidade - 1
                                )
                              }
                            >
                              <Minus size={15} />
                            </button>

                            <span>
                              {item.quantidade}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                alterarQuantidade(
                                  item.chaveCarrinho,
                                  item.quantidade + 1
                                )
                              }
                            >
                              <Plus size={15} />
                            </button>
                          </div>

                          <button
                            className="carrinho-remover"
                            type="button"
                            onClick={() =>
                              removerProduto(
                                item.chaveCarrinho
                              )
                            }
                            aria-label={`Remover ${item.nome}`}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </section>

                <footer className="carrinho-finalizacao">
                  <div className="carrinho-total">
                    <span>Total estimado</span>

                    <strong>
                      {formatarPreco(valorTotal)}
                    </strong>
                  </div>

                  <div className="carrinho-nome">
                    <label htmlFor="nomeCliente">
                      Seu nome
                    </label>

                    <div>
                      <User size={18} />

                      <input
                        id="nomeCliente"
                        type="text"
                        value={nomeCliente}
                        onChange={(evento) => {
                          setNomeCliente(
                            evento.target.value
                          );
                          setErro("");
                        }}
                        placeholder="Digite seu nome"
                      />
                    </div>
                  </div>

                  {vendedores.length > 1 && (
                    <div className="carrinho-vendedor">
                      <label htmlFor="vendedor">
                        Escolha seu vendedor
                      </label>

                      <div>
                        <UsersRound size={18} />

                        <select
                          id="vendedor"
                          value={vendedorSelecionadoId}
                          onChange={(evento) => {
                            setVendedorSelecionadoId(
                              evento.target.value
                            );
                            setErro("");
                          }}
                        >
                          <option value="">
                            Selecione um vendedor
                          </option>

                          {vendedores.map(
                            (vendedor) => (
                              <option
                                key={vendedor.id}
                                value={vendedor.id}
                              >
                                {vendedor.nome}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>
                  )}

                  {vendedores.length === 1 && (
                    <div className="carrinho-atendente">
                      <span>
                        <UsersRound size={18} />
                      </span>

                      <div>
                        <small>
                          Seu atendimento será com
                        </small>

                        <strong>
                          {vendedores[0].nome}
                        </strong>
                      </div>
                    </div>
                  )}

                  {erro && (
                    <p className="carrinho-erro">
                      {erro}
                    </p>
                  )}

                  <button
                    className="carrinho-enviar"
                    type="button"
                    onClick={enviarPedido}
                  >
                    <MessageCircle size={20} />
                    Enviar pedido pelo WhatsApp
                  </button>

                  <button
                    className="carrinho-limpar"
                    type="button"
                    onClick={limparCarrinho}
                  >
                    <Trash2 size={16} />
                    Limpar carrinho
                  </button>
                </footer>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export default Carrinho;