import { useEffect, useRef, useState } from "react";
import { Bot, Send, Loader2, Sparkles, Stethoscope, Newspaper, CalendarDays } from "lucide-react";
import { toast } from "sonner";

import { streamChat, type ChatMessage } from "@/lib/ai";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UIMessage extends ChatMessage {
  id: string;
  timestamp: number;
}

const SUGGESTIONS = [
  { icon: Stethoscope, text: "What upcoming surgery conferences are in Africa?" },
  { icon: Newspaper, text: "Summarize the latest medical news for practitioners." },
  { icon: CalendarDays, text: "How do I register for an event on this platform?" },
  { icon: Sparkles, text: "Best practices for sharing a case study?" },
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<UIMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm MedAssist, your AI guide on the Medical Events Platform. I can help you find events, understand medical news, navigate the platform, or discuss professional topics. How can I assist you today?",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMsg: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "", timestamp: Date.now() }]);
    setInput("");
    setStreaming(true);

    const history: ChatMessage[] = [...messages, userMsg]
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        history,
        (delta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + delta } : m
            )
          );
        },
        controller.signal
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error("The assistant encountered an error. Please try again.");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Sorry, I couldn't respond right now. Please try again." }
              : m
          )
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  return (
    <AppShell>
      <div className="animate-fade-in-up flex h-[calc(100vh-8rem)] flex-col">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">AI Assistant</h1>
              <p className="text-xs text-muted-foreground">
                MedAssist — your healthcare professional guide with live web search
              </p>
            </div>
          </div>
        </div>

        <Card className="flex min-h-0 flex-1 flex-col">
          {/* Messages */}
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="mx-auto max-w-2xl space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent/60 text-accent-foreground"
                    )}
                  >
                    {msg.role === "user" ? (
                      <span className="text-xs font-semibold">You</span>
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {msg.content || (streaming ? "…" : "")}
                    </p>
                  </div>
                </div>
              ))}

              {/* Suggestions (only on first load) */}
              {messages.length === 1 && (
                <div className="pt-4">
                  <p className="mb-3 text-xs font-medium text-muted-foreground">Try asking:</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s.text}
                        onClick={() => send(s.text)}
                        className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-muted/50"
                      >
                        <s.icon className="h-4 w-4 shrink-0 text-primary" />
                        <span>{s.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="mx-auto flex max-w-2xl items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask MedAssist anything…"
                rows={1}
                className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none ring-ring focus:ring-2"
              />
              {streaming ? (
                <Button onClick={stop} variant="destructive" size="icon" className="h-11 w-11 shrink-0">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </Button>
              ) : (
                <Button
                  onClick={() => send(input)}
                  disabled={!input.trim()}
                  size="icon"
                  className="h-11 w-11 shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-muted-foreground">
              MedAssist can search current web sources when relevant. It is not a diagnostic tool; always consult clinical guidelines.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
