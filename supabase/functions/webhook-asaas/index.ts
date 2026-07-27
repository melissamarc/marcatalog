import { createClient } from "npm:@supabase/supabase-js@2";

function responder(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function calcularFimPeriodo(
  dataInicial: string,
  periodicidade: string
) {
  const data = new Date(`${dataInicial}T12:00:00.000Z`);

  if (periodicidade.toLowerCase() === "anual") {
    data.setUTCFullYear(data.getUTCFullYear() + 1);
  } else {
    data.setUTCMonth(data.getUTCMonth() + 1);
  }

  return data.toISOString();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return responder({ erro: "Método não permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );
    const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");

    if (!supabaseUrl || !serviceRoleKey || !webhookToken) {
      return responder(
        { erro: "Configurações do servidor incompletas." },
        500
      );
    }

    const tokenRecebido = req.headers.get("asaas-access-token");

    if (!tokenRecebido || tokenRecebido !== webhookToken) {
      return responder({ erro: "Token do webhook inválido." }, 401);
    }

    const corpo = await req.json();
    const evento = corpo?.event;
    const pagamento = corpo?.payment;
    const assinaturaAsaasId = pagamento?.subscription;

    if (!evento || !assinaturaAsaasId) {
      return responder({
        recebido: true,
        ignorado: true,
      });
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    const { data: assinatura, error: erroAssinatura } =
      await supabaseAdmin
        .from("assinaturas")
        .select("id, plano_id, status")
        .eq("asaas_assinatura_id", assinaturaAsaasId)
        .maybeSingle();

    if (erroAssinatura) {
      console.error(erroAssinatura);

      return responder(
        { erro: "Não foi possível consultar a assinatura." },
        500
      );
    }

    if (!assinatura) {
      return responder({
        recebido: true,
        ignorado: true,
        motivo: "Assinatura não encontrada.",
      });
    }

    const eventosPagamentoConfirmado = [
      "PAYMENT_CONFIRMED",
      "PAYMENT_RECEIVED",
    ];

    const eventosPagamentoCancelado = [
      "PAYMENT_REFUNDED",
      "PAYMENT_RECEIVED_IN_CASH_UNDONE",
      "PAYMENT_CHARGEBACK_REQUESTED",
    ];

    if (eventosPagamentoConfirmado.includes(evento)) {
      const { data: plano, error: erroPlano } =
        await supabaseAdmin
          .from("planos")
          .select("periodicidade")
          .eq("id", assinatura.plano_id)
          .maybeSingle();

      if (erroPlano || !plano) {
        return responder(
          { erro: "Plano da assinatura não encontrado." },
          500
        );
      }

      const dataInicio =
        pagamento.paymentDate ||
        pagamento.confirmedDate ||
        pagamento.dueDate ||
        new Date().toISOString().split("T")[0];

      const periodoInicio = new Date(
        `${dataInicio}T00:00:00.000Z`
      ).toISOString();

      const periodoFim = calcularFimPeriodo(
        dataInicio,
        plano.periodicidade
      );

      const { error: erroAtualizar } = await supabaseAdmin
        .from("assinaturas")
        .update({
          status: "ativa",
          periodo_inicio: periodoInicio,
          periodo_fim: periodoFim,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", assinatura.id);

      if (erroAtualizar) {
        console.error(erroAtualizar);

        return responder(
          { erro: "Não foi possível ativar a assinatura." },
          500
        );
      }

      return responder({
        recebido: true,
        assinaturaAtivada: true,
      });
    }

    if (evento === "PAYMENT_OVERDUE") {
      const { error: erroAtualizar } = await supabaseAdmin
        .from("assinaturas")
        .update({
          status: "atrasada",
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", assinatura.id);

      if (erroAtualizar) {
        return responder(
          { erro: "Não foi possível atualizar a assinatura." },
          500
        );
      }

      return responder({
        recebido: true,
        assinaturaAtrasada: true,
      });
    }

    if (eventosPagamentoCancelado.includes(evento)) {
      const { error: erroAtualizar } = await supabaseAdmin
        .from("assinaturas")
        .update({
          status: "cancelada",
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", assinatura.id);

      if (erroAtualizar) {
        return responder(
          { erro: "Não foi possível cancelar a assinatura." },
          500
        );
      }

      return responder({
        recebido: true,
        assinaturaCancelada: true,
      });
    }

    return responder({
      recebido: true,
      ignorado: true,
      evento,
    });
  } catch (erro) {
    console.error(erro);

    return responder(
      { erro: "Erro inesperado no webhook." },
      500
    );
  }
});