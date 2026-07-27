import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Store,
} from "lucide-react";
import { supabase } from "../services/supabase";
import "./Auth.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function entrar(evento) {
    evento.preventDefault();

    setCarregando(true);
    setErro("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro("E-mail ou senha incorretos.");
      setCarregando(false);
      return;
    }

    navigate("/admin");
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
            Seu catálogo digital
          </p>

          <h1>
            Gerencie sua vitrine de onde estiver.
          </h1>

          <p>
            Organize produtos, acompanhe a disponibilidade e
            compartilhe seu catálogo com seus clientes.
          </p>
        </div>

        <p className="auth-rodape">
          © 2026 Marcatalog
        </p>
      </section>

      <section className="auth-area-formulario">
        <div className="auth-formulario-container">
          <div className="auth-cabecalho">
            <p>Bem-vinda de volta</p>
            <h2>Entre na sua conta</h2>
            <span>
              Acesse o painel administrativo do seu catálogo.
            </span>
          </div>

          <form className="auth-formulario" onSubmit={entrar}>
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
              <div className="auth-label-linha">
                <label htmlFor="senha">Senha</label>

                <Link to="/esqueci-senha">
                  Esqueci minha senha
                </Link>
              </div>

              <div className="auth-input">
                <LockKeyhole size={18} />

                <input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(evento) =>
                    setSenha(evento.target.value)
                  }
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
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
            </div>

            {erro && (
              <p className="auth-mensagem auth-erro">
                {erro}
              </p>
            )}

            <button
              className="auth-botao-principal"
              type="submit"
              disabled={carregando}
            >
              {carregando ? "Entrando..." : "Entrar"}

              {!carregando && <ArrowRight size={19} />}
            </button>
          </form>

          <p className="auth-alternativa">
            Ainda não possui uma conta?{" "}
            <Link to="/cadastro">Criar conta gratuitamente</Link>
          </p>

          <Link to="/" className="auth-voltar">
            Voltar para o início
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Login;