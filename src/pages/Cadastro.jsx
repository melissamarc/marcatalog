import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Store,
} from "lucide-react";
import { supabase } from "../services/supabase";
import "./Auth.css";

function Cadastro() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  async function cadastrarUsuario(evento) {
    evento.preventDefault();

    setCarregando(true);
    setMensagem("");
    setErro("");

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      setErro(error.message);
      setCarregando(false);
      return;
    }

    setMensagem(
      "Conta criada! Confira seu e-mail para confirmar o cadastro."
    );

    setEmail("");
    setSenha("");
    setCarregando(false);
  }

  return (
    <main className="auth-pagina">
      <section className="auth-apresentacao">
        <Link to="/" className="auth-logo">
          <span>
            <Store size={24} />
          </span>

          Marcatalog
        </Link>

        <div className="auth-apresentacao-conteudo">
          <p className="auth-etiqueta">
            Comece agora
          </p>

          <h1>
            Transforme seus produtos em uma vitrine digital.
          </h1>

          <p>
            Crie uma conta, cadastre sua empresa e compartilhe um
            catálogo profissional com seus clientes.
          </p>

          <div className="cadastro-beneficios">
            <span>
              <Check size={17} />
              Link exclusivo para sua empresa
            </span>

            <span>
              <Check size={17} />
              Carrinho de compras integrado
            </span>

            <span>
              <Check size={17} />
              Orçamentos enviados pelo WhatsApp
            </span>
          </div>
        </div>

        <p className="auth-rodape">
          © 2026 Marcatalog
        </p>
      </section>

      <section className="auth-area-formulario">
        <div className="auth-formulario-container">
          <div className="auth-cabecalho">
            <p>Crie seu catálogo</p>
            <h2>Criar uma conta</h2>
            <span>
              Cadastre-se para começar a montar sua vitrine.
            </span>
          </div>

          <form
            className="auth-formulario"
            onSubmit={cadastrarUsuario}
          >
            <div className="auth-campo">
              <label htmlFor="email">E-mail</label>

              <div className="auth-input">
                <Mail size={18} />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(evento) =>
                    setEmail(evento.target.value)
                  }
                  placeholder="seuemail@exemplo.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="auth-campo">
              <label htmlFor="senha">Senha</label>

              <div className="auth-input">
                <LockKeyhole size={18} />

                <input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(evento) =>
                    setSenha(evento.target.value)
                  }
                  placeholder="Mínimo de 6 caracteres"
                  minLength={6}
                  autoComplete="new-password"
                  required
                />

                <button
                  className="auth-mostrar-senha"
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  aria-label={
                    mostrarSenha
                      ? "Ocultar senha"
                      : "Mostrar senha"
                  }
                >
                  {mostrarSenha ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>

              <small className="auth-ajuda">
                Use pelo menos 6 caracteres.
              </small>
            </div>

            {erro && (
              <p className="auth-mensagem auth-erro">
                {erro}
              </p>
            )}

            {mensagem && (
              <p className="auth-mensagem auth-sucesso">
                {mensagem}
              </p>
            )}

            <button
              className="auth-botao-principal"
              type="submit"
              disabled={carregando}
            >
              {carregando
                ? "Criando conta..."
                : "Criar minha conta"}

              {!carregando && <ArrowRight size={19} />}
            </button>
          </form>

          <p className="auth-alternativa">
            Já possui uma conta?{" "}
            <Link to="/login">Entrar</Link>
          </p>

          <Link to="/" className="auth-voltar">
            Voltar para o início
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Cadastro;