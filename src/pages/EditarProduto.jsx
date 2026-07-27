import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlignLeft,
  ArrowLeft,
  BadgeDollarSign,
  ImagePlus,
  Package,
  Save,
  Tag,
  Tags,
  UploadCloud,
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import "./ProdutoFormulario.css";

function EditarProduto() {
  const { produtoId } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [produto, setProduto] = useState(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [categoria, setCategoria] = useState("");
  const [marca, setMarca] = useState("");
  const [novaImagem, setNovaImagem] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function buscarProduto() {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("id", produtoId)
        .single();

      if (error) {
        setErro("Produto não encontrado.");
        setCarregando(false);
        return;
      }

      setProduto(data);
      setNome(data.nome);
      setDescricao(data.descricao ?? "");
      setPreco(data.preco);
      setCategoria(data.categoria);
      setMarca(data.marca ?? "");
      setCarregando(false);
    }

    buscarProduto();
  }, [produtoId]);

  function obterCaminhoImagem(url) {
    if (!url) {
      return null;
    }

    const identificador =
      "/storage/v1/object/public/produtos/";

    const partes = url.split(identificador);

    if (partes.length !== 2) {
      return null;
    }

    return decodeURIComponent(partes[1]);
  }

  async function salvarProduto(evento) {
    evento.preventDefault();

    setSalvando(true);
    setErro("");

    let novaImagemUrl = produto.imagem_url;
    let novoCaminho = null;

    if (novaImagem) {
      const extensao = novaImagem.name
        .split(".")
        .pop()
        .toLowerCase();

      novoCaminho = `${usuario.id}/${crypto.randomUUID()}.${extensao}`;

      const { error: erroUpload } = await supabase.storage
        .from("produtos")
        .upload(novoCaminho, novaImagem);

      if (erroUpload) {
        setErro(
          `Erro ao enviar imagem: ${erroUpload.message}`
        );
        setSalvando(false);
        return;
      }

      const { data: imagemPublica } = supabase.storage
        .from("produtos")
        .getPublicUrl(novoCaminho);

      novaImagemUrl = imagemPublica.publicUrl;
    }

    const { error: erroAtualizacao } = await supabase
      .from("produtos")
      .update({
        nome,
        descricao: descricao || null,
        preco: Number(preco),
        categoria,
        marca: marca || null,
        imagem_url: novaImagemUrl,
      })
      .eq("id", produtoId);

    if (erroAtualizacao) {
      if (novoCaminho) {
        await supabase.storage
          .from("produtos")
          .remove([novoCaminho]);
      }

      setErro(
        `Erro ao atualizar: ${erroAtualizacao.message}`
      );
      setSalvando(false);
      return;
    }

    if (novoCaminho && produto.imagem_url) {
      const caminhoAntigo = obterCaminhoImagem(
        produto.imagem_url
      );

      if (caminhoAntigo) {
        await supabase.storage
          .from("produtos")
          .remove([caminhoAntigo]);
      }
    }

    navigate("/admin/produtos");
  }

  if (carregando) {
    return (
      <main className="produto-form-carregando">
        <div />
        <p>Carregando produto...</p>
      </main>
    );
  }

  if (!produto) {
    return (
      <main className="produto-nao-encontrado">
        <Package size={38} />

        <h1>Produto não encontrado</h1>

        <p>{erro}</p>

        <button
          type="button"
          onClick={() => navigate("/admin/produtos")}
        >
          Voltar aos produtos
        </button>
      </main>
    );
  }

  const imagemExibida = novaImagem
    ? URL.createObjectURL(novaImagem)
    : produto.imagem_url;

  return (
    <main className="produto-form-pagina">
      <header className="produto-form-topo">
        <button
          type="button"
          onClick={() => navigate("/admin/produtos")}
        >
          <ArrowLeft size={18} />
          Voltar aos produtos
        </button>

        <div>
          <p>Editar item</p>
          <h1>Editar produto</h1>
          <span>
            Atualize as informações que aparecem no catálogo.
          </span>
        </div>
      </header>

      <form
        className="produto-formulario"
        onSubmit={salvarProduto}
      >
        <section className="produto-form-principal">
          <div className="produto-form-secao">
            <div className="produto-form-secao-titulo">
              <span>
                <Package size={21} />
              </span>

              <div>
                <h2>Informações principais</h2>
                <p>Nome, descrição e preço do produto.</p>
              </div>
            </div>

            <div className="produto-form-campo">
              <label htmlFor="nome">Nome do produto</label>

              <div className="produto-form-input">
                <Tag size={18} />

                <input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(evento) =>
                    setNome(evento.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className="produto-form-campo">
              <label htmlFor="descricao">Descrição</label>

              <div className="produto-form-textarea">
                <AlignLeft size={18} />

                <textarea
                  id="descricao"
                  value={descricao}
                  onChange={(evento) =>
                    setDescricao(evento.target.value)
                  }
                  rows="6"
                />
              </div>
            </div>

            <div className="produto-form-campo">
              <label htmlFor="preco">Preço</label>

              <div className="produto-form-input">
                <BadgeDollarSign size={18} />

                <input
                  id="preco"
                  type="number"
                  value={preco}
                  onChange={(evento) =>
                    setPreco(evento.target.value)
                  }
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>
          </div>

          <div className="produto-form-secao">
            <div className="produto-form-secao-titulo">
              <span>
                <Tags size={21} />
              </span>

              <div>
                <h2>Organização</h2>
                <p>
                  Informações utilizadas nos filtros.
                </p>
              </div>
            </div>

            <div className="produto-form-linha">
              <div className="produto-form-campo">
                <label htmlFor="categoria">Categoria</label>

                <div className="produto-form-input">
                  <Tags size={18} />

                  <input
                    id="categoria"
                    type="text"
                    value={categoria}
                    onChange={(evento) =>
                      setCategoria(evento.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="produto-form-campo">
                <label htmlFor="marca">Marca</label>

                <div className="produto-form-input">
                  <Tag size={18} />

                  <input
                    id="marca"
                    type="text"
                    value={marca}
                    onChange={(evento) =>
                      setMarca(evento.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="produto-form-lateral">
          <div className="produto-form-secao">
            <div className="produto-form-secao-titulo">
              <span>
                <ImagePlus size={21} />
              </span>

              <div>
                <h2>Imagem do produto</h2>
                <p>JPG, PNG ou WebP de até 5 MB.</p>
              </div>
            </div>

            <label
              className="produto-upload"
              htmlFor="imagem"
            >
              {imagemExibida ? (
                <>
                  <img
                    src={imagemExibida}
                    alt={`Imagem de ${produto.nome}`}
                  />

                  <strong>
                    {novaImagem
                      ? "Nova imagem selecionada"
                      : "Trocar imagem"}
                  </strong>

                  <small>
                    {novaImagem
                      ? novaImagem.name
                      : "Clique para selecionar outra"}
                  </small>
                </>
              ) : (
                <>
                  <span>
                    <UploadCloud size={28} />
                  </span>

                  <strong>Selecionar imagem</strong>

                  <small>
                    Clique para procurar no computador
                  </small>
                </>
              )}

              <input
                id="imagem"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(evento) =>
                  setNovaImagem(
                    evento.target.files[0] ?? null
                  )
                }
              />
            </label>
          </div>

          {erro && (
            <p className="produto-form-erro">{erro}</p>
          )}

          <button
            className="produto-form-salvar"
            type="submit"
            disabled={salvando}
          >
            <Save size={19} />

            {salvando
              ? "Salvando..."
              : "Salvar alterações"}
          </button>
        </aside>
      </form>
    </main>
  );
}

export default EditarProduto;