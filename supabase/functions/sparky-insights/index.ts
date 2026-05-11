import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InsightInput {
  income: number;
  expenses: number;
  balance: number;
  available: number;
  daysLeft: number;
  dailyBudget: number;
  topCategories: { name: string; total: number; pctOfExpenses: number }[];
  recurringFixed: number;
  prevMonthExpenses?: number;
  goals?: { name: string; saved: number; target: number }[];
  cofrinhos?: { name: string; saved: number; target: number }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ctx = (await req.json()) as InsightInput;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const prompt = `Você é o Spark, analista financeiro brasileiro. Analise os dados abaixo e gere EXATAMENTE 3 insights personalizados, curtos e acionáveis em JSON.

DADOS:
- Receita do mês: R$ ${ctx.income.toFixed(2)}
- Despesas do mês: R$ ${ctx.expenses.toFixed(2)}
- Saldo disponível: R$ ${ctx.available.toFixed(2)}
- Dias restantes no mês: ${ctx.daysLeft}
- Pode gastar por dia: R$ ${ctx.dailyBudget.toFixed(2)}
- Despesas fixas recorrentes: R$ ${ctx.recurringFixed.toFixed(2)}
- Mês anterior (despesas): R$ ${(ctx.prevMonthExpenses ?? 0).toFixed(2)}
- Top categorias: ${ctx.topCategories.map(c => `${c.name} R$${c.total.toFixed(2)} (${c.pctOfExpenses.toFixed(0)}%)`).join(", ") || "nenhuma"}
- Cofrinhos: ${ctx.cofrinhos?.map(c => `${c.name} ${((c.saved / Math.max(1, c.target)) * 100).toFixed(0)}%`).join(", ") || "nenhum"}

REGRAS:
- Cada insight tem: "type" (warning|positive|tip|prediction), "icon" (emoji único), "title" (max 35 chars), "body" (1 frase, max 110 chars, em português, tom direto e amigável)
- Use NÚMEROS REAIS dos dados acima nos textos.
- Varie o tipo: pelo menos 1 positivo se mereceer, 1 alerta se mereceer, 1 dica preditiva.
- Se faltam dados (income=0 e expenses=0), retorne 1 insight "tip" pedindo para adicionar transações.

Responda APENAS um JSON válido: {"insights":[{...},{...},{...}]}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um analista financeiro brasileiro que responde APENAS em JSON válido." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 429) return new Response(JSON.stringify({ error: "rate_limit", insights: [] }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (res.status === 402) return new Response(JSON.stringify({ error: "no_credits", insights: [] }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${res.status} ${txt}`);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    const insights = Array.isArray(parsed.insights) ? parsed.insights.slice(0, 3) : [];

    return new Response(JSON.stringify({ insights, generatedAt: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("sparky-insights error", e);
    return new Response(JSON.stringify({ error: e.message || "unknown", insights: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
