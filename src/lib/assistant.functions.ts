/** Assistant financier : questions en langage naturel sur les données du commerce. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayRunIdFetch } from "@/lib/ai-gateway.server";
import { cashBalance, netProfit, payables, receivables, revenue, cogs, totalExpenses } from "@/lib/finance";
import { num, round2 } from "@/lib/format";

const AskInput = z.object({
  question: z.string().min(2).max(500),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(10)
    .optional(),
});

type Row = Record<string, unknown>;

function money(n: number) {
  return `${round2(n).toFixed(2)} HTG`;
}

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Assistant indisponible : clé IA manquante.");

    const supabase = context.supabase;
    const [salesRes, expensesRes, purchasesRes, cashRes, productsRes, profileRes, customersRes] =
      await Promise.all([
        supabase.from("sales").select("*, customers(name)").order("sale_date", { ascending: false }).limit(400),
        supabase.from("expenses").select("*").order("expense_date", { ascending: false }).limit(300),
        supabase.from("purchases").select("*, suppliers(name)").order("purchase_date", { ascending: false }).limit(200),
        supabase.from("cash_transactions").select("type, amount, occurred_at").limit(2000),
        supabase.from("products").select("name, stock, min_stock, cost_price, sale_price, track_stock").limit(300),
        supabase.from("profiles").select("business_name, opening_cash").maybeSingle(),
        supabase.from("customers").select("id, name").limit(500),
      ]);

    const sales = (salesRes.data ?? []) as Row[];
    const expenses = (expensesRes.data ?? []) as Row[];
    const purchases = (purchasesRes.data ?? []) as Row[];
    const cash = (cashRes.data ?? []) as Row[];
    const products = (productsRes.data ?? []) as Row[];
    const profile = (profileRes.data ?? null) as Row | null;
    const customers = (customersRes.data ?? []) as Row[];

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayKey = now.toISOString().slice(0, 10);
    const inMonth = (d: unknown) => new Date(String(d)).getTime() >= monthStart.getTime();
    const isToday = (d: unknown) => String(d).slice(0, 10) === todayKey;

    const monthSales = sales.filter((s) => inMonth(s["sale_date"]));
    const monthExpenses = expenses.filter((e) => inMonth(e["expense_date"]));
    const todaySales = sales.filter((s) => isToday(s["sale_date"]));
    const todayExpenses = expenses.filter((e) => isToday(e["expense_date"]));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anySales = sales as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyExp = expenses as any;

    const debtors = sales
      .filter((s) => s["status"] !== "cancelled")
      .reduce<Record<string, number>>((acc, s) => {
        const due = Math.max(0, num(s["total"]) - num(s["paid"]) - num(s["refunded"]));
        if (due <= 0) return acc;
        const rel = s["customers"] as { name?: string } | null;
        const name = rel?.name ?? "Client de passage";
        acc[name] = round2((acc[name] ?? 0) + due);
        return acc;
      }, {});

    const lowStock = products
      .filter((p) => p["track_stock"] !== false && num(p["stock"]) <= num(p["min_stock"]))
      .map((p) => `${String(p["name"])} (${num(p["stock"])})`)
      .slice(0, 20);

    const expenseByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
      const key = String(e["category"] ?? "autres");
      acc[key] = round2((acc[key] ?? 0) + num(e["amount"]));
      return acc;
    }, {});

    const summary = [
      `Commerce : ${String(profile?.["business_name"] ?? "LIKID LAKAY")}. Devise : HTG. Date du jour : ${todayKey}.`,
      `Nombre de clients enregistrés : ${customers.length}. Produits : ${products.length}.`,
      "",
      "AUJOURD'HUI :",
      `- Chiffre d'affaires : ${money(revenue(anySales.filter((s: Row) => isToday(s["sale_date"]))))}`,
      `- Ventes : ${todaySales.length}`,
      `- Dépenses : ${money(totalExpenses(todayExpenses as never))}`,
      "",
      "CE MOIS :",
      `- Chiffre d'affaires : ${money(revenue(monthSales as never))}`,
      `- Coût des marchandises vendues : ${money(cogs(monthSales as never))}`,
      `- Dépenses : ${money(totalExpenses(monthExpenses as never))}`,
      `- Bénéfice net : ${money(netProfit(monthSales as never, monthExpenses as never))}`,
      "",
      "GLOBAL :",
      `- Chiffre d'affaires total : ${money(revenue(anySales))}`,
      `- Bénéfice net total : ${money(netProfit(anySales, anyExp))}`,
      `- Créances clients (à recevoir) : ${money(receivables(anySales))}`,
      `- Dettes fournisseurs (à payer) : ${money(payables(purchases as never))}`,
      `- Solde de caisse : ${money(cashBalance(cash as never, num(profile?.["opening_cash"])))}`,
      "",
      `Dépenses par catégorie : ${Object.entries(expenseByCategory).map(([k, v]) => `${k} ${money(v)}`).join(", ") || "aucune"}`,
      `Clients qui doivent de l'argent : ${Object.entries(debtors).map(([k, v]) => `${k} ${money(v)}`).join(", ") || "aucun"}`,
      `Produits en stock bas : ${lowStock.join(", ") || "aucun"}`,
      "",
      "20 dernières ventes :",
      ...sales.slice(0, 20).map((s) => {
        const rel = s["customers"] as { name?: string } | null;
        return `- ${String(s["number"])} · ${String(s["sale_date"]).slice(0, 10)} · ${rel?.name ?? "Client de passage"} · total ${money(num(s["total"]))} · payé ${money(num(s["paid"]))} · ${String(s["status"])}`;
      }),
      "10 dernières dépenses :",
      ...expenses.slice(0, 10).map(
        (e) => `- ${String(e["expense_date"]).slice(0, 10)} · ${String(e["category"])} · ${String(e["description"] ?? "")} · ${money(num(e["amount"]))}`,
      ),
    ].join("\n");

    const system = [
      "Tu es l'assistant financier de l'application Cahier Pro, utilisé par un entrepreneur haïtien.",
      "Réponds toujours en français simple et direct, sans jargon comptable inutile.",
      "Utilise uniquement les données fournies ci-dessous ; si une information manque, dis-le clairement au lieu d'inventer.",
      "Montants toujours en HTG avec deux décimales. Réponses courtes (5 phrases maximum) sauf si un résumé détaillé est demandé.",
      "Écris en texte brut : jamais de markdown, pas d'astérisques, pas de dièses. Pour une liste, utilise des tirets simples.",
      "Définitions : chiffre d'affaires = ventes validées hors annulées ; bénéfice net = chiffre d'affaires − coût des marchandises vendues − dépenses.",
      "",
      "DONNÉES DU COMMERCE :",
      summary,
    ].join("\n");

    const input = [
      ...(data.history ?? []).map((m) => ({
        role: m.role,
        content: [{ type: m.role === "user" ? "input_text" : "output_text", text: m.content }],
      })),
      { role: "user" as const, content: [{ type: "input_text", text: data.question }] },
    ];

    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const res = await runIdFetch.fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: system,
        input,
        stream: true,
        store: false,
        reasoning: { effort: "low" },
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Trop de questions d'un coup. Réessayez dans un instant.");
      if (res.status === 402) throw new Error("Crédits IA épuisés. Rechargez votre espace Lovable pour continuer.");
      throw new Error(`Assistant indisponible (${res.status}). ${detail.slice(0, 200)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        for (const line of part.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload) as {
              type?: string;
              delta?: string;
              response?: { output_text?: string };
            };
            if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
              answer += evt.delta;
            } else if (evt.type === "response.completed" && !answer && evt.response?.output_text) {
              answer = evt.response.output_text;
            }
          } catch {
            /* fragment non JSON, ignoré */
          }
        }
      }
    }

    return {
      answer: answer.trim() || "Je n'ai pas pu formuler de réponse. Reformulez votre question.",
    };
  });
