import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Lock,
  Printer,
  ShoppingBag,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { gerarCopiaPedidoPdf } from "../utils/orcamentoPdf";
import { formatarPreco } from "../utils/precos";
import "./PedidosCopia.css";

const LIMITE_PEDIDOS = 200;
const MAXIMO_MINIATURAS = 4;

function formatarDataHora(dataIso) {
  return new Date(dataIso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PedidosCopia() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [empresa, setEmpresa] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setErro("");

      const { data: dadosEmpresa, error: erroEmpresa } =
        await supabase
          .from("empresas")
          .select("*")
          .eq("usuario_id", usuario.id)
          .maybeSingle();

      if (erroEmpresa || !dadosEmpresa) {
        setErro("Não foi possível carregar sua empresa.");
        setCarregando(false);
        return;
      }

      setEmpresa(dadosEmpresa);

      if (!dadosEmpresa.recursos_novos) {
        setCarregando(false);
        return;
      }

      const { data, error } = await supabase
        .from("pedidos_catalogo")
        .select(
          "id, cliente, vendedor_nome, itens, total, criado_em"
        )
        .eq("empresa_id", dadosEmpresa.id)
        .order("criado_em", { ascending: false })
        .limit(LIMITE_PEDIDOS);

      if (error) {
        setErro(
          "Não foi possível carregar os pedidos. Confira se o arquivo SQL de pedidos foi executado no Supabase."
        );
        setCarregando(false);
        return;
      }

      setPedidos(data ?? []);
      setCarregando(false);
    }

    if (usuario?.id) {
      carregar();
    }
  }, [usuario]);

  const pedidosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    if (!termo) {
      return pedidos;
    }

    return pedidos.filter(
      (pedido) =>
        pedido.cliente
          ?.toLocaleLowerCase("pt-BR")
          .includes(termo) ||
        pedido.vendedor_nome
          ?.toLocaleLowerCase("pt-BR")
          .includes(termo)
    );
  }, [pedidos, busca]);

  function imprimir(pedido) {
    setAviso("");

    const abriu = gerarCopiaPedidoPdf({ empresa, pedido });

    if (!abriu) {
      setAviso(
        "Seu navegador bloqueou a janela do PDF. Permita pop-ups e tente novamente."
      );
    }
  }

  async function apagar(pedido) {
    const confirmou = window.confirm(
      `Apagar a cópia do pedido de ${pedido.cliente}? Essa ação não pode ser desfeita.`
    );

    if (!confirmou) {
      return;
    }

    setAviso("");

    const { error } = await supabase
      .from("pedidos_catalogo")
      .delete()
      .eq("id", pedido.id);

    if (error) {
      setAviso("Não foi possível apagar este pedido.");
      return;
    }

    setPedidos((atuais) =>
      atuais.filter((item) => item.id !== pedido.id)
    );
  }

  return (
    <main className="pedidos-pagina">
      <header className="pedidos-topo">
        <button type="button" onClick={() => navigate("/admin")}>
          <ArrowLeft size={18} />
          Voltar ao painel
        </button>

        <div className="pedidos-titulo">
          <div>
            <h1>Pedidos</h1>
            <p>
              Cópia do orçamento em PDF de cada pedido que seus
              clientes enviaram pelo WhatsApp.
            </p>
          </div>

          {empresa?.recursos_novos && pedidos.length > 0 && (
            <input
              className="pedidos-busca"
              type="search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar por cliente ou vendedor"
            />
          )}
        </div>
      </header>

      {carregando && (
        <p className="pedidos-carregando">Carregando pedidos...</p>
      )}

      {erro && <p className="pedidos-erro">{erro}</p>}

      {aviso && <p className="pedidos-erro">{aviso}</p>}

      {!carregando && !erro && empresa && !empresa.recursos_novos && (
        <div className="pedidos-vazio">
          <span>
            <Lock size={32} />
          </span>
          <h2>Função exclusiva</h2>
          <p>
            A cópia dos pedidos em PDF ainda não está liberada para
            o seu catálogo. Fale com o suporte para ativar.
          </p>
        </div>
      )}

      {!carregando &&
        !erro &&
        empresa?.recursos_novos &&
        pedidos.length === 0 && (
          <div className="pedidos-vazio">
            <span>
              <ShoppingBag size={32} />
            </span>
            <h2>Nenhum pedido ainda</h2>
            <p>
              Quando um cliente enviar um pedido pelo WhatsApp, a
              cópia do orçamento aparece aqui.
            </p>
          </div>
        )}

      {!carregando &&
        pedidos.length > 0 &&
        pedidosFiltrados.length === 0 && (
          <p className="pedidos-carregando">
            Nenhum pedido encontrado para essa busca.
          </p>
        )}

      <section className="pedidos-lista">
        {pedidosFiltrados.map((pedido) => {
          const itens = pedido.itens ?? [];
          const quantidade = itens.reduce(
            (soma, item) => soma + item.quantidade,
            0
          );
          const comFoto = itens.filter((item) => item.imagem_url);

          return (
            <article className="pedido-cartao" key={pedido.id}>
              <div className="pedido-quem">
                <div>
                  <small>
                    <UserRound size={13} />
                    Cliente
                  </small>
                  <strong>{pedido.cliente}</strong>
                </div>

                <div>
                  <small>
                    <UsersRound size={13} />
                    Vendedor
                  </small>
                  <strong>
                    {pedido.vendedor_nome || "Sem vendedor"}
                  </strong>
                </div>
              </div>

              <div className="pedido-detalhes">
                <span>
                  <CalendarDays size={15} />
                  {formatarDataHora(pedido.criado_em)}
                </span>

                <span>
                  {quantidade}{" "}
                  {quantidade === 1 ? "item" : "itens"}
                </span>

                <strong>{formatarPreco(pedido.total)}</strong>
              </div>

              {comFoto.length > 0 && (
                <div className="pedido-miniaturas">
                  {comFoto
                    .slice(0, MAXIMO_MINIATURAS)
                    .map((item, indice) => (
                      <img
                        key={indice}
                        src={item.imagem_url}
                        alt={item.nome}
                        loading="lazy"
                      />
                    ))}

                  {comFoto.length > MAXIMO_MINIATURAS && (
                    <span>
                      +{comFoto.length - MAXIMO_MINIATURAS}
                    </span>
                  )}
                </div>
              )}

              <div className="pedido-acoes">
                <button
                  className="pedido-imprimir"
                  type="button"
                  onClick={() => imprimir(pedido)}
                >
                  <Printer size={17} />
                  Imprimir / abrir PDF
                </button>

                <button
                  className="pedido-apagar"
                  type="button"
                  onClick={() => apagar(pedido)}
                  aria-label={`Apagar pedido de ${pedido.cliente}`}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

export default PedidosCopia;
