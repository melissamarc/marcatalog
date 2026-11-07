import { supabase } from "./supabase";

const CHAVE_SESSAO = "marcatalog-sessao";

function obterSessao() {
  try {
    let sessao = sessionStorage.getItem(CHAVE_SESSAO);

    if (!sessao) {
      sessao = crypto.randomUUID();
      sessionStorage.setItem(CHAVE_SESSAO, sessao);
    }

    return sessao;
  } catch {
    return null;
  }
}

/**
 * Registra um evento de métrica do catálogo.
 * Nunca atrapalha o cliente: se der erro, apenas ignora.
 *
 * tipos: visita | add_carrinho | clique_whatsapp |
 *        busca_sem_resultado | orcamento_pdf
 */
export function registrarEvento(empresaId, tipo, dados = {}) {
  if (!empresaId) {
    return;
  }

  supabase
    .from("eventos_catalogo")
    .insert({
      empresa_id: empresaId,
      tipo,
      produto_id: dados.produtoId ?? null,
      termo: dados.termo ? String(dados.termo).slice(0, 80) : null,
      vendedor_id: dados.vendedorId ?? null,
      sessao: obterSessao(),
    })
    .then(() => {}, () => {});
}

export function jaRegistrouVisita(empresaId) {
  try {
    const chave = `marcatalog-visita-${empresaId}`;

    if (sessionStorage.getItem(chave)) {
      return true;
    }

    sessionStorage.setItem(chave, "1");
    return false;
  } catch {
    return false;
  }
}
