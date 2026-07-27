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
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    const asaasApiUrl = Deno.env.get("ASAAS_API_URL");

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey ||
      !asaasApiKey ||
      !asaasApiUrl
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

    const { data: assinatura, error: erroAssinatura } =
      await supabaseAdmin
        .from("assinaturas")
        .select(`
          id,
          status,
          origem,
          asaas_assinatura_id,
          periodo_fim
        `)
        .eq("usuario_id", user.id)
        .maybeSingle();

    if (erroAssinatura) {
      return responder(
        { erro: "Não foi possível consultar sua assinatura." },
        500
      );
    }

    if (!assinatura) {
      return responder(
        { erro: "Nenhuma assinatura foi encontrada." },
        404
      );
    }

    if (assinatura.status === "cancelada") {
      return responder({
        sucesso: true,
        status: "cancelada",
        mensagem: "A assinatura já estava cancelada.",
      });
    }

    if (
      assinatura.origem === "asaas" &&
      assinatura.asaas_assinatura_id
    ) {
      const respostaAsaas = await fetch(
        `${asaasApiUrl}/subscriptions/${assinatura.asaas_assinatura_id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            access_token: asaasApiKey,
            "User-Agent": "Marcatalog/1.0",
          },
        }
      );

      const respostaAsaasDados = await respostaAsaas.json();

      if (!respostaAsaas.ok) {
        const mensagem =
          respostaAsaasDados?.errors?.[0]?.description ||
          "Não foi possível cancelar a assinatura no Asaas.";

        return responder({ erro: mensagem }, 400);
      }
    }

    const { error: erroAtualizar } = await supabaseAdmin
      .from("assinaturas")
      .update({
        status: "cancelada",
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", assinatura.id);

    if (erroAtualizar) {
      return responder(
        {
          erro:
            "A cobrança automática foi cancelada, mas não foi possível atualizar o status.",
        },
        500
      );
    }

    return responder({
      sucesso: true,
      status: "cancelada",
      acessoAte: assinatura.periodo_fim,
    });
  } catch (erro) {
    console.error(erro);

    return responder(
      { erro: "Erro inesperado ao cancelar a assinatura." },
      500
    );
  }
});