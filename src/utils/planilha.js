// Leitura de planilhas CSV (Excel > Salvar como > CSV) para importar produtos.

export const COLUNAS_MODELO = [
  "nome",
  "categoria",
  "marca",
  "preco",
  "preco_promocional",
  "selo",
  "descricao",
];

function semAcento(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const ALIASES = {
  nome: ["nome", "produto", "titulo", "descricao do produto"],
  categoria: ["categoria", "grupo", "departamento"],
  marca: ["marca", "fabricante"],
  preco: ["preco", "valor", "preco normal", "preco de venda"],
  preco_promocional: [
    "preco_promocional",
    "preco promocional",
    "promocao",
    "valor promocional",
    "preco promo",
  ],
  selo: ["selo", "etiqueta"],
  descricao: ["descricao", "detalhes", "observacao"],
};

function detectarSeparador(texto) {
  const primeiraLinha = texto.split(/\r?\n/, 1)[0] ?? "";
  const contagens = [";", ",", "\t"].map((separador) => [
    separador,
    primeiraLinha.split(separador).length - 1,
  ]);

  contagens.sort((a, b) => b[1] - a[1]);

  return contagens[0][1] > 0 ? contagens[0][0] : ",";
}

export function lerCsv(texto) {
  const conteudo = String(texto ?? "").replace(/^\uFEFF/, "");
  const separador = detectarSeparador(conteudo);

  const linhas = [];
  let linha = [];
  let campo = "";
  let entreAspas = false;

  for (let i = 0; i < conteudo.length; i += 1) {
    const caractere = conteudo[i];

    if (entreAspas) {
      if (caractere === '"') {
        if (conteudo[i + 1] === '"') {
          campo += '"';
          i += 1;
        } else {
          entreAspas = false;
        }
      } else {
        campo += caractere;
      }
      continue;
    }

    if (caractere === '"') {
      entreAspas = true;
    } else if (caractere === separador) {
      linha.push(campo);
      campo = "";
    } else if (caractere === "\n" || caractere === "\r") {
      if (caractere === "\r" && conteudo[i + 1] === "\n") {
        i += 1;
      }
      linha.push(campo);
      campo = "";
      linhas.push(linha);
      linha = [];
    } else {
      campo += caractere;
    }
  }

  if (campo !== "" || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  return linhas.filter((l) =>
    l.some((celula) => String(celula).trim() !== "")
  );
}

export function lerNumero(valor) {
  let texto = String(valor ?? "")
    .replace(/R\$/gi, "")
    .replace(/\s/g, "");

  if (texto === "") {
    return { vazio: true, valor: null };
  }

  if (texto.includes(",")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(texto)) {
    texto = texto.replace(/\./g, "");
  }

  const numero = Number(texto);

  if (!Number.isFinite(numero) || numero < 0) {
    return { vazio: false, valor: NaN };
  }

  return { vazio: false, valor: Math.round(numero * 100) / 100 };
}

/**
 * Converte o texto do CSV em linhas de produto validadas.
 * Retorna { colunas, linhas, erroGeral }.
 */
export function lerProdutosDaPlanilha(texto) {
  const matriz = lerCsv(texto);

  if (matriz.length < 2) {
    return {
      colunas: [],
      linhas: [],
      erroGeral:
        "A planilha está vazia. Preencha pelo menos uma linha de produto.",
    };
  }

  const cabecalho = matriz[0].map(semAcento);
  const indices = {};

  Object.entries(ALIASES).forEach(([campo, nomes]) => {
    const indice = cabecalho.findIndex((titulo) =>
      nomes.includes(titulo)
    );

    if (indice >= 0) {
      indices[campo] = indice;
    }
  });

  if (indices.nome === undefined) {
    return {
      colunas: [],
      linhas: [],
      erroGeral:
        'Não encontrei a coluna "nome". Baixe o modelo e use os mesmos títulos de coluna.',
    };
  }

  const colunas = Object.keys(indices);
  const nomesVistos = new Set();
  const linhas = [];

  matriz.slice(1).forEach((celulas, posicao) => {
    const pegar = (campo) =>
      indices[campo] === undefined
        ? ""
        : String(celulas[indices[campo]] ?? "").trim();

    const avisos = [];
    const erros = [];

    const nome = pegar("nome");
    let categoria = pegar("categoria");
    const marca = pegar("marca");
    const descricao = pegar("descricao");

    const lidoPreco = lerNumero(pegar("preco"));
    const lidoPromo = lerNumero(pegar("preco_promocional"));

    if (!nome) {
      erros.push("Sem nome");
    }

    const chave = semAcento(nome);

    if (nome && nomesVistos.has(chave)) {
      erros.push("Nome repetido na planilha");
    }

    nomesVistos.add(chave);

    let preco = 0;

    if (!lidoPreco.vazio) {
      if (Number.isNaN(lidoPreco.valor)) {
        erros.push("Preço inválido");
      } else {
        preco = lidoPreco.valor;
      }
    } else if (indices.preco !== undefined) {
      avisos.push("Sem preço: ficará R$ 0,00");
    }

    let precoPromocional = null;

    if (!lidoPromo.vazio) {
      if (Number.isNaN(lidoPromo.valor)) {
        avisos.push("Preço promocional inválido: ignorado");
      } else if (lidoPromo.valor >= preco) {
        avisos.push(
          "Preço promocional não é menor que o preço: ignorado"
        );
      } else {
        precoPromocional = lidoPromo.valor;
      }
    }

    const seloTexto = semAcento(pegar("selo"));
    let selo = null;

    if (seloTexto === "novo" || seloTexto === "destaque") {
      selo = seloTexto;
    } else if (seloTexto) {
      avisos.push('Selo desconhecido (use "novo" ou "destaque"): ignorado');
    }

    if (!categoria && !erros.length) {
      categoria = "Geral";
      avisos.push('Sem categoria: ficará em "Geral"');
    }

    linhas.push({
      linha: posicao + 2,
      nome,
      categoria,
      marca,
      descricao,
      preco,
      informouPreco: !lidoPreco.vazio,
      precoPromocional,
      selo,
      erros,
      avisos,
    });
  });

  return { colunas, linhas, erroGeral: "" };
}

export function gerarModeloCsv() {
  const linhas = [
    COLUNAS_MODELO.join(";"),
    "Presilha Crocodilo;Acessórios;Lift;8,50;;novo;Presilha profissional para corte",
    "Touca Térmica 220v;Acessórios;Lift;39,90;28,50;;",
    "Máquina de Corte Sem Fio;Máquinas;Wahl;350,00;;destaque;",
  ];

  return `\uFEFF${linhas.join("\r\n")}\r\n`;
}

export function chaveNome(texto) {
  return semAcento(texto);
}
