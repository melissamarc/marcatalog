import { formatarPreco } from "./precos";

function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function corDaEmpresa(cor) {
  const cores = {
    cereja: "#9f102c",
    azul: "#1d4ed8",
    verde: "#15803d",
    roxo: "#7c3aed",
    laranja: "#c2410c",
    cinza: "#6b7280",
    amarelo: "#eab308",
  };

  return cores[cor] ?? cores.cereja;
}

/**
 * Monta o HTML do orçamento.
 * - dataBase: data do orçamento (padrão: agora). A cópia do admin
 *   usa a data em que o cliente enviou o pedido.
 * - comImagens: inclui a foto de cada produto (cópia do admin).
 */
function montarHtmlOrcamento({
  empresa,
  itens,
  cliente,
  vendedor,
  total,
  dataBase = null,
  comImagens = false,
}) {
  const cor = corDaEmpresa(empresa.cor_catalogo);
  const agora = dataBase ? new Date(dataBase) : new Date();
  const data = agora.toLocaleDateString("pt-BR");
  const validade = new Date(
    agora.getTime() + 7 * 24 * 60 * 60 * 1000
  ).toLocaleDateString("pt-BR");

  const linhas = itens
    .map((item) => {
      const subtotal = Number(item.preco) * item.quantidade;

      const opcao = item.variacaoSelecionada
        ? `<small>${escaparHtml(item.variacaoSelecionada.nome)}</small>`
        : "";

      const celulaFoto = comImagens
        ? `<td class="foto">${
            item.imagem_url
              ? `<img src="${escaparHtml(item.imagem_url)}" alt="" />`
              : ""
          }</td>`
        : "";

      return `<tr>
        ${celulaFoto}
        <td class="nome">${escaparHtml(item.nome)}${opcao}</td>
        <td class="num">${item.quantidade}</td>
        <td class="num">${formatarPreco(item.preco)}</td>
        <td class="num">${formatarPreco(subtotal)}</td>
      </tr>`;
    })
    .join("");

  const logo = empresa.logo_url
    ? `<img id="logo" src="${escaparHtml(empresa.logo_url)}" alt="" />`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Orçamento - ${escaparHtml(empresa.nome)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px; font-family: Arial, Helvetica, sans-serif; color: #1c1c1c; }
  .topo { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid ${cor}; padding-bottom: 16px; }
  .topo img { width: 64px; height: 64px; object-fit: contain; }
  .topo h1 { margin: 0; font-size: 22px; }
  .topo p { margin: 2px 0 0; color: #666; font-size: 13px; }
  .info { display: flex; justify-content: space-between; gap: 20px; margin: 22px 0; font-size: 14px; }
  .info div { line-height: 1.6; }
  .info strong { display: block; font-size: 11px; text-transform: uppercase; color: #777; letter-spacing: .04em; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { background: ${cor}; color: #fff; text-align: left; padding: 10px; font-size: 12px; }
  th.num, td.num { text-align: right; white-space: nowrap; }
  td { padding: 10px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
  tr { page-break-inside: avoid; }
  td.foto { width: 76px; padding: 8px 10px; }
  td.foto img { display: block; width: 60px; height: 60px; object-fit: cover; border: 1px solid #e5e5e5; border-radius: 6px; }
  td.nome small { display: block; color: #777; margin-top: 2px; }
  .total { margin-top: 18px; display: flex; justify-content: flex-end; }
  .total div { min-width: 240px; background: #f5f5f5; border-radius: 8px; padding: 14px 18px; display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; }
  .rodape { margin-top: 36px; font-size: 12px; color: #777; line-height: 1.6; }
  @page { margin: 14mm; }
</style>
</head>
<body>
  <div class="topo">
    ${logo}
    <div>
      <h1>${escaparHtml(empresa.nome)}</h1>
      <p>Orçamento</p>
    </div>
  </div>

  <div class="info">
    <div>
      <strong>Cliente</strong>
      ${escaparHtml(cliente || "Não informado")}
    </div>
    <div>
      <strong>Vendedor</strong>
      ${escaparHtml(vendedor?.nome || "Equipe " + empresa.nome)}
    </div>
    <div>
      <strong>Data</strong>
      ${data}
    </div>
    <div>
      <strong>Válido até</strong>
      ${validade}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        ${comImagens ? "<th>Foto</th>" : ""}
        <th>Produto</th>
        <th class="num">Qtd.</th>
        <th class="num">Valor unit.</th>
        <th class="num">Subtotal</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>

  <div class="total">
    <div><span>Total</span><span>${formatarPreco(total)}</span></div>
  </div>

  <p class="rodape">
    Valores sujeitos a confirmação de estoque e alteração sem aviso prévio.
  </p>

  <script>
    var impresso = false;
    function imprimir() {
      if (impresso) return;
      impresso = true;
      window.focus();
      window.print();
    }
    // Espera o logo e as fotos carregarem antes de abrir a impressão.
    var pendentes = Array.prototype.slice
      .call(document.images)
      .filter(function (img) { return !img.complete; });

    if (pendentes.length === 0) {
      setTimeout(imprimir, 300);
    } else {
      var restantes = pendentes.length;
      var terminou = function () {
        restantes -= 1;
        if (restantes <= 0) imprimir();
      };
      pendentes.forEach(function (img) {
        img.onload = terminou;
        img.onerror = terminou;
      });
      setTimeout(imprimir, 6000);
    }
  </script>
</body>
</html>`;
}

function abrirEmNovaJanela(html) {
  const janela = window.open("", "_blank");

  if (!janela) {
    return false;
  }

  janela.document.open();
  janela.document.write(html);
  janela.document.close();

  return true;
}

/**
 * Abre uma página de orçamento pronta para salvar como PDF
 * (o navegador abre a janela de impressão: "Salvar como PDF").
 * Não precisa instalar nenhuma biblioteca.
 */
export function gerarOrcamentoPdf({
  empresa,
  itens,
  cliente,
  vendedor,
  total,
}) {
  return abrirEmNovaJanela(
    montarHtmlOrcamento({ empresa, itens, cliente, vendedor, total })
  );
}

/**
 * Cópia do orçamento para o admin (aba Pedidos):
 * mesmos dados do PDF do cliente, mais as fotos dos produtos.
 * Abre a página e já chama a impressão.
 */
export function gerarCopiaPedidoPdf({ empresa, pedido }) {
  return abrirEmNovaJanela(
    montarHtmlOrcamento({
      empresa,
      itens: pedido.itens ?? [],
      cliente: pedido.cliente,
      vendedor: pedido.vendedor_nome
        ? { nome: pedido.vendedor_nome }
        : null,
      total: pedido.total,
      dataBase: pedido.criado_em,
      comImagens: true,
    })
  );
}
