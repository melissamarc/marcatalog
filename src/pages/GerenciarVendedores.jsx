import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  MessageCircle,
  Plus,
  Save,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import "./GerenciarVendedores.css";

function GerenciarVendedores() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [empresa, setEmpresa] = useState(null);
  const [vendedores, setVendedores] = useState([]);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [vendedorEditando, setVendedorEditando] =
    useState(null);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    async function carregarDados() {
      setCarregando(true);
      setErro("");

      const { data: dadosEmpresa, error: erroEmpresa } =
        await supabase
          .from("empresas")
          .select("id, nome, whatsapp")
          .eq("usuario_id", usuario.id)
          .maybeSingle();

      if (erroEmpresa || !dadosEmpresa) {
        setErro("Não foi possível carregar sua empresa.");
        setCarregando(false);
        return;
      }

      const { data: dadosVendedores, error: erroVendedores } =
        await supabase
          .from("vendedores")
          .select("*")
          .eq("empresa_id", dadosEmpresa.id)
          .order("nome", { ascending: true });

      if (erroVendedores) {
        setErro("Não foi possível carregar os vendedores.");
        setCarregando(false);
        return;
      }

      setEmpresa(dadosEmpresa);
      setVendedores(dadosVendedores ?? []);
      setCarregando(false);
    }

    if (usuario?.id) {
      carregarDados();
    }
  }, [usuario]);

  function somenteNumeros(valor) {
    return valor.replace(/\D/g, "");
  }

  function formatarWhatsapp(numero) {
    const digitos = somenteNumeros(numero);

    const numeroSemPais =
      digitos.startsWith("55") && digitos.length >= 12
        ? digitos.slice(2)
        : digitos;

    if (numeroSemPais.length === 11) {
      return numeroSemPais.replace(
        /(\d{2})(\d{5})(\d{4})/,
        "($1) $2-$3"
      );
    }

    if (numeroSemPais.length === 10) {
      return numeroSemPais.replace(
        /(\d{2})(\d{4})(\d{4})/,
        "($1) $2-$3"
      );
    }

    return numero;
  }

  function limparFormulario() {
    setNome("");
    setWhatsapp("");
    setVendedorEditando(null);
  }

  function editarVendedor(vendedor) {
    setVendedorEditando(vendedor);
    setNome(vendedor.nome);
    setWhatsapp(vendedor.whatsapp);
    setErro("");
    setMensagem("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function salvarVendedor(evento) {
    evento.preventDefault();

    setSalvando(true);
    setErro("");
    setMensagem("");

    const nomeLimpo = nome.trim();
    const whatsappLimpo = somenteNumeros(whatsapp);

    if (nomeLimpo.length < 2) {
      setErro("Informe o nome do vendedor.");
      setSalvando(false);
      return;
    }

    if (
      whatsappLimpo.length < 10 ||
      whatsappLimpo.length > 13
    ) {
      setErro(
        "Informe um WhatsApp válido com DDD. O código 55 é opcional."
      );
      setSalvando(false);
      return;
    }

    if (vendedorEditando) {
      const { data, error } = await supabase
        .from("vendedores")
        .update({
          nome: nomeLimpo,
          whatsapp: whatsappLimpo,
        })
        .eq("id", vendedorEditando.id)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          setErro(
            "Já existe um vendedor com esse WhatsApp."
          );
        } else {
          setErro(
            `Não foi possível atualizar: ${error.message}`
          );
        }

        setSalvando(false);
        return;
      }

      setVendedores((vendedoresAtuais) =>
        vendedoresAtuais
          .map((vendedor) =>
            vendedor.id === data.id ? data : vendedor
          )
          .sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR")
          )
      );

      setMensagem("Vendedor atualizado com sucesso.");
    } else {
      const { data, error } = await supabase
        .from("vendedores")
        .insert({
          empresa_id: empresa.id,
          nome: nomeLimpo,
          whatsapp: whatsappLimpo,
          ativo: true,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          setErro(
            "Já existe um vendedor com esse WhatsApp."
          );
        } else {
          setErro(
            `Não foi possível cadastrar: ${error.message}`
          );
        }

        setSalvando(false);
        return;
      }

      setVendedores((vendedoresAtuais) =>
        [...vendedoresAtuais, data].sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR")
        )
      );

      setMensagem("Vendedor cadastrado com sucesso.");
    }

    limparFormulario();
    setSalvando(false);
  }

  async function alterarSituacao(vendedor) {
    setErro("");
    setMensagem("");

    const novoStatus = !vendedor.ativo;

    const { data, error } = await supabase
      .from("vendedores")
      .update({
        ativo: novoStatus,
      })
      .eq("id", vendedor.id)
      .select()
      .single();

    if (error) {
      setErro("Não foi possível alterar o vendedor.");
      return;
    }

    setVendedores((vendedoresAtuais) =>
      vendedoresAtuais.map((item) =>
        item.id === vendedor.id ? data : item
      )
    );

    setMensagem(
      novoStatus
        ? "Vendedor ativado com sucesso."
        : "Vendedor desativado. Ele não aparecerá no catálogo."
    );
  }

  async function excluirVendedor(vendedor) {
    const confirmou = window.confirm(
      `Deseja realmente excluir o vendedor ${vendedor.nome}?`
    );

    if (!confirmou) {
      return;
    }

    setErro("");
    setMensagem("");

    const { error } = await supabase
      .from("vendedores")
      .delete()
      .eq("id", vendedor.id);

    if (error) {
      setErro("Não foi possível excluir o vendedor.");
      return;
    }

    setVendedores((vendedoresAtuais) =>
      vendedoresAtuais.filter(
        (item) => item.id !== vendedor.id
      )
    );

    if (vendedorEditando?.id === vendedor.id) {
      limparFormulario();
    }

    setMensagem("Vendedor excluído com sucesso.");
  }

  if (carregando) {
    return (
      <main className="vendedores-carregando">
        <div />
        <p>Carregando vendedores...</p>
      </main>
    );
  }

  const vendedoresAtivos = vendedores.filter(
    (vendedor) => vendedor.ativo
  ).length;

  return (
    <main className="vendedores-pagina">
      <header className="vendedores-topo">
        <button
          type="button"
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft size={18} />
          Voltar ao painel
        </button>

        <div>
          <p>Equipe comercial</p>
          <h1>Gerenciar vendedores</h1>
          <span>
            Cadastre os vendedores que poderão receber pedidos
            pelo WhatsApp.
          </span>
        </div>
      </header>

      <section className="vendedores-resumo">
        <article>
          <span>
            <UsersRound size={22} />
          </span>

          <div>
            <strong>{vendedores.length}</strong>
            <p>Vendedores cadastrados</p>
          </div>
        </article>

        <article>
          <span>
            <MessageCircle size={22} />
          </span>

          <div>
            <strong>{vendedoresAtivos}</strong>
            <p>Disponíveis no catálogo</p>
          </div>
        </article>
      </section>

      <section className="vendedores-conteudo">
        <form
          className="vendedores-formulario"
          onSubmit={salvarVendedor}
        >
          <div className="vendedores-card-titulo">
            <span>
              {vendedorEditando ? (
                <Edit3 size={21} />
              ) : (
                <Plus size={21} />
              )}
            </span>

            <div>
              <h2>
                {vendedorEditando
                  ? "Editar vendedor"
                  : "Adicionar vendedor"}
              </h2>

              <p>
                Informe o nome e o WhatsApp com DDD.
              </p>
            </div>
          </div>

          <div className="vendedores-campo">
            <label htmlFor="nomeVendedor">
              Nome do vendedor
            </label>

            <div>
              <UserRound size={18} />

              <input
                id="nomeVendedor"
                type="text"
                value={nome}
                onChange={(evento) =>
                  setNome(evento.target.value)
                }
                placeholder="Ex.: Fulano"
                maxLength={80}
                required
              />
            </div>
          </div>

          <div className="vendedores-campo">
            <label htmlFor="whatsappVendedor">
              WhatsApp
            </label>

            <div>
              <MessageCircle size={18} />

              <input
                id="whatsappVendedor"
                type="tel"
                value={whatsapp}
                onChange={(evento) =>
                  setWhatsapp(evento.target.value)
                }
                placeholder="11999999999"
                maxLength={16}
                required
              />
            </div>

            <small>
              O código do Brasil 55 é opcional.
            </small>
          </div>

          {erro && (
            <p className="vendedores-mensagem erro">
              {erro}
            </p>
          )}

          {mensagem && (
            <p className="vendedores-mensagem sucesso">
              {mensagem}
            </p>
          )}

          <div className="vendedores-formulario-acoes">
            {vendedorEditando && (
              <button
                className="vendedores-cancelar"
                type="button"
                onClick={limparFormulario}
              >
                <X size={18} />
                Cancelar
              </button>
            )}

            <button
              className="vendedores-salvar"
              type="submit"
              disabled={salvando}
            >
              <Save size={18} />

              {salvando
                ? "Salvando..."
                : vendedorEditando
                  ? "Salvar alterações"
                  : "Adicionar vendedor"}
            </button>
          </div>
        </form>

        <section className="vendedores-lista">
          <div className="vendedores-lista-topo">
            <div>
              <p>Vendedores</p>
              <h2>Equipe cadastrada</h2>
            </div>

            <span>{vendedores.length}</span>
          </div>

          {vendedores.length === 0 ? (
            <div className="vendedores-vazio">
              <span>
                <UsersRound size={30} />
              </span>

              <h3>Nenhum vendedor cadastrado</h3>

              <p>
                Sem vendedores, os pedidos continuam sendo
                enviados para o WhatsApp principal da empresa.
              </p>
            </div>
          ) : (
            <div className="vendedores-grid">
              {vendedores.map((vendedor) => (
                <article
                  className={
                    vendedor.ativo
                      ? "vendedor-card"
                      : "vendedor-card inativo"
                  }
                  key={vendedor.id}
                >
                  <div className="vendedor-identidade">
                    <span>
                      {vendedor.nome
                        .charAt(0)
                        .toUpperCase()}
                    </span>

                    <div>
                      <strong>{vendedor.nome}</strong>

                      <small>
                        {formatarWhatsapp(
                          vendedor.whatsapp
                        )}
                      </small>
                    </div>
                  </div>

                  <span
                    className={
                      vendedor.ativo
                        ? "vendedor-status ativo"
                        : "vendedor-status"
                    }
                  >
                    {vendedor.ativo
                      ? "Ativo"
                      : "Inativo"}
                  </span>

                  <div className="vendedor-acoes">
                    <button
                      type="button"
                      onClick={() =>
                        editarVendedor(vendedor)
                      }
                    >
                      <Edit3 size={16} />
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        alterarSituacao(vendedor)
                      }
                    >
                      {vendedor.ativo
                        ? "Desativar"
                        : "Ativar"}
                    </button>

                    <button
                      className="vendedor-excluir"
                      type="button"
                      aria-label={`Excluir ${vendedor.nome}`}
                      onClick={() =>
                        excluirVendedor(vendedor)
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default GerenciarVendedores;