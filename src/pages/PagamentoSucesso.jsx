import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Store,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabase";
import "./PagamentoSucesso.css";

function PagamentoSucesso() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [verificando, setVerificando] = useState(true);
  const [assinaturaAtiva, setAssinaturaAtiva] = useState(false);
  const [tentativas, setTentativas] = useState(0);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!usuario) {
      return;
    }

    let temporizador;

    async function verificarAssinatura() {
      setErro("");

      const { data, error } = await supabase.rpc(
        "assinatura_ativa_para_usuario",
        {
          usuario_verificado: usuario.id,
        }
      );

      if (error) {
        setErro("Não foi possível verificar sua assinatura.");
        setVerificando(false);
        return;
      }

      if (data === true) {
        setAssinaturaAtiva(true);
        setVerificando(false);

        localStorage.removeItem(
          "marcatalog-plano-selecionado"
        );

        return;
      }

      setTentativas((valorAtual) => valorAtual + 1);
      setVerificando(false);

      temporizador = setTimeout(() => {
        setVerificando(true);
        verificarAssinatura();
      }, 3000);
    }

    verificarAssinatura();

    return () => {
      clearTimeout(temporizador);
    };
  }, [usuario]);

  async function verificarNovamente() {
    if (!usuario) {
      navigate("/login");
      return;
    }

    setVerificando(true);
    setErro("");

    const { data, error } = await supabase.rpc(
      "assinatura_ativa_para_usuario",
      {
        usuario_verificado: usuario.id,
      }
    );

    if (error) {
      setErro("Não foi possível verificar sua assinatura.");
      setVerificando(false);
      return;
    }

    if (data === true) {
      setAssinaturaAtiva(true);

      localStorage.removeItem(
        "marcatalog-plano-selecionado"
      );
    }

    setVerificando(false);
  }

  return (
    <main className="pagamento-sucesso-pagina">
      <header className="pagamento-sucesso-header">
        <button
          type="button"
          onClick={() => navigate("/")}
        >
          <span>
            <Store size={22} />
          </span>

          Marcatalog
        </button>
      </header>

      <section
        className={
          assinaturaAtiva
            ? "pagamento-sucesso-card aprovado"
            : "pagamento-sucesso-card aguardando"
        }
      >
        <div className="pagamento-sucesso-icone">
          {assinaturaAtiva ? (
            <CheckCircle2 size={45} />
          ) : verificando ? (
            <RefreshCw className="girando" size={41} />
          ) : (
            <Clock3 size={41} />
          )}
        </div>

        {assinaturaAtiva ? (
          <>
            <p className="pagamento-sucesso-etiqueta">
              Pagamento confirmado
            </p>

            <h1>Sua assinatura está ativa!</h1>

            <p className="pagamento-sucesso-texto">
              O acesso ao Marcatalog foi liberado. Agora você já
              pode cadastrar sua empresa, adicionar produtos e
              compartilhar seu catálogo.
            </p>

            <button
              className="pagamento-sucesso-principal"
              type="button"
              onClick={() => navigate("/admin")}
            >
              Acessar meu painel
              <ArrowRight size={19} />
            </button>
          </>
        ) : (
          <>
            <p className="pagamento-sucesso-etiqueta">
              Processando confirmação
            </p>

            <h1>Estamos confirmando seu pagamento.</h1>

            <p className="pagamento-sucesso-texto">
              Isso normalmente leva apenas alguns segundos. Você não
              precisa realizar outro pagamento.
            </p>

            {verificando && (
              <p className="pagamento-sucesso-status">
                Verificando assinatura...
              </p>
            )}

            {!verificando && tentativas > 0 && (
              <button
                className="pagamento-sucesso-principal"
                type="button"
                onClick={verificarNovamente}
              >
                Verificar novamente
                <RefreshCw size={18} />
              </button>
            )}

            {erro && (
              <p className="pagamento-sucesso-erro">{erro}</p>
            )}

            <button
              className="pagamento-sucesso-secundario"
              type="button"
              onClick={() => navigate("/planos")}
            >
              Voltar aos planos
            </button>
          </>
        )}
      </section>
    </main>
  );
}

export default PagamentoSucesso;