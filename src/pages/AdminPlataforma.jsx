import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  Building2,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  UserCheck,
  Users,
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import "./AdminPlataforma.css";

function AdminPlataforma() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [alterandoId, setAlterandoId] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function extrairMensagemErro(error, mensagemPadrao) {
    try {
      const resposta = await error.context.json();
      return resposta?.erro || mensagemPadrao;
    } catch {
      return mensagemPadrao;
    }
  }

  const carregarClientes = useCallback(async () => {
    setErro("");

    const { data, error } = await supabase.functions.invoke(
      "administrar-clientes",
      {
        body: {
          acao: "listar",
        },
      }
    );

    if (error) {
      const mensagemErro = await extrairMensagemErro(
        error,
        "Não foi possível carregar os clientes."
      );

      setErro(mensagemErro);
      setCarregando(false);
      return;
    }

    setClientes(data?.clientes ?? []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregarClientes();
  }, [carregarClientes]);

  async function criarCliente(evento) {
    evento.preventDefault();

    setErro("");
    setMensagem("");
    setCriando(true);

    const { data, error } = await supabase.functions.invoke(
      "administrar-clientes",
      {
        body: {
          acao: "criar",
          email: novoEmail,
        },
      }
    );

    if (error) {
      const mensagemErro = await extrairMensagemErro(
        error,
        "Não foi possível criar a conta."
      );

      setErro(mensagemErro);
      setCriando(false);
      return;
    }

    setMensagem(
      data?.mensagem ||
        "Conta criada e acesso liberado com sucesso."
    );
    setNovoEmail("");
    setCriando(false);

    await carregarClientes();
  }

  async function alterarAcesso(cliente) {
    const clienteAtivo = cliente.status === "ativa";
    const acao = clienteAtivo ? "bloquear" : "liberar";

    setErro("");
    setMensagem("");
    setAlterandoId(cliente.id);

    const { data, error } = await supabase.functions.invoke(
      "administrar-clientes",
      {
        body: {
          acao,
          usuarioId: cliente.id,
        },
      }
    );

    if (error) {
      const mensagemErro = await extrairMensagemErro(
        error,
        "Não foi possível alterar o acesso."
      );

      setErro(mensagemErro);
      setAlterandoId("");
      return;
    }

    setClientes((clientesAtuais) =>
      clientesAtuais.map((item) =>
        item.id === cliente.id
          ? {
              ...item,
              status: data?.status,
              origem: "manual",
            }
          : item
      )
    );

    setMensagem(
      clienteAtivo
        ? `O acesso de ${cliente.email} foi bloqueado.`
        : `O acesso de ${cliente.email} foi liberado.`
    );

    setAlterandoId("");
  }

  function formatarData(data) {
    if (!data) {
      return "Nunca acessou";
    }

    return new Date(data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function nomeStatus(status) {
    const nomes = {
      ativa: "Acesso liberado",
      pendente: "Aguardando liberação",
      cancelada: "Acesso bloqueado",
      atrasada: "Acesso bloqueado",
      expirada: "Acesso expirado",
      sem_acesso: "Sem acesso",
    };

    return nomes[status] || status;
  }

  const clientesFiltrados = clientes.filter((cliente) => {
    const termo = busca.trim().toLowerCase();

    if (!termo) {
      return true;
    }

    return (
      cliente.email?.toLowerCase().includes(termo) ||
      cliente.empresa?.nome?.toLowerCase().includes(termo)
    );
  });

  const totalAtivos = clientes.filter(
    (cliente) => cliente.status === "ativa"
  ).length;

  const totalBloqueados = clientes.filter(
    (cliente) => cliente.status !== "ativa"
  ).length;

  const totalEmpresas = clientes.filter(
    (cliente) => cliente.empresa
  ).length;

  return (
    <main className="plataforma-pagina">
      <aside className="plataforma-sidebar">
        <div>
          <button
            className="plataforma-marca"
            type="button"
            onClick={() => navigate("/")}
          >
            <span>
              <Store size={22} />
            </span>

            Marcatalog
          </button>

          <div className="plataforma-administradora">
            <ShieldCheck size={18} />

            <div>
              <strong>Administração</strong>
              <small>{usuario?.email}</small>
            </div>
          </div>
        </div>

        <button
          className="plataforma-voltar"
          type="button"
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft size={18} />
          Voltar ao meu catálogo
        </button>
      </aside>

      <section className="plataforma-conteudo">
        <header className="plataforma-topo">
          <div>
            <p>Painel da proprietária</p>
            <h1>Clientes do Marcatalog</h1>

            <span>
              Crie contas e controle quem pode acessar a plataforma.
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setCarregando(true);
              carregarClientes();
            }}
            disabled={carregando}
          >
            <RefreshCw
              className={carregando ? "girando" : ""}
              size={18}
            />

            Atualizar
          </button>
        </header>

        <section className="plataforma-estatisticas">
          <article>
            <span className="cereja">
              <Users size={22} />
            </span>

            <div>
              <p>Contas cadastradas</p>
              <strong>{clientes.length}</strong>
            </div>
          </article>

          <article>
            <span className="verde">
              <UserCheck size={22} />
            </span>

            <div>
              <p>Acessos liberados</p>
              <strong>{totalAtivos}</strong>
            </div>
          </article>

          <article>
            <span className="vermelho">
              <Ban size={22} />
            </span>

            <div>
              <p>Acessos bloqueados</p>
              <strong>{totalBloqueados}</strong>
            </div>
          </article>

          <article>
            <span className="bege">
              <Building2 size={22} />
            </span>

            <div>
              <p>Empresas criadas</p>
              <strong>{totalEmpresas}</strong>
            </div>
          </article>
        </section>

        <section className="plataforma-novo-cliente">
          <div>
            <span>
              <Plus size={22} />
            </span>

            <div>
              <p>Novo cliente</p>
              <h2>Criar e liberar uma conta</h2>
            </div>
          </div>

          <form onSubmit={criarCliente}>
            <div>
              <Mail size={18} />

              <input
                type="email"
                value={novoEmail}
                onChange={(evento) =>
                  setNovoEmail(evento.target.value)
                }
                placeholder="email@cliente.com"
                required
                disabled={criando}
              />
            </div>

            <button type="submit" disabled={criando}>
              {criando ? (
                <>
                  <LoaderCircle
                    className="girando"
                    size={18}
                  />
                  Criando...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Criar conta
                </>
              )}
            </button>
          </form>

          <p>
            Depois, peça ao cliente para utilizar “Esqueci minha
            senha” e criar a própria senha de acesso.
          </p>
        </section>

        {erro && (
          <p className="plataforma-mensagem erro">
            {erro}
          </p>
        )}

        {mensagem && (
          <p className="plataforma-mensagem sucesso">
            <CheckCircle2 size={17} />
            {mensagem}
          </p>
        )}

        <section className="plataforma-clientes">
          <div className="plataforma-clientes-topo">
            <div>
              <p>Gerenciamento</p>
              <h2>Todos os clientes</h2>
            </div>

            <div className="plataforma-busca">
              <Search size={18} />

              <input
                type="search"
                value={busca}
                onChange={(evento) =>
                  setBusca(evento.target.value)
                }
                placeholder="Buscar por e-mail ou empresa"
              />
            </div>
          </div>

          {carregando ? (
            <div className="plataforma-carregando">
              <LoaderCircle className="girando" size={29} />
              <p>Carregando clientes...</p>
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="plataforma-vazio">
              <Users size={34} />
              <p>Nenhum cliente encontrado.</p>
            </div>
          ) : (
            <div className="plataforma-tabela-container">
              <table className="plataforma-tabela">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Empresa</th>
                    <th>Status</th>
                    <th>Último acesso</th>
                    <th>Controle</th>
                  </tr>
                </thead>

                <tbody>
                  {clientesFiltrados.map((cliente) => {
                    const clienteAtivo =
                      cliente.status === "ativa";

                    return (
                      <tr key={cliente.id}>
                        <td>
                          <div className="plataforma-cliente-email">
                            <span>
                              {cliente.email
                                ?.charAt(0)
                                .toUpperCase()}
                            </span>

                            <div>
                              <strong>{cliente.email}</strong>

                              <small>
                                Criada em{" "}
                                {formatarData(cliente.criadoEm)}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          {cliente.empresa ? (
                            <div className="plataforma-empresa">
                              <div>
                                <strong>
                                  {cliente.empresa.nome}
                                </strong>

                                <small>
                                  /catalogo/
                                  {cliente.empresa.slug}
                                </small>
                              </div>

                              <a
                                href={`${window.location.origin}/catalogo/${cliente.empresa.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                aria-label="Abrir catálogo"
                              >
                                <ExternalLink size={16} />
                              </a>
                            </div>
                          ) : (
                            <span className="plataforma-sem-empresa">
                              Ainda não cadastrada
                            </span>
                          )}
                        </td>

                        <td>
                          <span
                            className={`plataforma-status ${
                              clienteAtivo
                                ? "ativo"
                                : "bloqueado"
                            }`}
                          >
                            {clienteAtivo ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <Ban size={14} />
                            )}

                            {nomeStatus(cliente.status)}
                          </span>
                        </td>

                        <td>
                          <span className="plataforma-data">
                            {formatarData(
                              cliente.ultimoAcesso
                            )}
                          </span>
                        </td>

                        <td>
                          <button
                            className={
                              clienteAtivo
                                ? "plataforma-bloquear"
                                : "plataforma-liberar"
                            }
                            type="button"
                            onClick={() =>
                              alterarAcesso(cliente)
                            }
                            disabled={
                              alterandoId === cliente.id ||
                              cliente.id === usuario?.id
                            }
                          >
                            {alterandoId === cliente.id ? (
                              <LoaderCircle
                                className="girando"
                                size={16}
                              />
                            ) : clienteAtivo ? (
                              <Ban size={16} />
                            ) : (
                              <UserCheck size={16} />
                            )}

                            {cliente.id === usuario?.id
                              ? "Sua conta"
                              : alterandoId === cliente.id
                                ? "Aguarde..."
                                : clienteAtivo
                                  ? "Bloquear"
                                  : "Liberar"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default AdminPlataforma;