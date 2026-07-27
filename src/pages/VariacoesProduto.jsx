import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeDollarSign,
  Layers3,
  Palette,
  Plus,
  Power,
  Trash2,
  Type,
} from "lucide-react";
import { supabase } from "../services/supabase";
import "./VariacoesProduto.css";

function VariacoesProduto() {
  const { produtoId } = useParams();
  const navigate = useNavigate();

  const [produto, setProduto] = useState(null);
  const [variacoes, setVariacoes] = useState([]);
  const [tipo, setTipo] = useState("texto");
  const [nome, setNome] = useState("");
  const [valorAdicional, setValorAdicional] = useState("0");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarDados() {
      const { data: dadosProduto, error: erroProduto } =
        await supabase
          .from("produtos")
          .select("id, nome")
          .eq("id", produtoId)
          .single();

      if (erroProduto) {
        setErro("Produto não encontrado.");
        setCarregando(false);
        return;
      }

      const { data: dadosVariacoes, error: erroVariacoes } =
        await supabase
          .from("variacoes_produto")
          .select("*")
          .eq("produto_id", produtoId)
          .order("criado_em", { ascending: true });

      if (erroVariacoes) {
        setErro("Não foi possível carregar as variações.");
        setCarregando(false);
        return;
      }

      setProduto(dadosProduto);
      setVariacoes(dadosVariacoes ?? []);
      setCarregando(false);
    }

    carregarDados();
  }, [produtoId]);

  async function adicionarVariacao(evento) {
    evento.preventDefault();

    setSalvando(true);
    setErro("");

    const { data, error } = await supabase
      .from("variacoes_produto")
      .insert({
        produto_id: produtoId,
        tipo,
        nome: nome.trim(),
        valor_adicional: Number(valorAdicional || 0),
      })
      .select()
      .single();

    if (error) {
      setErro(`Não foi possível adicionar: ${error.message}`);
      setSalvando(false);
      return;
    }

    setVariacoes((variacoesAtuais) => [
      ...variacoesAtuais,
      data,
    ]);

    setNome("");
    setValorAdicional("0");
    setSalvando(false);
  }

  async function alterarAtivo(variacao) {
    const novoValor = !variacao.ativo;

    const { error } = await supabase
      .from("variacoes_produto")
      .update({ ativo: novoValor })
      .eq("id", variacao.id);

    if (error) {
      setErro("Não foi possível alterar a variação.");
      return;
    }

    setVariacoes((variacoesAtuais) =>
      variacoesAtuais.map((item) =>
        item.id === variacao.id
          ? { ...item, ativo: novoValor }
          : item
      )
    );
  }

  async function excluirVariacao(variacao) {
    const confirmou = window.confirm(
      `Excluir a variação "${variacao.nome}"?`
    );

    if (!confirmou) {
      return;
    }

    const { error } = await supabase
      .from("variacoes_produto")
      .delete()
      .eq("id", variacao.id);

    if (error) {
      setErro("Não foi possível excluir a variação.");
      return;
    }

    setVariacoes((variacoesAtuais) =>
      variacoesAtuais.filter(
        (item) => item.id !== variacao.id
      )
    );
  }

  function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  if (carregando) {
    return (
      <main className="variacoes-carregando">
        <div />
        <p>Carregando variações...</p>
      </main>
    );
  }

  return (
    <main className="variacoes-pagina">
      <header className="variacoes-topo">
        <button
          type="button"
          onClick={() => navigate("/admin/produtos")}
        >
          <ArrowLeft size={18} />
          Voltar aos produtos
        </button>

        <div>
          <p>Opções do produto</p>

          <h1>Variações</h1>

          <span>{produto?.nome}</span>
        </div>
      </header>

      <section className="variacoes-conteudo">
        <form
          className="variacoes-formulario"
          onSubmit={adicionarVariacao}
        >
          <div className="variacoes-form-titulo">
            <span>
              <Plus size={21} />
            </span>

            <div>
              <h2>Adicionar variação</h2>

              <p>
                Crie opções de cor, tamanho, voltagem ou modelo.
              </p>
            </div>
          </div>

          <div className="variacoes-campo">
            <label htmlFor="tipo">Tipo da variação</label>

            <div className="variacoes-tipos">
              <button
                className={tipo === "texto" ? "ativo" : ""}
                type="button"
                onClick={() => setTipo("texto")}
              >
                <Type size={18} />

                <span>
                  <strong>Texto</strong>
                  <small>Tamanho, voltagem ou modelo</small>
                </span>
              </button>

              <button
                className={tipo === "cor" ? "ativo" : ""}
                type="button"
                onClick={() => setTipo("cor")}
              >
                <Palette size={18} />

                <span>
                  <strong>Cor</strong>
                  <small>Preto, azul, vermelho...</small>
                </span>
              </button>
            </div>
          </div>

          <div className="variacoes-campo">
            <label htmlFor="nome">Nome da opção</label>

            <div className="variacoes-input">
              {tipo === "cor" ? (
                <Palette size={18} />
              ) : (
                <Type size={18} />
              )}

              <input
                id="nome"
                type="text"
                value={nome}
                onChange={(evento) =>
                  setNome(evento.target.value)
                }
                placeholder="Exemplo: 220V, Grande ou Preto"
                required
              />
            </div>
          </div>

          <div className="variacoes-campo">
            <label htmlFor="valorAdicional">
              Valor adicional
            </label>

            <div className="variacoes-input">
              <BadgeDollarSign size={18} />

              <input
                id="valorAdicional"
                type="number"
                value={valorAdicional}
                onChange={(evento) =>
                  setValorAdicional(evento.target.value)
                }
                min="0"
                step="0.01"
              />
            </div>

            <small>
              Deixe em R$ 0,00 quando a opção não alterar o
              preço.
            </small>
          </div>

          {erro && <p className="variacoes-erro">{erro}</p>}

          <button
            className="variacoes-adicionar"
            type="submit"
            disabled={salvando}
          >
            <Plus size={19} />

            {salvando
              ? "Adicionando..."
              : "Adicionar variação"}
          </button>
        </form>

        <section className="variacoes-lista">
          <div className="variacoes-lista-topo">
            <div>
              <p>Variações cadastradas</p>
              <h2>Opções disponíveis</h2>
            </div>

            <span>
              {variacoes.length}{" "}
              {variacoes.length === 1
                ? "variação"
                : "variações"}
            </span>
          </div>

          {variacoes.length === 0 ? (
            <div className="variacoes-vazio">
              <span>
                <Layers3 size={31} />
              </span>

              <h3>Nenhuma variação cadastrada</h3>

              <p>
                Utilize o formulário para criar a primeira
                opção.
              </p>
            </div>
          ) : (
            <div className="variacoes-cards">
              {variacoes.map((variacao) => (
                <article
                  className={
                    variacao.ativo
                      ? "variacao-card"
                      : "variacao-card inativa"
                  }
                  key={variacao.id}
                >
                  <span className="variacao-icone">
                    {variacao.tipo === "cor" ? (
                      <Palette size={21} />
                    ) : (
                      <Type size={21} />
                    )}
                  </span>

                  <div className="variacao-informacao">
                    <div>
                      <strong>{variacao.nome}</strong>

                      <span
                        className={
                          variacao.ativo
                            ? "variacao-status ativa"
                            : "variacao-status inativa"
                        }
                      >
                        {variacao.ativo
                          ? "Ativa"
                          : "Inativa"}
                      </span>
                    </div>

                    <p>
                      {variacao.tipo === "cor"
                        ? "Cor"
                        : "Texto"}{" "}
                      · Adicional{" "}
                      {formatarPreco(
                        variacao.valor_adicional
                      )}
                    </p>
                  </div>

                  <div className="variacao-acoes">
                    <button
                      type="button"
                      title={
                        variacao.ativo
                          ? "Desativar variação"
                          : "Ativar variação"
                      }
                      onClick={() =>
                        alterarAtivo(variacao)
                      }
                    >
                      <Power size={17} />
                    </button>

                    <button
                      className="excluir"
                      type="button"
                      title="Excluir variação"
                      onClick={() =>
                        excluirVariacao(variacao)
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default VariacoesProduto;