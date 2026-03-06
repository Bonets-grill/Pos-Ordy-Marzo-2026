import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Send, Bot, User, Loader2, ArrowLeft,
  Code2, Eye, Monitor, Smartphone, Rocket,
  FileCode, PanelLeftClose, PanelLeftOpen,
  Paperclip, Image as ImageIcon, X, FileUp, CheckCircle2,
} from "lucide-react";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackCodeEditor,
} from "@codesandbox/sandpack-react";
import { useTranslation } from "@/i18n/useTranslation";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/core/supabase/client";
import { getSystemById } from "@/lib/systemCatalog";
import {
  extractHtmlPreview,
  extractCodeBlocks,
  buildSandpackFiles,
  type CodeBlock,
} from "@/lib/codeExtractor";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Attachment {
  type: "image" | "file";
  name: string;
  data: string; // base64
  mimeType: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}

type PreviewMode = "html" | "react";
type ViewMode = "preview" | "code";

export function SystemBuilder() {
  const { systemId } = useParams<{ systemId: string }>();
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const system = systemId ? getSystemById(systemId) : null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("html");
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [sandpackFiles, setSandpackFiles] = useState<Record<string, string>>({});
  const [codeBlocks, setCodeBlocks] = useState<CodeBlock[]>([]);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [debugStatus, setDebugStatus] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  // ─── LOAD saved build from Supabase ───
  useEffect(() => {
    if (!systemId) return;
    async function load() {
      const { data } = await supabase
        .from("system_builds")
        .select("*")
        .eq("system_id", systemId)
        .single();

      if (data) {
        const savedMessages = (data.messages as Message[]) || [];
        setMessages(savedMessages);
        if (data.html_preview) setHtmlContent(data.html_preview);
        if (data.generated_files && Object.keys(data.generated_files).length > 0) {
          setSandpackFiles(data.generated_files as Record<string, string>);
        }
      }
      setLoaded(true);
    }
    load();
  }, [systemId]);

  // Auto-set initial prompt only after load + if no saved messages
  useEffect(() => {
    if (!loaded || !system) return;
    if (messages.length === 0) {
      const prompt = `Construye el sistema COMPLETO "${system.id}" (${system.category}).
Módulos requeridos: ${system.modules.join(", ")}. Tier: ${system.tier}.

IMPORTANTE: Esto es un sistema SaaS COMPLETO, no solo un dashboard.
Necesito que generes UNA SOLA página HTML que contenga TODO:

1. Sidebar con navegación a TODOS los módulos (${system.modules.join(", ")})
2. Cada módulo debe ser una sección/vista funcional con datos mock reales
3. Al hacer click en cada item del sidebar, debe mostrar ese módulo (usa JS para cambiar vistas)
4. Dashboard con KPIs reales, gráficos, actividad reciente
5. Cada módulo con: tabla de datos, filtros, búsqueda, botones de acción
6. Diseño nivel Linear/Stripe — profesional, no un prototipo

El HTML debe ser 100% funcional con JavaScript vanilla para la navegación entre módulos.
Incluye Tailwind CDN, Inter font, iconos SVG inline.
TODOS los módulos deben estar implementados, no solo listados en el sidebar.

Genera:
1. \`\`\`html — Página COMPLETA standalone con TODOS los módulos funcionando
2. \`\`\`tsx — Componente React equivalente

NO digas "completado" hasta que TODOS los ${system.modules.length} módulos estén implementados con contenido real.`;
      setInput(prompt);
    }
  }, [loaded, system]);

  // ─── AUTO-SAVE to Supabase (debounced) ───
  useEffect(() => {
    if (!systemId || !loaded || messages.length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      supabase
        .from("system_builds")
        .upsert(
          {
            system_id: systemId,
            messages,
            generated_files: sandpackFiles,
            html_preview: htmlContent,
          },
          { onConflict: "system_id" }
        )
        .then(({ error }) => {
          if (error) console.error("[builder] save error:", error);
        });
    }, 2000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [messages, sandpackFiles, htmlContent, systemId, loaded]);

  // Update preview from assistant messages — search ALL messages (newest first)
  useEffect(() => {
    const assistants = [...messages]
      .reverse()
      .filter((m) => m.role === "assistant" && m.content.length > 100);
    if (assistants.length === 0) return;

    // Find most recent message with HTML
    for (const msg of assistants) {
      const html = extractHtmlPreview(msg.content);
      if (html) {
        setHtmlContent(html);
        break;
      }
    }

    // Find most recent message with Sandpack files
    for (const msg of assistants) {
      const files = buildSandpackFiles(msg.content);
      if (Object.keys(files).length > 0) {
        setSandpackFiles(files);
        break;
      }
    }

    // Collect all code blocks from most recent code-containing message
    for (const msg of assistants) {
      const blocks = extractCodeBlocks(msg.content);
      if (blocks.length > 0) {
        setCodeBlocks(blocks);
        break;
      }
    }
  }, [messages]);

  // Convert HTML content to blob URL for reliable iframe rendering
  useEffect(() => {
    if (!htmlContent) {
      setBlobUrl(null);
      return;
    }
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [htmlContent]);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        const isImage = file.type.startsWith("image/");
        setAttachments((prev) => [
          ...prev,
          {
            type: isImage ? "image" : "file",
            name: file.name,
            data: base64,
            mimeType: file.type,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      handleFiles(dt.files);
    }
  }

  const abortRef = useRef<AbortController | null>(null);
  const autoContinueCount = useRef(0);
  const MAX_AUTO_CONTINUES = 5;

  function autoContinueCheck() {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant" && last.content.length > 200) {
        const openBlocks = (last.content.match(/```/g) || []).length;
        if (openBlocks % 2 !== 0 && autoContinueCount.current < MAX_AUTO_CONTINUES) {
          autoContinueCount.current++;
          setTimeout(() => {
            handleSend("continue generating exactly from where you stopped. Do NOT repeat any code. Just continue.");
          }, 1000);
        } else {
          autoContinueCount.current = 0;
        }
      } else {
        autoContinueCount.current = 0;
      }
      return prev;
    });
  }

  async function handleSend(overrideText?: string) {
    const text = (overrideText || input).trim();
    if ((!text && attachments.length === 0) || streaming) return;

    const currentAttachments = [...attachments];
    const displayContent = text + (currentAttachments.length > 0
      ? `\n[${currentAttachments.map((a) => a.name).join(", ")}]`
      : "");
    const userMsg: Message = {
      role: "user",
      content: displayContent,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!overrideText) setInput("");
    setAttachments([]);
    setStreaming(true);
    setMessages([...newMessages, { role: "assistant", content: "" }]);

    // Refresh session token before each request to avoid stale tokens
    setDebugStatus("Autenticando...");
    const { data: { session: freshSession } } = await supabase.auth.getSession();
    const token = freshSession?.access_token;
    if (!token) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Error: Sesión expirada. Recarga la página e inicia sesión de nuevo.",
        };
        return updated;
      });
      setStreaming(false);
      setDebugStatus("Error: sin sesión");
      return;
    }

    const systemContext = system
      ? `Building system: ${system.id} (${system.category}). Modules: ${system.modules.join(", ")}. IMPORTANT: Always include a \`\`\`html block with a complete standalone preview page (include Tailwind CDN), AND a \`\`\`tsx block with the React component.`
      : "";

    // Abort controller for cleanup
    abortRef.current = new AbortController();

    setDebugStatus("Conectando con Claude...");

    try {
      const apiUrl = `${window.location.origin}/api/admin/ai`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          context: systemContext,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        let errMsg = `Error ${response.status}`;
        try {
          const err = await response.json();
          errMsg = err.error || errMsg;
        } catch {}
        setDebugStatus(`Error: ${errMsg}`);
        throw new Error(errMsg);
      }

      setDebugStatus("Stream conectado — recibiendo...");

      // Try streaming with getReader(), fall back to text() if body is null
      const reader = response.body?.getReader();
      let fullContent = "";

      if (reader) {
        const decoder = new TextDecoder();
        let buffer = "";
        let chunkCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunkCount++;
          buffer += decoder.decode(value, { stream: true });
          setDebugStatus(`Recibiendo... (${chunkCount} chunks, ${buffer.length} bytes)`);

          // Process complete lines from buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.type === "text") {
                fullContent += parsed.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: fullContent };
                  return updated;
                });
              } else if (parsed.type === "error") {
                throw new Error(parsed.content || "Stream error");
              }
            } catch (e) {
              if (e instanceof Error && e.message !== "Stream error") {
                // JSON parse error — skip malformed line
              } else {
                throw e;
              }
            }
          }
        }

        // Flush remaining buffer
        if (buffer.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(buffer.slice(6));
            if (parsed.type === "text") {
              fullContent += parsed.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: fullContent };
                return updated;
              });
            }
          } catch {}
        }

        if (fullContent.length === 0) {
          setDebugStatus(`Error: stream vacío (${chunkCount} chunks recibidos)`);
          throw new Error("Respuesta vacía del servidor");
        }
      } else {
        // Fallback: no streaming support, read as text
        setDebugStatus("Sin streaming — leyendo respuesta completa...");
        const text = await response.text();
        // Parse SSE lines from full text
        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === "text") {
              fullContent += parsed.content;
            }
          } catch {}
        }
        if (fullContent.length > 0) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: fullContent };
            return updated;
          });
        } else {
          setDebugStatus("Error: respuesta vacía (fallback)");
          throw new Error("Respuesta vacía del servidor");
        }
      }

      setDebugStatus(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setDebugStatus(null);
        return;
      }
      const errMsg = error instanceof Error ? error.message : "Conexión fallida";
      setDebugStatus(`Error: ${errMsg}`);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        // If we already have partial content, keep it and append error
        if (last.content && last.content.length > 50) {
          updated[updated.length - 1] = {
            role: "assistant",
            content: last.content + "\n\n⚠️ Conexión interrumpida — el contenido parcial se guardó.",
          };
        } else {
          updated[updated.length - 1] = {
            role: "assistant",
            content: `Error: ${errMsg}`,
          };
        }
        return updated;
      });
    } finally {
      abortRef.current = null;
      setStreaming(false);
      inputRef.current?.focus();

      // Clear debug status after 5s on success
      setTimeout(() => setDebugStatus(null), 5000);

      // AUTO-CONTINUE: check if last response was cut off (unclosed code block)
      autoContinueCheck();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  /** Strip code blocks (complete AND incomplete) from assistant messages */
  function getChatText(content: string): { text: string; hasCode: boolean } {
    // Strip complete code blocks: ```...```
    let text = content.replace(/```[\s\S]*?```/g, "");
    const hadComplete = text !== content;
    // Strip incomplete/unclosed code blocks (during streaming): ```anything until end
    const hasUnclosed = /```[a-z]*\n[\s\S]*$/.test(text);
    if (hasUnclosed) {
      text = text.replace(/```[a-z]*\n[\s\S]*$/, "");
    }
    text = text.replace(/\n{3,}/g, "\n\n").trim();
    return { text, hasCode: hadComplete || hasUnclosed };
  }

  if (!system) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">System not found</p>
      </div>
    );
  }

  const hasSandpackFiles = Object.keys(sandpackFiles).length > 0;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Compact header bar */}
      <div className="flex items-center justify-between h-11 px-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-2">
          <Link to="/admin/catalog">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setChatOpen(!chatOpen)}
          >
            {chatOpen ? (
              <PanelLeftClose className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftOpen className="h-3.5 w-3.5" />
            )}
          </Button>
          <div className="w-px h-5 bg-border" />
          <Badge variant="secondary" className="bg-jade-500/10 text-jade-600 text-xs h-6">
            {t(`catalog.sys.${system.id}`)}
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs h-6">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Claude
          </Badge>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-1 text-[10px]">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted">Admin</Link>
            <Link to="/admin/catalog" className="text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted">Catalog</Link>
            <Link to="/admin/tenants" className="text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted">Tenants</Link>
            <Link to="/admin/ai" className="text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted">AI</Link>
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted">Dashboard</Link>
            <Link to="/settings" className="text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted">Settings</Link>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Preview / Code toggle */}
          <Button
            variant={viewMode === "preview" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setViewMode("preview")}
          >
            <Eye className="h-3 w-3" />
            {t("builder.preview")}
          </Button>
          <Button
            variant={viewMode === "code" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setViewMode("code")}
          >
            <Code2 className="h-3 w-3" />
            {t("builder.code")}
          </Button>

          {viewMode === "preview" && (
            <>
              <div className="w-px h-4 bg-border mx-1" />
              <Button
                variant={previewMode === "html" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setPreviewMode("html")}
              >
                HTML
              </Button>
              <Button
                variant={previewMode === "react" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setPreviewMode("react")}
                disabled={!hasSandpackFiles}
              >
                React
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setMobilePreview(!mobilePreview)}
              >
                {mobilePreview ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
              </Button>
            </>
          )}

          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="default" size="sm" className="h-7 gap-1 text-xs">
            <Rocket className="h-3 w-3" />
            {t("builder.deploy")}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* LEFT: Chat panel (collapsible) */}
        {chatOpen && (
          <div
            className={cn(
              "w-[320px] shrink-0 flex flex-col border-r relative",
              dragOver && "ring-2 ring-jade-500/50 ring-inset"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={(e) => {
              // Only set false if leaving the panel entirely
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
            }}
            onDrop={handleDrop}
          >
            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto native-scroll p-2 space-y-2"
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground px-4">
                  <Bot className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-xs">{t("builder.noPreview")}</p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn("flex gap-1.5", msg.role === "user" ? "justify-end" : "")}
                >
                  {msg.role === "assistant" && (
                    <div className="h-5 w-5 rounded bg-jade-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-2.5 w-2.5 text-jade-500" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[90%] rounded-lg px-2.5 py-2 text-[11px] leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {/* Image attachments */}
                    {msg.attachments?.filter((a) => a.type === "image").map((att, j) => (
                      <img
                        key={j}
                        src={`data:${att.mimeType};base64,${att.data}`}
                        alt={att.name}
                        className="rounded-md mb-1.5 max-w-full max-h-32 object-contain"
                      />
                    ))}
                    {/* File attachments */}
                    {msg.attachments?.filter((a) => a.type === "file").map((att, j) => (
                      <div key={j} className="flex items-center gap-1 mb-1 text-[10px] opacity-80">
                        <FileUp className="h-3 w-3" />
                        {att.name}
                      </div>
                    ))}
                    {(() => {
                      const isAssistant = msg.role === "assistant";
                      const { text, hasCode } = isAssistant
                        ? getChatText(msg.content)
                        : { text: msg.content, hasCode: false };
                      return (
                        <>
                          <pre className="whitespace-pre-wrap font-sans break-words">
                            {text || (streaming && i === messages.length - 1 ? "" : "...")}
                            {streaming && i === messages.length - 1 && isAssistant && (
                              <span className="inline-block w-1 h-2.5 bg-jade-500 animate-pulse ml-0.5" />
                            )}
                          </pre>
                          {hasCode && !streaming && (
                            <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-border/50 text-[10px] text-jade-600">
                              <CheckCircle2 className="h-3 w-3" />
                              Código generado — ver en Preview / Código
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  {msg.role === "user" && (
                    <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-2.5 w-2.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Debug status */}
            {debugStatus && (
              <div className={cn(
                "px-3 py-1.5 text-[10px] font-mono border-t",
                debugStatus.startsWith("Error")
                  ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                  : "bg-jade-50 text-jade-700 dark:bg-jade-950 dark:text-jade-400"
              )}>
                {debugStatus}
              </div>
            )}

            {/* Input area */}
            <div className="border-t p-2">
              {/* Attachment previews */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {attachments.map((att, i) => (
                    <div
                      key={i}
                      className="group relative flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px]"
                    >
                      {att.type === "image" ? (
                        <img
                          src={`data:${att.mimeType};base64,${att.data}`}
                          alt={att.name}
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        <FileUp className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className="max-w-[80px] truncate">{att.name}</span>
                      <button
                        onClick={() => removeAttachment(i)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/10"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Text input + actions */}
              <div className="flex items-end gap-1.5 rounded-lg border bg-background p-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.txt,.json,.csv,.tsx,.ts,.js,.html,.css,.sql"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <button
                  type="button"
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  title="Adjuntar archivo"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={t("ai.placeholder")}
                  className="min-h-[32px] max-h-[120px] resize-none text-xs border-0 shadow-none focus-visible:ring-0 p-1"
                  rows={1}
                  disabled={streaming}
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && attachments.length === 0) || streaming}
                  className="shrink-0 h-8 w-8 rounded-md"
                  size="icon"
                >
                  {streaming ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>

            </div>

            {/* Full-panel drag overlay */}
            {dragOver && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-jade-500/10 border-2 border-dashed border-jade-500 rounded-lg pointer-events-none">
                <div className="flex items-center gap-2 text-jade-600 text-sm font-medium">
                  <ImageIcon className="h-5 w-5" />
                  Soltar archivo aquí
                </div>
              </div>
            )}
          </div>
        )}

        {/* RIGHT: Preview / Code */}
        <div className="flex-1 min-w-0 bg-white flex items-center justify-center">
          {viewMode === "preview" ? (
            <>
              {previewMode === "html" && (
                <div className={cn("h-full transition-all", mobilePreview ? "w-[375px] border-x shadow-lg" : "w-full")}>
                  {blobUrl ? (
                    <iframe
                      ref={iframeRef}
                      className="w-full h-full border-0 bg-white"
                      src={blobUrl}
                      title="Preview"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Eye className="h-16 w-16 mb-4 opacity-10" />
                      <p className="text-sm">{t("builder.noPreview")}</p>
                    </div>
                  )}
                </div>
              )}

              {previewMode === "react" && hasSandpackFiles && (
                <div className={cn("h-full transition-all", mobilePreview ? "w-[375px] border-x shadow-lg" : "w-full")}>
                  <SandpackProvider
                    template="react-ts"
                    files={sandpackFiles}
                    theme="auto"
                    options={{ externalResources: ["https://cdn.tailwindcss.com"] }}
                  >
                    <SandpackPreview style={{ height: "100%" }} showNavigator={false} showRefreshButton />
                  </SandpackProvider>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full overflow-auto native-scroll">
              {codeBlocks.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p className="text-sm">{t("builder.noPreview")}</p>
                </div>
              ) : hasSandpackFiles ? (
                <SandpackProvider template="react-ts" files={sandpackFiles} theme="auto">
                  <SandpackCodeEditor style={{ height: "100%" }} showLineNumbers showTabs readOnly />
                </SandpackProvider>
              ) : (
                <div className="p-4 space-y-4">
                  {codeBlocks.map((block, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2 mb-1">
                        <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                          {block.filename || block.language}
                        </span>
                      </div>
                      <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto">
                        <code>{block.content}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
