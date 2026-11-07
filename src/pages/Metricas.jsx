import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Eye,
  FileDown,
  MessageCircle,
  SearchX,
  ShoppingCart,
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import "./Metricas.css";

const PERIODOS = [
  { dias: 7, texto: "7 dias" },
  { dias: 30, texto: "30 dias" },
  { dias: 90, texto: "90 dias" },
];

const TAMANHO_PAGINA = 1000;
const MAXIMO_PAGINAS = 10;

function contarPor(lista, obterChave) {
  const mapa = new Map();

  lista.forEach((item) => {
    const chave = obterChave(item);

    if (chave) {
      mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
    }
  });

  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
}

function chaveDia(dataIso) {
  const data = new Date(dataIso);

  return `${data.getFullYear()}-${String(
    data.getMonth() + 1
  ).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

function Metricas() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [dias, setDias] = useState(30);
  const [eventos, setEventos] = useState([]);
  const [produtos, setProdutos] = useState(new Map());
  const [vendedores, setVendedores] = useState(new Map());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      setErro("");

      const { data: empresa, error: erroEmpresa } =
        await supabase
          .from("empresas")
          .select("id")
          .eq("usuario_id", usuario.id)
          .single();

      if (erroEmpresa || !empresa) {
        setErro("Não foi possível encontrar sua empresa.");
        setCarregando(false);
        return;
      }

      const desde = new Date(
        Date.now() - dias * 24 * 60 * 60 * 1000
      ).toISOString();

      const lista = [];

      for (let pagina = 0; pagina < MAXIMO_PAGINAS; pagina += 1) {
        const inicio = pagina * TAMANHO_PAGINA;

        const { data, error } = await supabase
          .from("eventos_catalogo")
          .select(
            "tipo, produto_id, termo, vendedor_id, criado_em"
          )
          .eq("empresa_id", empresa.id)
          .gte("criado_em", desde)
          .order("criado_em", { ascending: false })
          .range(inicio, inicio + TAMANHO_PAGINA - 1);

        if (error) {
          setErro(
            "Não foi possível carregar as métricas. Confira se o arquivo SQL de métricas foi executado no Supabase."
          );
          setCarregando(false);
          return;
        }

        lista.push(...(data ?? []));

        if ((data ?? []).length < TAMANHO_PAGINA) {
          break;
        }
      }

      const [{ data: dadosProdutos }, { data: dadosVendedores }] =
        await Promise.all([
          supabase
            .from("produtos")
            .select("id, nome")
            .eq("empresa_id", empresa.id),
          supabase
            .from("vendedores")
            .select("id, nome")
            .eq("empresa_id", empresa.id),
        ]);

      if (cancelado) {
        return;
      }

      setProdutos(
        new Map((dadosProdutos ?? []).map((p) => [String(p.id), p.nome]))
      );
      setVendedores(
        new Map((dadosVendedores ?? []).map((v) => [String(v.id), v.nome]))
      );
      setEventos(lista);
      setCarregando(false);
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [usuario, dias]);

  const resumo = useMemo(() => {
    const porTipo = (tipo) =>
      eventos.filter((evento) => evento.tipo === tipo);

    const visitas = porTipo("visita");
    const adicoes = porTipo("add_carrinho");
    const whatsapp = porTipo("clique_whatsapp");
    const pdfs = porTipo("orcamento_pdf");
    const buscas = porTipo("busca_sem_resultado");

    const topProdutos = contarPor(adicoes, (e) =>
      e.produto_id ? String(e.produto_id) : null
    ).slice(0, 8);

    const porVendedor = contarPor(
      whatsapp,
      (e) => (e.vendedor_id ? String(e.vendedor_id) : "geral")
    );

    const termos = contarPor(buscas, (e) =>
      e.termo ? e.termo.toLocaleLowerCase("pt-BR").trim() : null
    ).slice(0, 8);

    const visitasPorDia = new Map();

    visitas.forEach((evento) => {
      const dia = chaveDia(evento.criado_em);
      visitasPorDia.set(dia, (visitasPorDia.get(dia) ?? 0) + 1);
    });

    const serie = [];
    const limiteGrafico = Math.min(dias, 30);

    for (let i = limiteGrafico - 1; i >= 0; i -= 1) {
      const data = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const chave = chaveDia(data);

      serie.push({
        chave,
        rotulo: `${String(data.getDate()).padStart(2, "0")}/${String(
          data.getMonth() + 1
        ).padStart(2, "0")}`,
        valor: visitasPorDia.get(chave) ?? 0,
      });
    }

    return {
      visitas: visitas.length,
      adicoes: adicoes.length,
      whatsapp: whatsapp.length,
      pdfs: pdfs.length,
      conversao:
        visitas.length > 0
          ? Math.round((whatsapp.length / visitas.length) * 100)
          : 0,
      topProdutos,
      porVendedor,
      termos,
      serie,
      maximoSerie: Math.max(1, ...serie.map((d) => d.valor)),
    };
  }, [eventos, dias]);

  const cartoes = [
    {
      icone: Eye,
      titulo: "Visitas ao catálogo",
      valor: resumo.visitas,
    },
    {
      icone: ShoppingCart,
      titulo: "Produtos adicionados ao carrinho",
      valor: resumo.adicoes,
    },
    {
      icone: MessageCircle,
      titulo: "Pedidos enviados pelo WhatsApp",
      valor: resumo.whatsapp,
      nota: `${resumo.conversao}% das visitas`,
    },
    {
      icone: FileDown,
      titulo: "Orçamentos em PDF",
      valor: resumo.pdfs,
    },
  ];

  return (
    <main className="metricas-pagina">
      <header className="metricas-topo">
        <button type="button" onClick={() => navigate("/admin")}>
          <ArrowLeft size={18} />
          Voltar ao painel
        </button>

        <div className="metricas-titulo">
          <div>
            <h1>Métricas do catálogo</h1>
            <p>
              Veja o que seus clientes estão fazendo no seu
              catálogo.
            </p>
          </div>

          <div
            className="metricas-periodos"
            role="group"
            aria-label="Período"
          >
            {PERIODOS.map((periodo) => (
              <button
                className={
                  dias === periodo.dias ? "ativo" : ""
                }
                key={periodo.dias}
                type="button"
                onClick={() => setDias(periodo.dias)}
              >
                {periodo.texto}
              </button>
            ))}
          </div>
        </div>
      </header>

      {erro && <p className="metricas-erro">{erro}</p>}

      {carregando ? (
        <p className="metricas-carregando">Carregando métricas...</p>
      ) : (
        !erro && (
          <>
            <section className="metricas-cartoes">
              {cartoes.map((cartao) => {
                const Icone = cartao.icone;

                return (
                  <article key={cartao.titulo}>
                    <span>
                      <Icone size={21} />
                    </span>

                    <strong>{cartao.valor}</strong>

                    <p>{cartao.titulo}</p>

                    {cartao.nota && <small>{cartao.nota}</small>}
                  </article>
                );
              })}
            </section>

            <section className="metricas-caixa">
              <h2>
                <BarChart3 size={19} />
                Visitas por dia
              </h2>

              <div className="metricas-grafico">
                {resumo.serie.map((dia) => (
                  <div
                    className="metricas-barra"
                    key={dia.chave}
                    title={`${dia.rotulo}: ${dia.valor} visita(s)`}
                  >
                    <div
                      style={{
                        height: `${
                          (dia.valor / resumo.maximoSerie) * 100
                        }%`,
                      }}
                    />
                    <span>
                      {resumo.serie.length <= 10
                        ? dia.rotulo
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <div className="metricas-duas-colunas">
              <section className="metricas-caixa">
                <h2>
                  <ShoppingCart size={19} />
                  Mais adicionados ao carrinho
                </h2>

                {resumo.topProdutos.length === 0 ? (
                  <p className="metricas-vazio">
                    Ainda não há dados neste período.
                  </p>
                ) : (
                  <ol className="metricas-lista">
                    {resumo.topProdutos.map(([id, total]) => (
                      <li key={id}>
                        <span>
                          {produtos.get(id) ??
                            "Produto removido"}
                        </span>
                        <strong>{total}</strong>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="metricas-caixa">
                <h2>
                  <SearchX size={19} />
                  Buscas sem resultado
                </h2>

                {resumo.termos.length === 0 ? (
                  <p className="metricas-vazio">
                    Nenhuma busca sem resultado. 
                  </p>
                ) : (
                  <>
                    <p className="metricas-dica">
                      Produtos que seus clientes procuraram e
                      você ainda não tem cadastrados.
                    </p>

                    <ol className="metricas-lista">
                      {resumo.termos.map(([termo, total]) => (
                        <li key={termo}>
                          <span>{termo}</span>
                          <strong>{total}</strong>
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </section>
            </div>

            <section className="metricas-caixa">
              <h2>
                <MessageCircle size={19} />
                Pedidos por atendente
              </h2>

              {resumo.porVendedor.length === 0 ? (
                <p className="metricas-vazio">
                  Ainda não há pedidos enviados neste período.
                </p>
              ) : (
                <ol className="metricas-lista">
                  {resumo.porVendedor.map(([id, total]) => (
                    <li key={id}>
                      <span>
                        {id === "geral"
                          ? "Contato geral da empresa"
                          : vendedores.get(id) ??
                            "Vendedor removido"}
                      </span>
                      <strong>{total}</strong>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <p className="metricas-rodape">
              Os números começam a ser contados a partir da
              atualização. Visitas são contadas uma vez por
              sessão do visitante.
            </p>
          </>
        )
      )}
    </main>
  );
}

export default Metricas;
