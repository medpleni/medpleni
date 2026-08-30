import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createIuguPayment } from "@/lib/billing/iugu";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, planId, customer, paymentMethod, installments } = body;

    if (!userId || !planId || !customer?.email) {
      return NextResponse.json(
        { error: "Dados incompletos para o checkout." },
        { status: 400 }
      );
    }

    // Processa pagamento no Gateway Iugu
    const paymentResult = await createIuguPayment({
      userId,
      planId,
      customer,
      paymentMethod: paymentMethod || "credit_card",
      installments: installments || 1,
    });

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: paymentResult.message || "Falha ao processar pagamento." },
        { status: 400 }
      );
    }

    // Se o pagamento foi aprovado, atualiza o plano do usuário no Supabase
    if (paymentResult.status === "paid") {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase
        .from("profiles")
        .update({
          plano: planId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }

    return NextResponse.json(paymentResult);
  } catch (err: any) {
    console.error("Erro na rota de checkout:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
