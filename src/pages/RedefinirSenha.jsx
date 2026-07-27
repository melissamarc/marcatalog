import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

function RedefinirSenha() {
  const navigate = useNavigate();

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function redefinirSenha(evento) {
    evento.preventDefault();

    setErro("");
    setMensagem("");

    if (novaSenha.length < 6) {
      setErro("A nova senha deve ter pelo menos 6 caracteres.");
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

    setMensagem("Senha alterada com sucesso!");

    setTimeout(async () => {
      await supabase.auth.signOut();
      navigate("/login");
    }, 1500);
  }

  return (
    <main>
      <h1>Criar nova senha</h1>

      <p>Digite a nova senha da sua conta.</p>

      <form onSubmit={redefinirSenha}>
        <div>
          <label htmlFor="novaSenha">Nova senha</label>

          <input
            id="novaSenha"
            type="password"
            value={novaSenha}
            onChange={(evento) =>
              setNovaSenha(evento.target.value)
            }
            minLength={6}
            required
          />
        </div>

        <div>
          <label htmlFor="confirmarSenha">
            Confirmar nova senha
          </label>

          <input
            id="confirmarSenha"
            type="password"
            value={confirmarSenha}
            onChange={(evento) =>
              setConfirmarSenha(evento.target.value)
            }
            minLength={6}
            required
          />
        </div>

        {erro && <p>{erro}</p>}

        {mensagem && <p>{mensagem}</p>}

        <button type="submit" disabled={carregando}>
          {carregando ? "Alterando..." : "Alterar senha"}
        </button>
      </form>
    </main>
  );
}

export default RedefinirSenha;