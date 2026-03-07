import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Bot, User, Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { useAuthStore } from "@/stores/authStore";
import { getSystemById } from "@/lib/systemCatalog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AITerminal() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [buildSystem, setBuildSystem] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-load system context from ?system= param
  useEffect(() => {
    const systemId = searchParams.get("system");
    if (systemId) {
      const system = getSystemById(systemId);
      if (system) {
        setBuildSystem(systemId);
        const prompt = `Vamos a construir el sistema "${system.id}" (${system.category}). Módulos: ${system.modules.join(", ")}. Tier: ${system.tier}. Diseña la arquitectura completa de este sistema: páginas, componentes, schema de base de datos, y flujos principales. Empezamos.`;
        setInput(prompt);
        inputRef.current?.focus();
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    // Add placeholder for assistant response
    setMessages([...newMessages, { role: "assistant", content: "" }]);

    try {
      const token = session?.access_token;
      const response = await fetch("/api/admin/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "AI request failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "text") {
                fullContent += parsed.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: fullContent,
                  };
                  return updated;
                });
              } else if (parsed.type === "error") {
                fullContent += `\n\n[Error: ${parsed.content}]`;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: fullContent,
                  };
                  return updated;
                });
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
        return updated;
      });
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-jade-500" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("ai.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("ai.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {buildSystem && (
            <Badge variant="secondary" className="gap-1 bg-jade-500/10 text-jade-600">
              {t(`catalog.sys.${buildSystem}`)}
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            Claude Sonnet
          </Badge>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMessages([])}
              title={t("ai.clear")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto native-scroll space-y-4 pb-4 scrollbar-thin"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot className="h-16 w-16 mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-2">{t("ai.welcome")}</h3>
            <p className="text-sm max-w-md">{t("ai.welcomeDesc")}</p>
            <div className="mt-6 grid grid-cols-2 gap-2 max-w-lg">
              {[
                t("ai.suggestion1"),
                t("ai.suggestion2"),
                t("ai.suggestion3"),
                t("ai.suggestion4"),
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  className="rounded-lg border p-3 text-left text-sm hover:bg-accent transition-colors"
                  onClick={() => {
                    setInput(suggestion);
                    inputRef.current?.focus();
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${
              msg.role === "user" ? "justify-end" : ""
            }`}
          >
            {msg.role === "assistant" && (
              <div className="h-8 w-8 rounded-lg bg-jade-500/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-jade-500" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <pre className="whitespace-pre-wrap font-sans break-words">
                {msg.content}
                {streaming &&
                  i === messages.length - 1 &&
                  msg.role === "assistant" && (
                    <span className="inline-block w-2 h-4 bg-jade-500 animate-pulse ml-0.5" />
                  )}
              </pre>
            </div>
            {msg.role === "user" && (
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t pt-4">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("ai.placeholder")}
            className="min-h-[52px] max-h-[200px] resize-none"
            rows={1}
            disabled={streaming}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="shrink-0 h-[52px] w-[52px]"
            size="icon"
          >
            {streaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
