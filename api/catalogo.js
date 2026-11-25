/* global process */

// Prévia bonita do link do catálogo (WhatsApp, Instagram, Facebook, etc.).
//
// Esses aplicativos não executam JavaScript: eles só leem o HTML que o
// servidor entrega. Esta função entrega o mesmo site de sempre, mas com o
// nome e a logo da empresa já escritos nas etiquetas de compartilhamento.
// Para quem abre no navegador, nada muda.

const CORES = {
  cereja: "#9f102c",
  azul: "#1d4ed8",
  verde: "#15803d",
  roxo: "#7c3aed",
  laranja: "#c2410c",
  cinza: "#4b5563",
  amarelo: "#eab308",
};

const SLUG_VALIDO = /^[a-zA-Z0-9_-]{1,80}$/;
const HOST_VALIDO = /^[a-z0-9.-]+(:\d+)?$/i;

function escapar(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function obterOrigem(req) {
  const host = String(
    req.headers["x-forwarded-host"] || req.headers.host || ""
  )
    .split(",")[0]
    .trim();

  const protocolo = String(req.headers["x-forwarded-proto"] || "https")
    .split(",")[0]
    .trim();

  if (!HOST_VALIDO.test(host)) {
    return null;
  }

  return `${protocolo === "http" ? "http" : "https"}://${host}`;
}

async function buscarEmpresa(slug) {
  const url =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const chave =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !chave) {
    return { empresa: null, total: 0 };
  }

  const cabecalhos = { apikey: chave };

  const resposta = await fetch(
    `${url}/rest/v1/empresas?slug=eq.${encodeURIComponent(
      slug
    )}&ativo=eq.true&select=id,nome,logo_url,cor_catalogo&limit=1`,
    { headers: cabecalhos, signal: AbortSignal.timeout(4000) }
  );

  if (!resposta.ok) {
    return { empresa: null, total: 0 };
  }

  const lista = await resposta.json();
  const empresa = lista?.[0] ?? null;

  if (!empresa) {
    return { empresa: null, total: 0 };
  }

  let total = 0;

  try {
    const contagem = await fetch(
      `${url}/rest/v1/produtos?empresa_id=eq.${encodeURIComponent(
        empresa.id
      )}&ativo=eq.true&select=id`,
      {
        method: "HEAD",
        headers: { ...cabecalhos, Prefer: "count=exact" },
        signal: AbortSignal.timeout(3000),
      }
    );

    const intervalo = contagem.headers.get("content-range") ?? "";
    total = Number(intervalo.split("/")[1]) || 0;
  } catch {
    total = 0;
  }

  return { empresa, total };
}

export function montarEtiquetas({ empresa, total, origem, slug }) {
  const nome = empresa.nome;
  const titulo = `${nome} | Catálogo digital`;

  const descricao = `${
    total > 0
      ? `Catálogo digital da ${nome} com ${total} ${
          total === 1 ? "produto" : "produtos"
        }.`
      : `Catálogo digital da ${nome}.`
  } Veja os preços e faça seu pedido pelo WhatsApp.`;

  const logoPublica =
    typeof empresa.logo_url === "string" &&
    /^https:\/\//i.test(empresa.logo_url)
      ? empresa.logo_url
      : `${origem}/marcatalog-logo-final.png`;

  const link = `${origem}/catalogo/${encodeURIComponent(slug)}`;
  const cor = CORES[empresa.cor_catalogo] ?? CORES.cereja;

  const etiquetas = [
    `<meta name="description" content="${escapar(descricao)}" />`,
    `<meta name="theme-color" content="${cor}" />`,
    `<link rel="canonical" href="${escapar(link)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta property="og:site_name" content="${escapar(nome)}" />`,
    `<meta property="og:title" content="${escapar(titulo)}" />`,
    `<meta property="og:description" content="${escapar(descricao)}" />`,
    `<meta property="og:url" content="${escapar(link)}" />`,
    `<meta property="og:image" content="${escapar(logoPublica)}" />`,
    `<meta property="og:image:alt" content="${escapar(
      `Logotipo da ${nome}`
    )}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapar(titulo)}" />`,
    `<meta name="twitter:description" content="${escapar(descricao)}" />`,
    `<meta name="twitter:image" content="${escapar(logoPublica)}" />`,
  ];

  return { titulo, etiquetas: etiquetas.join("\n    ") };
}

export function injetarEtiquetas(html, { titulo, etiquetas }) {
  // Função como substituto: evita que "$" no nome da empresa seja interpretado.
  let resultado = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    () => `<title>${escapar(titulo)}</title>`
  );

  resultado = resultado.replace(
    "</head>",
    () => `    ${etiquetas}\n  </head>`
  );

  return resultado.replace(/<html lang="[^"]*"/i, '<html lang="pt-BR"');
}

export default async function handler(req, res) {
  const slug = String(req.query?.slug ?? "");
  const origem = obterOrigem(req);

  if (!origem) {
    res.status(400).send("Requisição inválida.");
    return;
  }

  let html;

  try {
    const resposta = await fetch(`${origem}/index.html`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!resposta.ok) {
      throw new Error("index indisponível");
    }

    html = await resposta.text();
  } catch {
    res.status(502).send("Não foi possível carregar o catálogo agora.");
    return;
  }

  let status = 200;

  // Se qualquer coisa falhar aqui, o site abre normalmente, só sem a prévia.
  try {
    if (SLUG_VALIDO.test(slug)) {
      const { empresa, total } = await buscarEmpresa(slug);

      if (empresa) {
        html = injetarEtiquetas(
          html,
          montarEtiquetas({ empresa, total, origem, slug })
        );
      } else {
        status = 404;
      }
    } else {
      status = 404;
    }
  } catch {
    status = 200;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    status === 200
      ? "public, max-age=0, s-maxage=300, stale-while-revalidate=86400"
      : "no-store"
  );

  res.status(status).send(html);
}