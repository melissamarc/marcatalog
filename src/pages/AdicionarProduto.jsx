import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlignLeft,
  ArrowLeft,
  BadgeDollarSign,
  ImagePlus,
  PackagePlus,
  Save,
  Tag,
  Tags,
  UploadCloud,
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import "./ProdutoFormulario.css";

function AdicionarProduto() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [categoria, setCategoria] = useState("");
  const [marca, setMarca] = useState("");
  const [imagem, setImagem] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function cadastrarProduto(evento) {
    evento.preventDefault();

    setCarregando(true);
    setErro("");

    const { data: empresa, error: erroEmpresa } =
      await supabase
        .from("empresas")
        .select("id")
        .eq("usuario_id", usuario.id)
        .single();

    if (erroEmpresa) {
      setErro("Não foi possível encontrar sua empresa.");
      setCarregando(false);
      return;
    }

    let imagemUrl = null;
    let caminhoImagem = null;

    if (imagem) {
      const extensao = imagem.name
        .split(".")
        .pop()
        .toLowerCase();

      caminhoImagem = `${usuario.id}/${crypto.randomUUID()}.${extensao}`;

      const { error: erroUpload } = await supabase.storage
        .from("produtos")
        .upload(caminhoImagem, imagem);

      if (erroUpload) {
        setErro(
          `Não foi possível enviar a imagem: ${erroUpload.message}`
        );
        setCarregando(false);
        return;
      }

      const { data: imagemPublica } = supabase.storage
        .from("produtos")
        .getPublicUrl(caminhoImagem);

      imagemUrl = imagemPublica.publicUrl;
    }

    const { error: erroProduto } = await supabase
      .from("produtos")
      .insert({
        empresa_id: empresa.id,
        nome,
        descricao: descricao || null,
        preco: Number(preco),
        categoria,
        marca: marca || null,
        imagem_url: imagemUrl,
      });

    if (erroProduto) {
      if (caminhoImagem) {
        await supabase.storage
          .from("produtos")
          .remove([caminhoImagem]);
      }

      setErro(
        `Não foi possível cadastrar: ${erroProduto.message}`
      );
      setCarregando(false);
      return;
    }

    navigate("/admin/produtos");
  }

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
          <p>Novo item</p>
          <h1>Adicionar produto</h1>
          <span>
            Preencha as informações que aparecerão no catálogo.
          </span>
        </div>
      </header>

      <form
        className="produto-formulario"
        onSubmit={cadastrarProduto}
      >
        <section className="produto-form-principal">
          <div className="produto-form-secao">
            <div className="produto-form-secao-titulo">
              <span>
                <PackagePlus size={21} />
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
                  placeholder="Exemplo: Máquina de Corte Profissional"
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
                  placeholder="Descreva as características do produto"
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
                  placeholder="0,00"
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
                  Informações utilizadas nos filtros do catálogo.
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
                    placeholder="Exemplo: Máquinas"
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
                    placeholder="Exemplo: Wahl"
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
                <h2>Imagem</h2>
                <p>JPG, PNG ou WebP de até 5 MB.</p>
              </div>
            </div>

            <label
              className="produto-upload"
              htmlFor="imagem"
            >
              {imagem ? (
                <>
                  <img
                    src={URL.createObjectURL(imagem)}
                    alt="Prévia do produto"
                  />

                  <strong>Trocar imagem</strong>
                  <small>{imagem.name}</small>
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
                  setImagem(
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
            disabled={carregando}
          >
            <Save size={19} />

            {carregando
              ? "Cadastrando..."
              : "Cadastrar produto"}
          </button>
        </aside>
      </form>
    </main>
  );
}

export default AdicionarProduto;