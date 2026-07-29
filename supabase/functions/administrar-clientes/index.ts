import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function responder(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function gerarSenhaTemporaria() {
  return `${crypto.randomUUID()}Aa1!`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return responder({ erro: "Método não permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey
    ) {
      return responder(
        { erro: "Configurações do servidor incompletas." },
        500
      );
    }

    const authorization = req.headers.get("Authorization");

    if (!authorization) {
      return responder({ erro: "Usuário não autenticado." }, 401);
    }

    const token = authorization.replace("Bearer ", "");

    const supabaseUsuario = createClient(
      supabaseUrl,
      supabaseAnonKey
    );

    const {
      data: { user },
      error: erroUsuario,
    } = await supabaseUsuario.auth.getUser(token);

    if (erroUsuario || !user) {
      return responder({ erro: "Sessão inválida ou expirada." }, 401);
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    const { data: administrador, error: erroAdministrador } =
      await supabaseAdmin
        .from("administradores_plataforma")
        .select("usuario_id")
        .eq("usuario_id", user.id)
        .maybeSingle();

    if (erroAdministrador || !administrador) {
      return responder(
        { erro: "Você não possui permissão de administradora." },
        403
      );
    }

    const corpo = await req.json();
    const acao = corpo?.acao;

    if (acao === "listar") {
      const { data: dadosUsuarios, error: erroUsuarios } =
        await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

      if (erroUsuarios) {
        return responder(
          { erro: "Não foi possível carregar os clientes." },
          500
        );
      }

      const { data: assinaturas, error: erroAssinaturas } =
        await supabaseAdmin
          .from("assinaturas")
          .select(
            "usuario_id, status, origem, periodo_inicio, periodo_fim"
          );

      if (erroAssinaturas) {
        return responder(
          { erro: "Não foi possível carregar os acessos." },
          500
        );
      }

      const { data: empresas, error: erroEmpresas } =
        await supabaseAdmin
          .from("empresas")
          .select("id, usuario_id, nome, slug, ativo, criado_em");

      if (erroEmpresas) {
        return responder(
          { erro: "Não foi possível carregar as empresas." },
          500
        );
      }

      const clientes = dadosUsuarios.users.map(
        (usuarioCadastrado) => {
          const assinatura = assinaturas?.find(
            (item) =>
              item.usuario_id === usuarioCadastrado.id
          );

          const empresa = empresas?.find(
            (item) =>
              item.usuario_id === usuarioCadastrado.id
          );

          return {
            id: usuarioCadastrado.id,
            email: usuarioCadastrado.email,
            criadoEm: usuarioCadastrado.created_at,
            ultimoAcesso:
              usuarioCadastrado.last_sign_in_at || null,
            emailConfirmado:
              Boolean(usuarioCadastrado.email_confirmed_at),
            status: assinatura?.status || "sem_acesso",
            origem: assinatura?.origem || null,
            periodoInicio:
              assinatura?.periodo_inicio || null,
            periodoFim: assinatura?.periodo_fim || null,
            empresa: empresa
              ? {
                  id: empresa.id,
                  nome: empresa.nome,
                  slug: empresa.slug,
                  ativo: empresa.ativo,
                  criadoEm: empresa.criado_em,
                }
              : null,
          };
        }
      );

      clientes.sort(
        (a, b) =>
          new Date(b.criadoEm).getTime() -
          new Date(a.criadoEm).getTime()
      );

      return responder({
        sucesso: true,
        clientes,
      });
    }

    if (acao === "criar") {
      const email = corpo?.email?.trim().toLowerCase();

      if (
        !email ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        return responder(
          { erro: "Informe um e-mail válido." },
          400
        );
      }

      const senhaTemporaria = gerarSenhaTemporaria();

      const {
        data: novoUsuario,
        error: erroCriarUsuario,
      } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: senhaTemporaria,
        email_confirm: true,
      });

      if (erroCriarUsuario || !novoUsuario.user) {
        const mensagem =
          erroCriarUsuario?.message?.toLowerCase().includes(
            "already"
          )
            ? "Já existe uma conta com esse e-mail."
            : "Não foi possível criar a conta.";

        return responder({ erro: mensagem }, 400);
      }

      const usuarioId = novoUsuario.user.id;

      const { data: assinaturaExistente } =
        await supabaseAdmin
          .from("assinaturas")
          .select("id")
          .eq("usuario_id", usuarioId)
          .maybeSingle();

      let erroLiberacao = null;

      if (assinaturaExistente) {
        const { error } = await supabaseAdmin
          .from("assinaturas")
          .update({
            status: "ativa",
            origem: "manual",
            periodo_inicio: new Date().toISOString(),
            periodo_fim: null,
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", assinaturaExistente.id);

        erroLiberacao = error;
      } else {
        const { error } = await supabaseAdmin
          .from("assinaturas")
          .insert({
            usuario_id: usuarioId,
            status: "ativa",
            origem: "manual",
            periodo_inicio: new Date().toISOString(),
            periodo_fim: null,
          });

        erroLiberacao = error;
      }

      if (erroLiberacao) {
        await supabaseAdmin.auth.admin.deleteUser(usuarioId);

        return responder(
          {
            erro:
              "Não foi possível liberar o acesso da nova conta.",
          },
          500
        );
      }

      return responder({
        sucesso: true,
        mensagem:
          "Conta criada e acesso liberado. Peça ao cliente para usar a recuperação de senha.",
        cliente: {
          id: usuarioId,
          email,
          status: "ativa",
        },
      });
    }

    if (acao === "liberar" || acao === "bloquear") {
      const usuarioId = corpo?.usuarioId;

      if (!usuarioId) {
        return responder(
          { erro: "Cliente não identificado." },
          400
        );
      }

      if (usuarioId === user.id && acao === "bloquear") {
        return responder(
          {
            erro:
              "Você não pode bloquear sua própria conta administrativa.",
          },
          400
        );
      }

      const novoStatus =
        acao === "liberar" ? "ativa" : "cancelada";

      const { data: assinaturaExistente } =
        await supabaseAdmin
          .from("assinaturas")
          .select("id")
          .eq("usuario_id", usuarioId)
          .maybeSingle();

      let erroAtualizacao = null;

      if (assinaturaExistente) {
        const { error } = await supabaseAdmin
          .from("assinaturas")
          .update({
            status: novoStatus,
            origem: "manual",
            periodo_inicio:
              acao === "liberar"
                ? new Date().toISOString()
                : null,
            periodo_fim:
              acao === "bloquear"
                ? new Date().toISOString()
                : null,
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", assinaturaExistente.id);

        erroAtualizacao = error;
      } else {
        const { error } = await supabaseAdmin
          .from("assinaturas")
          .insert({
            usuario_id: usuarioId,
            status: novoStatus,
            origem: "manual",
            periodo_inicio:
              acao === "liberar"
                ? new Date().toISOString()
                : null,
            periodo_fim:
              acao === "bloquear"
                ? new Date().toISOString()
                : null,
          });

        erroAtualizacao = error;
      }

      if (erroAtualizacao) {
        return responder(
          {
            erro:
              "Não foi possível atualizar o acesso do cliente.",
          },
          500
        );
      }

      return responder({
        sucesso: true,
        status: novoStatus,
      });
    }

    return responder({ erro: "Ação inválida." }, 400);
  } catch (erro) {
    console.error(erro);

    return responder(
      { erro: "Erro inesperado ao administrar clientes." },
      500
    );
  }
});