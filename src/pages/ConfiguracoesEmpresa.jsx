import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  ImagePlus,
  Link2,
  MessageCircle,
  Save,
  Settings,
  UploadCloud,
  Moon,
Palette,
Sun,
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import "./ConfiguracoesEmpresa.css";

function ConfiguracoesEmpresa() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [empresa, setEmpresa] = useState(null);
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [novoLogo, setNovoLogo] = useState(null);
  const [temaCatalogo, setTemaCatalogo] =
  useState("claro");
const [corCatalogo, setCorCatalogo] =
  useState("cereja");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function buscarEmpresa() {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("usuario_id", usuario.id)
        .single();

      if (error) {
        setErro("Não foi possível carregar sua empresa.");
        setCarregando(false);
        return;
      }

      setEmpresa(data);
      setNome(data.nome);
      setSlug(data.slug);
      setWhatsapp(data.whatsapp);
      setTemaCatalogo(data.tema_catalogo ?? "claro");
setCorCatalogo(data.cor_catalogo ?? "cereja");
      setCarregando(false);
    }

    buscarEmpresa();
  }, [usuario]);

  function gerarSlug(texto) {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function obterCaminhoLogo(url) {
    if (!url) {
      return null;
    }

    const identificador =
      "/storage/v1/object/public/logos/";

    const partes = url.split(identificador);

    if (partes.length !== 2) {
      return null;
    }

    return decodeURIComponent(partes[1]);
  }

  async function salvarEmpresa(evento) {
    evento.preventDefault();

    setSalvando(true);
    setErro("");

    let logoUrl = empresa.logo_url;
    let novoCaminho = null;

    if (novoLogo) {
      const extensao = novoLogo.name
        .split(".")
        .pop()
        .toLowerCase();

      novoCaminho = `${usuario.id}/${crypto.randomUUID()}.${extensao}`;

      const { error: erroUpload } = await supabase.storage
        .from("logos")
        .upload(novoCaminho, novoLogo);

      if (erroUpload) {
        setErro(
          `Erro ao enviar logotipo: ${erroUpload.message}`
        );
        setSalvando(false);
        return;
      }

      const { data: logoPublico } = supabase.storage
        .from("logos")
        .getPublicUrl(novoCaminho);

      logoUrl = logoPublico.publicUrl;
    }

    const { error: erroAtualizacao } = await supabase
      .from("empresas")
     .update({
  nome,
  slug,
  whatsapp,
  logo_url: logoUrl,
  tema_catalogo: temaCatalogo,
  cor_catalogo: corCatalogo,
})
      .eq("id", empresa.id);

    if (erroAtualizacao) {
      if (novoCaminho) {
        await supabase.storage
          .from("logos")
          .remove([novoCaminho]);
      }

      if (erroAtualizacao.code === "23505") {
        setErro(
          "Esse endereço de catálogo já está em uso."
        );
      } else {
        setErro(
          `Erro ao salvar: ${erroAtualizacao.message}`
        );
      }

      setSalvando(false);
      return;
    }

    if (novoCaminho && empresa.logo_url) {
      const caminhoAntigo = obterCaminhoLogo(
        empresa.logo_url
      );

      if (caminhoAntigo) {
        await supabase.storage
          .from("logos")
          .remove([caminhoAntigo]);
      }
    }

    navigate("/admin");
  }

  if (carregando) {
    return (
      <main className="config-carregando">
        <div />
        <p>Carregando empresa...</p>
      </main>
    );
  }

  const logoExibido = novoLogo
    ? URL.createObjectURL(novoLogo)
    : empresa.logo_url;

  return (
    <main className="config-pagina">
      <header className="config-topo">
        <button
          type="button"
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft size={18} />
          Voltar ao painel
        </button>

        <div>
          <p>Personalização</p>
          <h1>Configurações da empresa</h1>
          <span>
            Atualize as informações apresentadas no catálogo.
          </span>
        </div>
      </header>

      <form
        className="config-formulario"
        onSubmit={salvarEmpresa}
      >
        <section className="config-principal">
          <div className="config-card">
            <div className="config-card-titulo">
              <span>
                <Settings size={21} />
              </span>

              <div>
                <h2>Informações da empresa</h2>
                <p>
                  Dados utilizados no painel e no catálogo.
                </p>
              </div>
            </div>

            <div className="config-campo">
              <label htmlFor="nome">Nome da empresa</label>

              <div className="config-input">
                <Building2 size={18} />

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

            <div className="config-campo">
              <label htmlFor="slug">
                Endereço do catálogo
              </label>

              <div className="config-input">
                <Link2 size={18} />

                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(evento) =>
                    setSlug(
                      gerarSlug(evento.target.value)
                    )
                  }
                  required
                />
              </div>

              <div className="config-previa-link">
                <span>Seu catálogo público</span>

                <strong>
                  {window.location.origin}/catalogo/{slug}
                </strong>
              </div>
            </div>

            <div className="config-campo">
              <label htmlFor="whatsapp">
                WhatsApp para pedidos
              </label>

              <div className="config-input">
                <MessageCircle size={18} />

                <input
                  id="whatsapp"
                  type="tel"
                  value={whatsapp}
                  onChange={(evento) =>
                    setWhatsapp(evento.target.value)
                  }
                  placeholder="11999999999"
                  required
                />
              </div>

              <small>
                Informe o DDD e o número. O código 55 é
                opcional.
              </small>
            </div>
          </div>

          <div className="config-card config-aparencia">
  <div className="config-card-titulo">
    <span>
      <Palette size={21} />
    </span>

    <div>
      <h2>Aparência do catálogo</h2>
      <p>
        Escolha o tema e a cor principal da sua vitrine.
      </p>
    </div>
  </div>

  <div className="config-opcao-grupo">
    <label>Tema do catálogo</label>

    <div className="config-temas">
      <button
        className={
          temaCatalogo === "claro" ? "selecionado" : ""
        }
        type="button"
        onClick={() => setTemaCatalogo("claro")}
      >
        <span className="config-tema-previa claro">
          <Sun size={20} />
        </span>

        <div>
          <strong>Claro</strong>
          <small>Fundo bege e cards brancos</small>
        </div>
      </button>

      <button
        className={
          temaCatalogo === "escuro" ? "selecionado" : ""
        }
        type="button"
        onClick={() => setTemaCatalogo("escuro")}
      >
        <span className="config-tema-previa escuro">
          <Moon size={20} />
        </span>

        <div>
          <strong>Escuro</strong>
          <small>Fundo escuro e alto contraste</small>
        </div>
      </button>
    </div>
  </div>

  <div className="config-opcao-grupo">
    <label>Cor principal</label>

    <div className="config-cores">
      {[
        {
          codigo: "cereja",
          nome: "Cereja",
          cor: "#9f102c",
        },
        {
          codigo: "azul",
          nome: "Azul",
          cor: "#2563eb",
        },
        {
          codigo: "verde",
          nome: "Verde",
          cor: "#15803d",
        },
        {
          codigo: "roxo",
          nome: "Roxo",
          cor: "#7c3aed",
        },
        {
          codigo: "laranja",
          nome: "Laranja",
          cor: "#d95f18",
        },
      ].map((opcao) => (
        <button
          className={
            corCatalogo === opcao.codigo
              ? "selecionado"
              : ""
          }
          type="button"
          key={opcao.codigo}
          onClick={() =>
            setCorCatalogo(opcao.codigo)
          }
        >
          <span
            style={{
              backgroundColor: opcao.cor,
            }}
          />

          {opcao.nome}
        </button>
      ))}
    </div>
  </div>
</div>

        </section>

        <aside className="config-lateral">
          <div className="config-card">
            <div className="config-card-titulo">
              <span>
                <ImagePlus size={21} />
              </span>

              <div>
                <h2>Logotipo</h2>
                <p>JPG, PNG ou WebP de até 3 MB.</p>
              </div>
            </div>

            <label className="config-upload" htmlFor="logo">
              {logoExibido ? (
                <>
                  <div className="config-logo-previa">
                    <img
                      src={logoExibido}
                      alt={`Logotipo da ${empresa.nome}`}
                    />
                  </div>

                  <strong>
                    {novoLogo
                      ? "Novo logotipo selecionado"
                      : "Trocar logotipo"}
                  </strong>

                  <small>
                    {novoLogo
                      ? novoLogo.name
                      : "Clique para selecionar outro"}
                  </small>
                </>
              ) : (
                <>
                  <span>
                    <UploadCloud size={28} />
                  </span>

                  <strong>Adicionar logotipo</strong>

                  <small>
                    Clique para procurar no computador
                  </small>
                </>
              )}

              <input
                id="logo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(evento) =>
                  setNovoLogo(
                    evento.target.files[0] ?? null
                  )
                }
              />
            </label>
          </div>

          {erro && <p className="config-erro">{erro}</p>}

          <button
            className="config-salvar"
            type="submit"
            disabled={salvando}
          >
            <Save size={19} />

            {salvando
              ? "Salvando..."
              : "Salvar configurações"}
          </button>
        </aside>
      </form>
    </main>
  );
}

export default ConfiguracoesEmpresa;