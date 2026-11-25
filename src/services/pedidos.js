import { supabase } from "./supabase";

const CHAVE_ULTIMO_PEDIDO = "marcatalog-ultimo-pedido";
const JANELA_DUPLICADO_MS = 2 * 60 * 1000;

/**
 * Guarda uma cópia do pedido para o admin dono do catálogo
 * (aba "Pedidos"). Só funciona em catálogos com a função
 * exclusiva ligada (recursos_novos).
 *
 * Nunca atrapalha o cliente: se der erro, apenas ignora,
 * e o pedido pelo WhatsApp segue normalmente.
 */
export function salvarCopiaPedido({
  empresa,
  itens,
  cliente,
  vendedor,
  total,
}) {
  if (!empresa?.id || !empresa.recursos_novos) {
    return;
  }

  // Evita duplicar se o cliente clicar duas vezes no botão.
  const assinatura = JSON.stringify([
    empresa.id,
    cliente,
    vendedor?.id ?? null,
    total,
    itens.map((item) => [item.chaveCarrinho, item.quantidade]),
  ]);

  try {
    const anterior = JSON.parse(
      sessionStorage.getItem(CHAVE_ULTIMO_PEDIDO) ?? "null"
    );

    if (
      anterior &&
      anterior.assinatura === assinatura &&
      Date.now() - anterior.quando < JANELA_DUPLICADO_MS
    ) {
      return;
    }

    sessionStorage.setItem(
      CHAVE_ULTIMO_PEDIDO,
      JSON.stringify({ assinatura, quando: Date.now() })
    );
  } catch {
    // sem sessionStorage: segue sem a proteção
  }

  // Guarda só o que o PDF precisa (sem campos internos do produto).
  const itensSalvos = itens.map((item) => ({
    nome: item.nome,
    quantidade: item.quantidade,
    preco: Number(item.preco),
    imagem_url: item.imagem_url ?? null,
    variacaoSelecionada: item.variacaoSelecionada
      ? { nome: item.variacaoSelecionada.nome }
      : null,
  }));

  supabase
    .from("pedidos_catalogo")
    .insert({
      empresa_id: empresa.id,
      cliente,
      vendedor_id: vendedor?.id ? String(vendedor.id) : null,
      vendedor_nome: vendedor?.nome ?? null,
      itens: itensSalvos,
      total,
    })
    .then(() => {}, () => {});
}
