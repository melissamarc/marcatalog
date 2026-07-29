import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Store,
} from "lucide-react";
import { supabase } from "../services/supabase";
import "./Auth.css";

function RedefinirSenha() {
  const navigate = useNavigate();

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarNovaSenha, setMostrarNovaSenha] =
    useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] =
    useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function redefinirSenha(evento) {
    evento.preventDefault();

    setErro("");
    setMensagem("");

    if (novaSenha.length < 6) {
      setErro(
        "A nova senha deve ter pelo menos 6 caracteres."
      );
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro("As senhas informadas não são iguais.");
      return;
    }

    setCarregando(true);

    const { error } = await supabase.auth.updateUser({
      password: novaSenha,
    });

    if (error) {
      setErro(
        "O link está inválido ou expirou. Solicite uma nova recuperação."
      );
      setCarregando(false);
      return;
    }

    setMensagem(
      "Senha alterada com sucesso! Redirecionando para o login..."
    );

    setTimeout(async () => {
      await supabase.auth.signOut();
      navigate("/login");
    }, 1500);
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
            Proteção da sua conta
          </p>

          <h1>
            Crie uma nova senha segura.
          </h1>

          <p>
            Escolha uma senha que você não utiliza em outros sites
            para manter seu catálogo protegido.
          </p>

          <div className="auth-recurso-seguranca">
            <ShieldCheck size={20} />

            <span>
              Sua nova senha será utilizada nos próximos acessos ao
              painel administrativo.
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
            <p>Redefinição de senha</p>
            <h2>Criar nova senha</h2>

            <span>
              Utilize pelo menos 6 caracteres e confirme a senha
              antes de continuar.
            </span>
          </div>

          <form
            className="auth-formulario"
            onSubmit={redefinirSenha}
          >
            <div className="auth-campo">
              <label htmlFor="novaSenha">Nova senha</label>

              <div className="auth-input">
                <LockKeyhole size={18} />

                <input
                  id="novaSenha"
                  type={
                    mostrarNovaSenha ? "text" : "password"
                  }
                  value={novaSenha}
                  onChange={(evento) =>
                    setNovaSenha(evento.target.value)
                  }
                  placeholder="Digite sua nova senha"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  disabled={carregando}
                />

                <button
                  className="auth-mostrar-senha"
                  type="button"
                  onClick={() =>
                    setMostrarNovaSenha(!mostrarNovaSenha)
                  }
                  aria-label={
                    mostrarNovaSenha
                      ? "Ocultar senha"
                      : "Mostrar senha"
                  }
                >
                  {mostrarNovaSenha ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div className="auth-campo">
              <label htmlFor="confirmarSenha">
                Confirmar nova senha
              </label>

              <div className="auth-input">
                <LockKeyhole size={18} />

                <input
                  id="confirmarSenha"
                  type={
                    mostrarConfirmacao ? "text" : "password"
                  }
                  value={confirmarSenha}
                  onChange={(evento) =>
                    setConfirmarSenha(evento.target.value)
                  }
                  placeholder="Digite a senha novamente"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  disabled={carregando}
                />

                <button
                  className="auth-mostrar-senha"
                  type="button"
                  onClick={() =>
                    setMostrarConfirmacao(
                      !mostrarConfirmacao
                    )
                  }
                  aria-label={
                    mostrarConfirmacao
                      ? "Ocultar senha"
                      : "Mostrar senha"
                  }
                >
                  {mostrarConfirmacao ? (
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

            {mensagem && (
              <p className="auth-mensagem auth-sucesso">
                <CheckCircle2 size={17} />
                {mensagem}
              </p>
            )}

            <button
              className="auth-botao-principal"
              type="submit"
              disabled={carregando || Boolean(mensagem)}
            >
              {carregando ? "Alterando..." : "Alterar senha"}

              {!carregando && <CheckCircle2 size={19} />}
            </button>
          </form>

          <Link to="/login" className="auth-voltar">
            Voltar para o login
          </Link>
        </div>
      </section>
    </main>
  );
}

export default RedefinirSenha;