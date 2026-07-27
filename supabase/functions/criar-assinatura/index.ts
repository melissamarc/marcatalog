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
    const supabaseServiceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    const asaasApiUrl = Deno.env.get("ASAAS_API_URL");

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !supabaseServiceRoleKey ||
      !asaasApiKey ||
      !asaasApiUrl
    ) {
      return responder(
        { erro: "As configurações do servidor estão incompletas." },
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

    const corpo = await req.json();

    const planoId = corpo.planoId;
    const nome = corpo.nome?.trim();
    const cpfCnpj = corpo.cpfCnpj?.replace(/\D/g, "");

    if (!planoId) {
      return responder({ erro: "Selecione um plano." }, 400);
    }

    if (!nome || nome.length < 3) {
      return responder({ erro: "Informe seu nome completo." }, 400);
    }

    if (
      !cpfCnpj ||
      (cpfCnpj.length !== 11 && cpfCnpj.length !== 14)
    ) {
      return responder({ erro: "Informe um CPF ou CNPJ válido." }, 400);
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    const { data: plano, error: erroPlano } = await supabaseAdmin
      .from("planos")
      .select("id, codigo, nome, periodicidade, preco, ativo")
      .eq("id", planoId)
      .eq("ativo", true)
      .maybeSingle();

    if (erroPlano || !plano) {
      return responder(
        { erro: "O plano selecionado não foi encontrado." },
        404
      );
    }

    const { data: assinaturaAtual, error: erroAssinatura } =
      await supabaseAdmin
        .from("assinaturas")
        .select("*")
        .eq("usuario_id", user.id)
        .maybeSingle();

    if (erroAssinatura) {
      return responder(
        { erro: "Não foi possível consultar sua assinatura." },
        500
      );
    }

    const headersAsaas = {
      "Content-Type": "application/json",
      access_token: asaasApiKey,
      "User-Agent": "Marcatalog/1.0",
    };

    const periodoAindaValido =
      assinaturaAtual?.periodo_fim &&
      new Date(assinaturaAtual.periodo_fim) > new Date();

    if (
      assinaturaAtual?.status === "ativa" &&
      (!assinaturaAtual.periodo_fim || periodoAindaValido)
    ) {
      return responder(
        {
          erro:
            "Você já possui uma assinatura ativa. Consulte a página Minha assinatura.",
          assinaturaAtiva: true,
        },
        409
      );
    }

    if (
      assinaturaAtual?.status === "cancelada" &&
      periodoAindaValido
    ) {
      return responder(
        {
          erro:
            "Sua assinatura foi cancelada, mas o acesso continua ativo até o fim do período já pago.",
          assinaturaAtiva: true,
        },
        409
      );
    }

    if (
      assinaturaAtual?.status === "pendente" &&
      assinaturaAtual.asaas_assinatura_id &&
      assinaturaAtual.plano_id === plano.id
    ) {
      const respostaCobrancasPendentes = await fetch(
        `${asaasApiUrl}/payments?subscription=${assinaturaAtual.asaas_assinatura_id}&limit=10`,
        {
          method: "GET",
          headers: headersAsaas,
        }
      );

      const cobrancasPendentes =
        await respostaCobrancasPendentes.json();

      const cobrancaPendente =
        cobrancasPendentes?.data?.find(
          (cobranca: { status?: string; deleted?: boolean }) =>
            !cobranca.deleted &&
            !["RECEIVED", "CONFIRMED", "REFUNDED"].includes(
              cobranca.status || ""
            )
        ) || cobrancasPendentes?.data?.[0];

      if (
        respostaCobrancasPendentes.ok &&
        cobrancaPendente?.invoiceUrl
      ) {
        return responder({
          sucesso: true,
          reutilizada: true,
          assinaturaId:
            assinaturaAtual.asaas_assinatura_id,
          cobrancaId: cobrancaPendente.id,
          linkPagamento: cobrancaPendente.invoiceUrl,
        });
      }
    }

    if (
      assinaturaAtual?.status === "pendente" &&
      assinaturaAtual.asaas_assinatura_id &&
      assinaturaAtual.plano_id !== plano.id
    ) {
      const respostaCancelarAnterior = await fetch(
        `${asaasApiUrl}/subscriptions/${assinaturaAtual.asaas_assinatura_id}`,
        {
          method: "DELETE",
          headers: headersAsaas,
        }
      );

      if (
        !respostaCancelarAnterior.ok &&
        respostaCancelarAnterior.status !== 404
      ) {
        const dadosErroCancelamento =
          await respostaCancelarAnterior.json();

        const mensagem =
          dadosErroCancelamento?.errors?.[0]?.description ||
          "Não foi possível trocar o plano pendente.";

        return responder({ erro: mensagem }, 400);
      }
    }

    let asaasClienteId = assinaturaAtual?.asaas_cliente_id;

    if (!asaasClienteId) {
      const respostaCliente = await fetch(
        `${asaasApiUrl}/customers`,
        {
          method: "POST",
          headers: headersAsaas,
          body: JSON.stringify({
            name: nome,
            cpfCnpj,
            email: user.email,
            externalReference: user.id,
            notificationDisabled: false,
          }),
        }
      );

      const clienteAsaas = await respostaCliente.json();

      if (!respostaCliente.ok) {
        const mensagem =
          clienteAsaas?.errors?.[0]?.description ||
          "Não foi possível criar o cliente no Asaas.";

        return responder({ erro: mensagem }, 400);
      }

      asaasClienteId = clienteAsaas.id;
    }

    const periodicidade = String(plano.periodicidade).toLowerCase();

    const ciclo =
      periodicidade === "anual" ||
      periodicidade === "yearly"
        ? "YEARLY"
        : "MONTHLY";

    const hoje = new Date().toISOString().split("T")[0];

    const respostaAssinaturaAsaas = await fetch(
      `${asaasApiUrl}/subscriptions`,
      {
        method: "POST",
        headers: headersAsaas,
        body: JSON.stringify({
          customer: asaasClienteId,
          billingType: "UNDEFINED",
          value: Number(plano.preco),
          nextDueDate: hoje,
          cycle: ciclo,
          description: `Marcatalog - ${plano.nome}`,
          externalReference: user.id,
        }),
      }
    );

    const assinaturaAsaas =
      await respostaAssinaturaAsaas.json();

    if (!respostaAssinaturaAsaas.ok) {
      const mensagem =
        assinaturaAsaas?.errors?.[0]?.description ||
        "Não foi possível criar a assinatura no Asaas.";

      return responder({ erro: mensagem }, 400);
    }

    let erroSalvar = null;

    if (assinaturaAtual) {
      const { error } = await supabaseAdmin
        .from("assinaturas")
        .update({
          plano_id: plano.id,
          status: "pendente",
          origem: "asaas",
          asaas_cliente_id: asaasClienteId,
          asaas_assinatura_id: assinaturaAsaas.id,
          periodo_inicio: null,
          periodo_fim: null,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", assinaturaAtual.id);

      erroSalvar = error;
    } else {
      const { error } = await supabaseAdmin
        .from("assinaturas")
        .insert({
          usuario_id: user.id,
          plano_id: plano.id,
          status: "pendente",
          origem: "asaas",
          asaas_cliente_id: asaasClienteId,
          asaas_assinatura_id: assinaturaAsaas.id,
        });

      erroSalvar = error;
    }

    if (erroSalvar) {
      return responder(
        {
          erro:
            "A assinatura foi criada, mas não foi possível salvá-la.",
        },
        500
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const respostaCobrancas = await fetch(
      `${asaasApiUrl}/payments?subscription=${assinaturaAsaas.id}&limit=1`,
      {
        method: "GET",
        headers: headersAsaas,
      }
    );

    const cobrancas = await respostaCobrancas.json();
    const cobranca = cobrancas?.data?.[0];

    if (!respostaCobrancas.ok || !cobranca) {
      return responder(
        {
          erro:
            "A assinatura foi criada, mas a cobrança ainda não ficou disponível. Tente novamente em alguns segundos.",
        },
        500
      );
    }

    return responder({
      sucesso: true,
      reutilizada: false,
      assinaturaId: assinaturaAsaas.id,
      cobrancaId: cobranca.id,
      linkPagamento: cobranca.invoiceUrl,
    });
  } catch (erro) {
    console.error(erro);

    return responder(
      { erro: "Ocorreu um erro inesperado ao criar a assinatura." },
      500
    );
  }
});