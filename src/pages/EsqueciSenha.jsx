import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Send,
  ShieldCheck,
  Store,
} from "lucide-react";
import { supabase } from "../services/supabase";
import "./Auth.css";

function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function enviarRecuperacao(evento) {
    evento.preventDefault();

    setCarregando(true);
    setErro("");
    setMensagem("");

    const { error } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      }
    );

    if (error) {
      if (error.message.includes("rate limit")) {
        setErro(
          "Muitos e-mails foram solicitados recentemente. Aguarde um pouco e tente novamente."
        );
      } else {
        setErro(
          "Não foi possível enviar o e-mail de recuperação."
        );
      }

      setCarregando(false);
      return;
    }

    setMensagem(
      "Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha."
    );

    setCarregando(false);
  }

  return (
    <main className="auth-pagina">
      <section className="auth-apresentacao">
       <Link to="/" className="auth-logo">
  <img
    src="/marcatalog-logo-final.png"
    alt="Marcatalog"
  />
</Link>

        <div className="auth-apresentacao-conteudo">
          <p className="auth-etiqueta">
            Recuperação segura
          </p>

          <h1>
            Recupere o acesso ao seu catálogo.
          </h1>

          <p>
            Enviaremos um link seguro para o e-mail vinculado à sua
            conta do Marcatalog.
          </p>

          <div className="auth-recurso-seguranca">
            <ShieldCheck size={20} />

            <span>
              O link de recuperação é individual e possui prazo de
              validade.
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
            <p>Esqueceu sua senha?</p>
            <h2>Recuperar acesso</h2>

            <span>
              Digite o e-mail utilizado na criação da sua conta.
            </span>
          </div>

          <form
            className="auth-formulario"
            onSubmit={enviarRecuperacao}
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
                  disabled={carregando}
                />
              </div>
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
                ? "Enviando..."
                : "Enviar link de recuperação"}

              {!carregando && <Send size={18} />}
            </button>
          </form>

          <Link to="/login" className="auth-voltar">
            <ArrowLeft size={16} />
            Voltar para o login
          </Link>
        </div>
      </section>
    </main>
  );
}

export default EsqueciSenha;