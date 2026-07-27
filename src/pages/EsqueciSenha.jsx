import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";

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
    setErro("Não foi possível enviar o e-mail de recuperação.");
  }

  setCarregando(false);
  return;
}
    setMensagem(
      "Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha."
    );

    setCarregando(false);
  }

  return (
    <main>
      <h1>Recuperar senha</h1>

      <p>
        Informe o e-mail utilizado no cadastro do Marcatalog.
      </p>

      <form onSubmit={enviarRecuperacao}>
        <div>
          <label htmlFor="email">E-mail</label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            placeholder="seuemail@exemplo.com"
            required
          />
        </div>

        {erro && <p>{erro}</p>}

        {mensagem && <p>{mensagem}</p>}

        <button type="submit" disabled={carregando}>
          {carregando
            ? "Enviando..."
            : "Enviar link de recuperação"}
        </button>
      </form>

      <Link to="/login">Voltar para o login</Link>
    </main>
  );
}

export default EsqueciSenha;