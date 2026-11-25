import { useEffect, useId, useRef, useState } from "react";
import {
  Check,
  Package,
  ShoppingBag,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCarrinho } from "../contexts/CarrinhoContext";
import { registrarEvento } from "../services/eventos";
import {
  SELOS,
  calcularPreco,
  formatarPreco,
  separarMoeda,
} from "../utils/precos";
import "./ModalProduto.css";

/**
 * Campos opcionais do produto que aparecem em "Informações".
 * Só são exibidos se existirem no produto E estiverem preenchidos.
 * Quando cadastrar um campo novo no produto, é só incluir aqui:
 * [nome_da_coluna, "Texto que o cliente vai ver"]
 */
const CAMPOS_EXTRAS = [
  ["sku", "SKU"],
  ["codigo", "Código"],
  ["referencia", "Referência"],
  ["ean", "Código de barras"],
  ["codigo_barras", "Código de barras"],
  ["peso", "Peso"],
  ["dimensoes", "Dimensões"],
  ["material", "Material"],
  ["cor", "Cor"],
  ["tamanho", "Tamanho"],
  ["unidade", "Unidade"],
];

function preenchido(valor) {
  return (
    valor !== null &&
    valor !== undefined &&
    String(valor).trim() !== ""
  );
}

const SELETOR_FOCAVEIS =
  'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function ModalProduto({
  produto,
  empresa,
  variacaoInicialId = "",
  aoFechar,
}) {
  const { adicionarProduto } = useCarrinho();

  const tituloId = useId();
  const caixaRef = useRef(null);
  const fecharRef = useRef(aoFechar);
  const temporizadorRef = useRef(null);

  const [variacaoId, setVariacaoId] = useState(
    variacaoInicialId
  );
  const [imagemManual, setImagemManual] = useState(null);
  const [erro, setErro] = useState("");
  const [adicionado, setAdicionado] = useState(false);
  const [ampliada, setAmpliada] = useState(false);
  const [origemZoom, setOrigemZoom] = useState({
    x: 50,
    y: 50,
  });

  useEffect(() => {
    fecharRef.current = aoFechar;
  });

  // Foco, tecla Esc, bloqueio da rolagem do fundo
  useEffect(() => {
    const elementoAnterior = document.activeElement;
    const overflowAnterior = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    caixaRef.current?.focus();

    function aoPressionar(evento) {
      if (evento.key === "Escape") {
        evento.stopPropagation();
        fecharRef.current?.();
        return;
      }

      if (evento.key !== "Tab" || !caixaRef.current) {
        return;
      }

      const focaveis = caixaRef.current.querySelectorAll(
        SELETOR_FOCAVEIS
      );

      if (focaveis.length === 0) {
        return;
      }

      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const atual = document.activeElement;

      if (
        evento.shiftKey &&
        (atual === primeiro || atual === caixaRef.current)
      ) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && atual === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", aoPressionar);

    return () => {
      document.removeEventListener("keydown", aoPressionar);
      document.body.style.overflow = overflowAnterior;
      elementoAnterior?.focus?.();
    };
  }, []);

  useEffect(() => {
    return () => clearTimeout(temporizadorRef.current);
  }, []);

  const variacoes = (
    produto.variacoes_produto ?? []
  ).filter((variacao) => variacao.ativo);

  const variacaoSelecionada = variacoes.find(
    (variacao) => variacao.id === variacaoId
  );

  const {
    precoOriginal,
    precoFinal,
    emPromocao,
    percentualDesconto,
  } = calcularPreco(produto, variacaoSelecionada);

  const imagemExibida =
    imagemManual ||
    variacaoSelecionada?.imagem_url ||
    produto.imagem_url ||
    null;

  // Miniaturas: foto principal + foto de cada variação (sem repetir)
  const miniaturas = [];
  const urlsVistas = new Set();

  function incluirMiniatura(url, rotulo, variacao = null) {
    if (!url || urlsVistas.has(url)) {
      return;
    }

    urlsVistas.add(url);
    miniaturas.push({ url, rotulo, variacao });
  }

  incluirMiniatura(produto.imagem_url, produto.nome);
  variacoes.forEach((variacao) =>
    incluirMiniatura(
      variacao.imagem_url,
      variacao.nome,
      variacao
    )
  );

  const algumaVariacaoMudaPreco = variacoes.some(
    (variacao) => Number(variacao.valor_adicional ?? 0) !== 0
  );

  // Informações cadastradas no produto
  const informacoes = [];

  if (preenchido(produto.marca)) {
    informacoes.push(["Marca", produto.marca]);
  }

  CAMPOS_EXTRAS.forEach(([campo, rotulo]) => {
    if (preenchido(produto[campo])) {
      informacoes.push([rotulo, String(produto[campo])]);
    }
  });

  informacoes.push([
    "Disponibilidade",
    produto.esgotado ? "Esgotado" : "Disponível",
  ]);

  const exibirSelos =
    !produto.esgotado &&
    (emPromocao || (produto.selo && SELOS[produto.selo]));

  function selecionarVariacao(variacao) {
    setVariacaoId(variacao.id);
    setImagemManual(null);
    setAmpliada(false);
    setErro("");
    setAdicionado(false);
  }

  function escolherMiniatura(miniatura) {
    if (miniatura.variacao) {
      selecionarVariacao(miniatura.variacao);
      return;
    }

    setImagemManual(miniatura.url);
    setAmpliada(false);
  }

  function calcularOrigem(evento, elemento) {
    const area = elemento.getBoundingClientRect();

    return {
      x: ((evento.clientX - area.left) / area.width) * 100,
      y: ((evento.clientY - area.top) / area.height) * 100,
    };
  }

  function alternarZoom(evento) {
    if (!imagemExibida) {
      return;
    }

    if (!ampliada) {
      setOrigemZoom(calcularOrigem(evento, evento.currentTarget));
    }

    setAmpliada((atual) => !atual);
  }

  function moverZoom(evento) {
    if (ampliada) {
      setOrigemZoom(calcularOrigem(evento, evento.currentTarget));
    }
  }

  function aoTeclarNaFoto(evento) {
    if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      setAmpliada((atual) => !atual);
    }
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

    registrarEvento(empresa.id, "add_carrinho", {
      produtoId: produto.id,
    });

    setErro("");
    setAdicionado(true);

    clearTimeout(temporizadorRef.current);
    temporizadorRef.current = setTimeout(() => {
      setAdicionado(false);
    }, 1400);
  }

  return (
    <div
      className="produto-modal-fundo"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) {
          aoFechar();
        }
      }}
    >
      <div
        className="produto-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        ref={caixaRef}
      >
        <button
          className="produto-modal-fechar"
          type="button"
          onClick={aoFechar}
          aria-label="Fechar detalhes do produto"
        >
          <X size={20} />
        </button>

        <div className="produto-modal-galeria">
          <div
            className={
              ampliada
                ? "produto-modal-foto ampliada"
                : "produto-modal-foto"
            }
            role={imagemExibida ? "button" : undefined}
            tabIndex={imagemExibida ? 0 : undefined}
            aria-label={
              imagemExibida
                ? ampliada
                  ? "Reduzir foto"
                  : "Ampliar foto"
                : undefined
            }
            onClick={alternarZoom}
            onPointerMove={moverZoom}
            onKeyDown={aoTeclarNaFoto}
          >
            {imagemExibida ? (
              <img
                key={imagemExibida}
                src={imagemExibida}
                alt={
                  variacaoSelecionada
                    ? `${produto.nome} - ${variacaoSelecionada.nome}`
                    : produto.nome
                }
                draggable={false}
                style={{
                  transformOrigin: `${origemZoom.x}% ${origemZoom.y}%`,
                }}
              />
            ) : (
              <Package size={56} />
            )}

            {exibirSelos && (
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
              <span className="produto-modal-esgotado">
                Esgotado
              </span>
            )}

            {imagemExibida && (
              <span
                className="produto-modal-zoom-dica"
                aria-hidden="true"
              >
                {ampliada ? (
                  <ZoomOut size={16} />
                ) : (
                  <ZoomIn size={16} />
                )}
              </span>
            )}
          </div>

          {miniaturas.length > 1 && (
            <div
              className="produto-modal-miniaturas"
              role="group"
              aria-label="Fotos do produto"
            >
              {miniaturas.map((miniatura) => (
                <button
                  className={
                    miniatura.url === imagemExibida
                      ? "ativa"
                      : ""
                  }
                  key={miniatura.url}
                  type="button"
                  aria-label={`Ver foto: ${miniatura.rotulo}`}
                  aria-pressed={miniatura.url === imagemExibida}
                  onClick={() => escolherMiniatura(miniatura)}
                >
                  <img
                    src={miniatura.url}
                    alt=""
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="produto-modal-detalhes">
          <div className="produto-modal-corpo">
            <div className="produto-modal-cabecalho">
              {preenchido(produto.categoria) && (
                <p className="produto-modal-categoria">
                  {produto.categoria}
                </p>
              )}

              <h2 id={tituloId}>{produto.nome}</h2>
            </div>

            <div className="produto-modal-preco">
              {emPromocao && (
                <div className="produto-modal-preco-antigo">
                  <s>{formatarPreco(precoOriginal)}</s>

                  {percentualDesconto > 0 && (
                    <span className="produto-modal-desconto">
                      -{percentualDesconto}%
                    </span>
                  )}
                </div>
              )}

              <strong aria-label={formatarPreco(precoFinal)}>
                <small aria-hidden="true">
                  {separarMoeda(precoFinal).moeda}
                </small>
                <span aria-hidden="true">
                  {separarMoeda(precoFinal).numero}
                </span>
              </strong>

              {variacoes.length > 0 &&
                !variacaoSelecionada &&
                algumaVariacaoMudaPreco && (
                  <p className="produto-modal-aviso">
                    O valor pode variar conforme a opção
                    escolhida.
                  </p>
                )}
            </div>

            {variacoes.length > 0 && (
              <div className="produto-modal-secao">
                <h3 className="produto-modal-rotulo">
                  Escolha uma opção
                  {variacaoSelecionada && (
                    <strong>{variacaoSelecionada.nome}</strong>
                  )}
                </h3>

                <div
                  className="catalogo-variacao-opcoes"
                  role="group"
                  aria-label={`Variações de ${produto.nome}`}
                >
                  {variacoes.map((variacao) => {
                    const estaSelecionada =
                      variacao.id === variacaoId;
                    const adicional = Number(
                      variacao.valor_adicional ?? 0
                    );

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

                        {adicional > 0 && (
                          <small>
                            + {formatarPreco(adicional)}
                          </small>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {preenchido(produto.descricao) && (
              <div className="produto-modal-secao">
                <h3 className="produto-modal-rotulo">
                  Descrição
                </h3>

                <p className="produto-modal-descricao">
                  {produto.descricao}
                </p>
              </div>
            )}

            <div className="produto-modal-secao">
              <h3 className="produto-modal-rotulo">
                Informações
              </h3>

              <dl className="produto-modal-info">
                {informacoes.map(([rotulo, valor]) => (
                  <div key={rotulo}>
                    <dt>{rotulo}</dt>
                    <dd>{valor}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="produto-modal-rodape">
            {erro && (
              <p className="produto-modal-erro" role="alert">
                {erro}
              </p>
            )}

            {produto.esgotado ? (
              <button
                className="produto-modal-adicionar"
                type="button"
                disabled
              >
                <ShoppingBag size={19} />
                Indisponível
              </button>
            ) : (
              <button
                className="produto-modal-adicionar"
                type="button"
                onClick={adicionar}
              >
                {adicionado ? (
                  <>
                    <Check size={19} />
                    Adicionado ao carrinho
                  </>
                ) : (
                  <>
                    <ShoppingBag size={19} />
                    Adicionar ao carrinho
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalProduto;
