export function formatarPreco(valor) {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Separa o símbolo da moeda do número, para estilizar cada parte. */
export function separarMoeda(valor) {
  const texto = formatarPreco(valor);
  const partes = texto.match(/^(R\$)\s*(.*)$/);

  return partes
    ? { moeda: partes[1], numero: partes[2] }
    : { moeda: "", numero: texto };
}

/**
 * Calcula o preço que o cliente vai pagar.
 * - O produto está em promoção quando tem preco_promocional
 *   preenchido E menor que o preço normal.
 * - Produtos com preço R$ 0,00 continuam normais (nunca entram em promoção).
 */
export function calcularPreco(produto, variacao = null) {
  const adicional = Number(variacao?.valor_adicional ?? 0);
  const precoNormal = Number(produto?.preco ?? 0);

  const promocional =
    produto?.preco_promocional === null ||
    produto?.preco_promocional === undefined ||
    produto?.preco_promocional === ""
      ? null
      : Number(produto.preco_promocional);

  const emPromocao =
    promocional !== null &&
    Number.isFinite(promocional) &&
    promocional >= 0 &&
    promocional < precoNormal;

  const precoOriginal = precoNormal + adicional;
  const precoFinal = (emPromocao ? promocional : precoNormal) + adicional;

  const percentualDesconto =
    emPromocao && precoNormal > 0
      ? Math.round(((precoNormal - promocional) / precoNormal) * 100)
      : 0;

  return { precoOriginal, precoFinal, emPromocao, percentualDesconto };
}

export const SELOS = {
  novo: "Novo",
  destaque: "Destaque",
};