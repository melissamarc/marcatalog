import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Link2,
  MessageCircle,
  Store,
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import "./CriarEmpresa.css";

function CriarEmpresa() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  function gerarSlug(nomeEmpresa) {
    return nomeEmpresa
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function alterarNome(evento) {
    const novoNome = evento.target.value;

    setNome(novoNome);
    setSlug(gerarSlug(novoNome));
  }

  async function cadastrarEmpresa(evento) {
    evento.preventDefault();

    setCarregando(true);
    setErro("");

    const { error } = await supabase.from("empresas").insert({
      usuario_id: usuario.id,
      nome,
      slug,
      whatsapp,
    });

    if (error) {
      if (error.code === "23505") {
        setErro(
          "Esse endereço já está sendo utilizado. Escolha outro."
        );
      } else {
        setErro(error.message);
      }

      setCarregando(false);
      return;
    }

    navigate("/admin");
  }

  return (
    <main className="empresa-pagina">
      <header className="empresa-topo">
        <div className="empresa-logo">
          <span>
            <Store size={22} />
          </span>

          Marcatalog
        </div>

        <div className="empresa-etapas">
          <span className="concluida">1</span>
          <div />
          <span className="atual">2</span>
          <div />
          <span>3</span>
        </div>

        <p>Configure sua empresa</p>
      </header>

      <section className="empresa-conteudo">
        <div className="empresa-introducao">
          <p className="empresa-etiqueta">
            Sua conta está pronta
          </p>

          <h1>Agora vamos criar seu catálogo.</h1>

          <p>
            Cadastre os dados principais da empresa. Você poderá
            editar essas informações e adicionar o logotipo depois.
          </p>
        </div>

        <form
          className="empresa-formulario"
          onSubmit={cadastrarEmpresa}
        >
          <div className="empresa-campo">
            <label htmlFor="nome">Nome da empresa</label>

            <div className="empresa-input">
              <Building2 size={18} />

              <input
                id="nome"
                type="text"
                value={nome}
                onChange={alterarNome}
                placeholder="Exemplo: Lift Barber"
                required
              />
            </div>
          </div>

          <div className="empresa-campo">
            <label htmlFor="slug">
              Endereço do catálogo
            </label>

            <div className="empresa-input">
              <Link2 size={18} />

              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(evento) =>
                  setSlug(gerarSlug(evento.target.value))
                }
                placeholder="lift-barber"
                required
              />
            </div>

            <div className="empresa-previa-link">
              <span>Seu catálogo:</span>

              <strong>
                {window.location.origin}/catalogo/
                {slug || "sua-empresa"}
              </strong>
            </div>
          </div>

          <div className="empresa-campo">
            <label htmlFor="whatsapp">
              WhatsApp para receber pedidos
            </label>

            <div className="empresa-input">
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
              Informe o DDD e o número. O código 55 é opcional.
            </small>
          </div>

          {erro && (
            <p className="empresa-erro">
              {erro}
            </p>
          )}

          <button
            className="empresa-botao"
            type="submit"
            disabled={carregando}
          >
            {carregando
              ? "Criando catálogo..."
              : "Criar meu catálogo"}

            {!carregando && <ArrowRight size={19} />}
          </button>
        </form>
      </section>
    </main>
  );
}

export default CriarEmpresa;