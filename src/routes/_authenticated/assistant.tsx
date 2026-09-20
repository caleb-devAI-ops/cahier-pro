import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { askAssistant } from "@/lib/assistant.functions";
import { PageHeader } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "Assistant financier — Cahier Pro" },
      {
        name: "description",
        content: "Posez vos questions sur vos ventes, dettes et dépenses et obtenez un résumé clair.",
      },
      { property: "og:title", content: "Assistant financier — Cahier Pro" },
      { property: "og:description", content: "Vos chiffres expliqués en langage simple." },
    ],
  }),
  component: AssistantPage,
});

const SUGGESTIONS = [
  "Combien j'ai gagné ce mois ?",
  "Qui me doit de l'argent ?",
  "Quelles sont mes plus grosses dépenses ?",
  "Fais-moi un résumé de la semaine",
];

interface Msg {
  role: "user" | "assistant";
  content: string;
}

function AssistantPage() {
  const ask = useServerFn(askAssistant);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [question, setQuestion] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: async (q: string) => {
      const history = messages.slice(-8);
      return await ask({ data: { question: q, history } });
    },
    onSuccess: (res) => {
      setMessages((m) => [...m, { role: "assistant", content: res.answer }]);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    },
    onError: (err) => {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: err instanceof Error ? err.message : "Erreur inattendue." },
      ]);
    },
  });

  function send(q: string) {
    const text = q.trim();
    if (!text || mutation.isPending) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setQuestion("");
    mutation.mutate(text);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  return (
    <div className="flex min-h-[70vh] flex-col pb-4">
      <PageHeader
        title="Assistant financier"
        subtitle="Posez une question sur vos ventes, dettes ou dépenses"
      />

      <div className="flex-1 space-y-3 px-4">
        {messages.length === 0 ? (
          <div className="card-surface flex flex-col items-center gap-3 px-6 py-8 text-center">
            <Sparkles className="size-6 text-primary" />
            <p className="text-sm text-muted-foreground">
              L'assistant lit vos données réelles (ventes, paiements, dettes, dépenses, caisse) pour
              vous répondre. Il ne modifie jamais rien.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full bg-secondary px-3.5 py-2 text-xs font-medium"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground"
                : "mr-auto max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-card px-4 py-3 text-sm shadow-sm"
            }
          >
            {m.content}
          </div>
        ))}

        {mutation.isPending ? (
          <div className="mr-auto flex max-w-[60%] items-center gap-2 rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            L'assistant analyse vos chiffres…
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(question);
        }}
        className="sticky bottom-0 mt-4 flex items-center gap-2 bg-background/90 px-4 py-3 backdrop-blur"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ex : combien il me reste à recevoir ?"
          className="flex-1 rounded-full border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={mutation.isPending || !question.trim()}
          className="rounded-full bg-primary p-3.5 text-primary-foreground disabled:opacity-50"
          aria-label="Envoyer"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
