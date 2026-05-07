import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, userContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

    const contextBlock = userContext ? `
PAINEL FINANCEIRO EM TEMPO REAL:
┌─────────────────────────────────────┐
│ Saldo Real:        R$ ${(userContext.real ?? 0).toFixed(2).padStart(10)}  │
│ A Pagar:           R$ ${(userContext.toPay ?? 0).toFixed(2).padStart(10)}  │
│ Saldo Disponível:  R$ ${(userContext.available ?? 0).toFixed(2).padStart(10)}  │
│ Receita do Mês:    R$ ${(userContext.income ?? 0).toFixed(2).padStart(10)}  │
│ Despesas do Mês:   R$ ${(userContext.expenses ?? 0).toFixed(2).padStart(10)}  │
│ Pode Gastar Hoje:  R$ ${(userContext.dailyBudget ?? 0).toFixed(2).padStart(10)}  │
│ Dias Restantes:    ${String(userContext.daysLeft ?? 0).padStart(13)}  │
└─────────────────────────────────────┘

CARTÕES DE CRÉDITO: ${userContext.cards || "Nenhum cadastrado"}
METAS DE INVESTIMENTO: ${userContext.goals || "Nenhuma definida"}

CONTAS A VENCER: ${userContext.upcomingBills || "Nenhuma pendente"}

MAIORES CATEGORIAS DE GASTO (mês atual):
${userContext.topCategories || "Sem dados"}

ÚLTIMAS TRANSAÇÕES:
${userContext.recentTransactions || "Nenhuma"}

PREFERÊNCIA DE CONVERSA: ${userContext.chatStyle || "Ainda não definida"}` : "\n[Dados financeiros indisponíveis no momento]";

    // Transform messages: if any message has images/files, format for multimodal
    const formattedMessages = messages.map((msg: any) => {
      if (msg.role === "user" && msg.attachments && msg.attachments.length > 0) {
        const content: any[] = [];
        if (msg.content) {
          content.push({ type: "text", text: msg.content });
        }
        for (const att of msg.attachments) {
          if (att.type === "image") {
            content.push({
              type: "image_url",
              image_url: { url: att.data },
            });
          } else if (att.type === "document") {
            content.push({
              type: "text",
              text: `[Documento anexado: ${att.name}]\n\n${att.extractedText || "Conteúdo não disponível para leitura."}`,
            });
          }
        }
        return { role: msg.role, content };
      }
      return { role: msg.role, content: msg.content };
    });

    const systemPrompt = `Você é o Spark IA, motor analítico do Spark Finance. Tom: TÉCNICO, DIRETO, focado em resultados acionáveis. Sem introduções genéricas, sem saudações, sem explicar conceitos básicos de finanças.

Data de hoje: ${today} (dia ${dayOfMonth} de ${daysInMonth}).

${contextBlock}

ESTRUTURA OBRIGATÓRIA DE RESPOSTA (Chain-of-Thought visível):
Toda resposta DEVE seguir EXATAMENTE este formato em Markdown, com os 4 blocos abaixo, nesta ordem, e depois a Conclusão. Use cabeçalhos ## para cada seção.

## Identificação
Decomponha as variáveis relevantes (valores, datas, categorias, contas envolvidas) em lista (bullets com hífen).

## Análise de Padrões
Cruze dados, aponte tendências, comparações relativas (% sobre receita, sobre média, etc.). Use lista ou tabela curta.

## Projeção
Calcule o impacto em 30, 60 e 90 dias. SEMPRE apresente como tabela Markdown:

| Horizonte | Cenário Atual | Risco |
|---|---|---|
| 30 dias | R$ X | ... |
| 60 dias | R$ X | ... |
| 90 dias | R$ X | ... |

## Otimização
Sugestão imediata e objetiva (1 a 3 ações), com ganho estimado em R$ ou %. Use lista numerada.

## Conclusão
Uma frase única, acionável.

REGRAS DE FORMATAÇÃO:
- Use Markdown: ## para títulos, **negrito** para destaques, tabelas | | |, listas com - ou 1.
- PROIBIDO usar o caractere travessão (—) ou meia-risca (–) em qualquer lugar. Use vírgula, dois pontos ou ponto.
- PROIBIDO usar tags HTML.
- Valores: R$ 1.234,56 (formato BR).
- Sem emojis decorativos. Sem disclaimers. Sem "espero ter ajudado".

ANÁLISE DE ANEXOS (imagens de extrato/planilha/comprovante):
Quando o usuário enviar imagem ou documento, execute a análise AUTOMATICAMENTE seguindo a estrutura acima, projetando o fechamento do mês com base nos dados extraídos. Não pergunte "o que você quer saber"; entregue diagnóstico direto.

CAPACIDADES E LIMITES:
- Você é READ-ONLY. NÃO cria, edita ou exclui transações. Se pedirem ação de escrita, diga: "Não executo ações de escrita. Registre via aba Despesas." e siga com análise.
- Nunca invente números. Use apenas o painel acima.
- Nunca peça senhas ou dados sensíveis.

Identidade: Spark IA, criado por Erick Milhomens (Erick Developer), 19/03/2026.
Idioma: português brasileiro.
Responda sempre em português brasileiro.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...formattedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
