import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  chaveNome,
  gerarModeloCsv,
  lerProdutosDaPlanilha,
} from "../utils/planilha";
import { formatarPreco } from "../utils/precos";
import "./ImportarProdutos.css";

const LIMITE_LINHAS = 2000;
const LIMITE_BYTES = 2 * 1024 * 1024;
const TAMANHO_LOTE = 100;

function ImportarProdutos() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [empresaId, setEmpresaId] = useState(null);
  const [existentes, setExistentes] = useState(new Map());
  const [carregando, setCarregando] = useState(true);

  const [nomeArquivo, setNomeArquivo] = useState("");
  const [leitura, setLeitura] = useState(null);
  const [modo, setModo] = useState("novos");

  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      const { data: empresa, error: erroEmpresa } =
        await supabase
          .from("empresas")
          .select("id")
          .eq("usuario_id", usuario.id)
          .single();

      if (erroEmpresa || !empresa) {
        setErro("Não foi possível encontrar sua empresa.");
        setCarregando(false);
        return;
      }

      const { data: produtos, error: erroProdutos } =
        await supabase
          .from("produtos")
          .select("id, nome")
          .eq("empresa_id", empresa.id);

      if (erroProdutos) {
        setErro("Não foi possível carregar seus produtos.");
        setCarregando(false);
        return;
      }

      const mapa = new Map();

      (produtos ?? []).forEach((produto) => {
        mapa.set(chaveNome(produto.nome), produto.id);
      });

      setEmpresaId(empresa.id);
      setExistentes(mapa);
      setCarregando(false);
    }

    carregar();
  }, [usuario]);

  const linhas = useMemo(() => {
    if (!leitura) {
      return [];
    }

    return leitura.linhas.map((linha) => {
      const idExistente = existentes.get(
        chaveNome(linha.nome)
      );

      let acao = "novo";

      if (linha.erros.length > 0) {
        acao = "erro";
      } else if (idExistente) {
        acao = modo === "atualizar" ? "atualizar" : "ignorar";
      }

      return { ...linha, idExistente, acao };
    });
  }, [leitura, existentes, modo]);

  const contagem = useMemo(() => {
    const total = { novo: 0, atualizar: 0, ignorar: 0, erro: 0 };

    linhas.forEach((linha) => {
      total[linha.acao] += 1;
    });

    return total;
  }, [linhas]);

  function baixarModelo() {
    const blob = new Blob([gerarModeloCsv()], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "modelo-importacao-produtos.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  async function aoEscolherArquivo(evento) {
    const arquivo = evento.target.files?.[0];

    evento.target.value = "";
    setErro("");
    setResultado(null);
    setLeitura(null);

    if (!arquivo) {
      return;
    }

    if (/\.xlsx?$/i.test(arquivo.name)) {
      setErro(
        "Para importar uma planilha do Excel, abra o arquivo e use Arquivo > Salvar como > CSV. Depois envie o arquivo .csv aqui."
      );
      return;
    }

    if (arquivo.size > LIMITE_BYTES) {
      setErro("O arquivo é muito grande (máximo de 2 MB).");
      return;
    }

    const texto = await arquivo.text();
    const dados = lerProdutosDaPlanilha(texto);

    if (dados.erroGeral) {
      setErro(dados.erroGeral);
      return;
    }

    if (dados.linhas.length > LIMITE_LINHAS) {
      setErro(
        `A planilha tem ${dados.linhas.length} linhas. O máximo por importação é ${LIMITE_LINHAS}.`
      );
      return;
    }

    setNomeArquivo(arquivo.name);
    setLeitura(dados);
  }

  async function importar() {
    if (!empresaId || importando) {
      return;
    }

    setImportando(true);
    setErro("");
    setProgresso(0);

    const colunas = leitura.colunas;
    const novos = linhas.filter((l) => l.acao === "novo");
    const atualizar = linhas.filter((l) => l.acao === "atualizar");
    const total = novos.length + atualizar.length;

    let feitos = 0;
    let falhas = 0;
    let ultimaFalha = "";

    for (let i = 0; i < novos.length; i += TAMANHO_LOTE) {
      const lote = novos.slice(i, i + TAMANHO_LOTE);

      const { error } = await supabase.from("produtos").insert(
        lote.map((linha) => ({
          empresa_id: empresaId,
          nome: linha.nome,
          categoria: linha.categoria,
          marca: linha.marca || null,
          descricao: linha.descricao || null,
          preco: linha.preco,
          preco_promocional: linha.precoPromocional,
          selo: linha.selo,
        }))
      );

      if (error) {
        falhas += lote.length;
        ultimaFalha = error.message;
      }

      feitos += lote.length;
      setProgresso(Math.round((feitos / total) * 100));
    }

    for (const linha of atualizar) {
      const alteracoes = {};

      if (linha.informouPreco) {
        alteracoes.preco = linha.preco;
      }

      if (linha.categoria) {
        alteracoes.categoria = linha.categoria;
      }

      if (linha.marca) {
        alteracoes.marca = linha.marca;
      }

      if (linha.descricao) {
        alteracoes.descricao = linha.descricao;
      }

      if (colunas.includes("preco_promocional")) {
        alteracoes.preco_promocional = linha.precoPromocional;
      }

      if (colunas.includes("selo")) {
        alteracoes.selo = linha.selo;
      }

      const { error } = await supabase
        .from("produtos")
        .update(alteracoes)
        .eq("id", linha.idExistente)
        .eq("empresa_id", empresaId);

      if (error) {
        falhas += 1;
        ultimaFalha = error.message;
      }

      feitos += 1;
      setProgresso(Math.round((feitos / total) * 100));
    }

    setImportando(false);
    setLeitura(null);
    setNomeArquivo("");

    setResultado({
      criados: novos.length,
      atualizados: atualizar.length,
      falhas,
      ultimaFalha,
    });
  }

  if (carregando) {
    return (
      <main className="importar-carregando">
        <div />
        <p>Carregando...</p>
      </main>
    );
  }

  const podeImportar =
    !importando &&
    leitura &&
    contagem.novo + contagem.atualizar > 0;

  return (
    <main className="importar-pagina">
      <header className="importar-topo">
        <button
          type="button"
          onClick={() => navigate("/admin/produtos")}
        >
          <ArrowLeft size={18} />
          Voltar aos produtos
        </button>

        <h1>Importar produtos por planilha</h1>

        <p>
          Cadastre vários produtos de uma vez. Salve sua
          planilha do Excel como CSV e envie aqui.
        </p>
      </header>

      <section className="importar-caixa">
        <div className="importar-passo">
          <span>1</span>

          <div>
            <h2>Baixe o modelo</h2>

            <p>
              Colunas: nome, categoria, marca, preco,
              preco_promocional, selo (novo ou destaque) e
              descricao. Só o nome é obrigatório. As fotos
              são adicionadas depois, em cada produto.
            </p>

            <button
              className="importar-secundario"
              type="button"
              onClick={baixarModelo}
            >
              <Download size={18} />
              Baixar planilha modelo
            </button>
          </div>
        </div>

        <div className="importar-passo">
          <span>2</span>

          <div>
            <h2>Envie sua planilha</h2>

            <label className="importar-upload">
              <UploadCloud size={26} />

              <strong>
                {nomeArquivo || "Selecionar arquivo .csv"}
              </strong>

              <small>Até 2 MB e {LIMITE_LINHAS} produtos</small>

              <input
                type="file"
                accept=".csv,.txt,text/csv"
                onChange={aoEscolherArquivo}
              />
            </label>
          </div>
        </div>
      </section>

      {erro && (
        <p className="importar-erro" role="alert">
          <XCircle size={18} />
          {erro}
        </p>
      )}

      {resultado && (
        <section className="importar-resultado">
          <CheckCircle2 size={28} />

          <div>
            <h2>Importação concluída</h2>

            <p>
              {resultado.criados} produto(s) cadastrado(s) e{" "}
              {resultado.atualizados} atualizado(s).
            </p>

            {resultado.falhas > 0 && (
              <p className="importar-aviso-texto">
                {resultado.falhas} linha(s) não puderam ser
                salvas: {resultado.ultimaFalha}
              </p>
            )}

            <button
              type="button"
              onClick={() => navigate("/admin/produtos")}
            >
              Ver meus produtos
            </button>
          </div>
        </section>
      )}

      {leitura && (
        <section className="importar-caixa">
          <div className="importar-passo">
            <span>3</span>

            <div className="importar-conferir">
              <h2>Confira e importe</h2>

              <div className="importar-modos">
                <label>
                  <input
                    type="radio"
                    name="modo"
                    checked={modo === "novos"}
                    onChange={() => setModo("novos")}
                  />
                  Cadastrar só os produtos novos
                </label>

                <label>
                  <input
                    type="radio"
                    name="modo"
                    checked={modo === "atualizar"}
                    onChange={() => setModo("atualizar")}
                  />
                  Cadastrar novos e atualizar os que já
                  existem (pelo nome)
                </label>
              </div>

              <div className="importar-resumo">
                <span className="novo">
                  {contagem.novo} novos
                </span>

                <span className="atualizar">
                  {contagem.atualizar} para atualizar
                </span>

                <span className="ignorar">
                  {contagem.ignorar} já existem
                </span>

                <span className="erro">
                  {contagem.erro} com erro
                </span>
              </div>

              <div className="importar-tabela-area">
                <table className="importar-tabela">
                  <thead>
                    <tr>
                      <th>Linha</th>
                      <th>Produto</th>
                      <th>Categoria</th>
                      <th>Preço</th>
                      <th>Promoção</th>
                      <th>Situação</th>
                    </tr>
                  </thead>

                  <tbody>
                    {linhas.slice(0, 100).map((linha) => (
                      <tr
                        className={linha.acao}
                        key={linha.linha}
                      >
                        <td>{linha.linha}</td>
                        <td>{linha.nome || "—"}</td>
                        <td>{linha.categoria || "—"}</td>
                        <td>{formatarPreco(linha.preco)}</td>
                        <td>
                          {linha.precoPromocional !== null
                            ? formatarPreco(
                                linha.precoPromocional
                              )
                            : "—"}
                        </td>
                        <td>
                          {linha.acao === "novo" && "Novo"}
                          {linha.acao === "atualizar" &&
                            "Atualizar"}
                          {linha.acao === "ignorar" &&
                            "Já existe (ignorado)"}
                          {linha.acao === "erro" &&
                            linha.erros.join(", ")}

                          {linha.acao !== "erro" &&
                            linha.avisos.length > 0 && (
                              <small>
                                <AlertTriangle size={13} />
                                {linha.avisos.join(" · ")}
                              </small>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {linhas.length > 100 && (
                <p className="importar-nota">
                  Mostrando as primeiras 100 de {linhas.length}{" "}
                  linhas. Todas serão importadas.
                </p>
              )}

              {importando && (
                <div
                  className="importar-barra"
                  role="progressbar"
                  aria-valuenow={progresso}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div style={{ width: `${progresso}%` }} />
                </div>
              )}

              <button
                className="importar-confirmar"
                type="button"
                disabled={!podeImportar}
                onClick={importar}
              >
                <FileSpreadsheet size={19} />

                {importando
                  ? `Importando... ${progresso}%`
                  : `Importar ${
                      contagem.novo + contagem.atualizar
                    } produtos`}
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default ImportarProdutos;
