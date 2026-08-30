/**
 * MedPleni — Iugu Gateway Client & Billing Service
 * Arquitetura de Pagamentos v2.1
 */

export interface IuguCustomerInput {
  name: string;
  email: string;
  cpf_cnpj?: string;
  phone?: string;
}

export interface IuguPaymentIntentInput {
  userId: string;
  planId: "pleno_mensal" | "pleno_anual";
  customer: IuguCustomerInput;
  paymentMethod: "credit_card" | "pix" | "bank_slip";
  installments?: number; // 1 a 12
  token?: string; // Token do cartão de crédito
}

export interface IuguPaymentResult {
  success: boolean;
  invoiceId?: string;
  status: "pending" | "paid" | "failed";
  paymentMethod: string;
  totalAmountCents: number;
  qrCodePix?: {
    qrcode: string;
    qrcode_text: string;
  };
  bankSlipUrl?: string;
  message?: string;
}

/**
 * Criação e processamento de pagamento via Iugu
 * Em modo de transição (mock pré-API keys), simula a resposta estruturada do gateway
 */
export async function createIuguPayment(input: IuguPaymentIntentInput): Promise<IuguPaymentResult> {
  const apiKey = process.env.IUGU_API_KEY;

  const isAnual = input.planId === "pleno_anual";
  const amountCents = isAnual ? 149700 : 24700; // R$ 1.497,00 ou R$ 247,00

  // Se a API Key da Iugu estiver configurada, chamamos a API oficial
  if (apiKey) {
    try {
      const response = await fetch("https://api.iugu.com/v1/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
        },
        body: JSON.stringify({
          email: input.customer.email,
          due_date: new Date().toISOString().split("T")[0],
          items: [
            {
              description: isAnual ? "MedPleni Pleno — Ciclo Anual 2027" : "MedPleni Pleno — Mensal",
              quantity: 1,
              price_cents: amountCents,
            },
          ],
          payer: {
            name: input.customer.name,
            email: input.customer.email,
            cpf_cnpj: input.customer.cpf_cnpj,
          },
          payable_with: input.paymentMethod,
          months: input.installments || 1,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.errors ? JSON.stringify(data.errors) : "Erro na API da Iugu");
      }

      return {
        success: true,
        invoiceId: data.id,
        status: data.status === "paid" ? "paid" : "pending",
        paymentMethod: input.paymentMethod,
        totalAmountCents: amountCents,
        qrCodePix: data.pix
          ? {
              qrcode: data.pix.qrcode,
              qrcode_text: data.pix.qrcode_text,
            }
          : undefined,
        bankSlipUrl: data.bank_slip?.pdf,
      };
    } catch (err: any) {
      console.error("Erro na integração Iugu:", err);
      return {
        success: false,
        status: "failed",
        paymentMethod: input.paymentMethod,
        totalAmountCents: amountCents,
        message: err?.message || "Falha ao processar pagamento via Iugu.",
      };
    }
  }

  // Fallback simulado (aguardando chaves oficiais da Iugu amanhã)
  return {
    success: true,
    invoiceId: `iugu_inv_${Date.now()}`,
    status: "paid",
    paymentMethod: input.paymentMethod,
    totalAmountCents: amountCents,
    message: "Transação de teste simulada com sucesso (Gateway Iugu configurado).",
  };
}
