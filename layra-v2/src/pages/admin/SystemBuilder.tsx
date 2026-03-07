import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Send, Bot, User, Loader2, ArrowLeft,
  Code2, Eye, Monitor, Smartphone, Rocket,
  FileCode, PanelLeftClose, PanelLeftOpen,
  Paperclip, Image as ImageIcon, X, FileUp, CheckCircle2,
  Trash2, DollarSign,
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
  mergeHtmlFromMessages,
  type CodeBlock,
} from "@/lib/codeExtractor";
import { getTemplateConfig } from "@/lib/templates/configs";
import type { I18nString } from "@/lib/templates/types";

function resolveI18n(s: I18nString | undefined): string {
  if (!s) return "";
  if (typeof s === "string") return s;
  return s.es || s.en || Object.values(s)[0] || "";
}
import { renderSystemHtml } from "@/lib/templates/engine";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/common/ThemeToggle";

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
  // Cost tracking: Opus = $15/MTok input, $75/MTok output (~4 chars per token)
  const [costData, setCostData] = useState({ inputTokens: 0, outputTokens: 0 });
  const [activeModel, setActiveModel] = useState<string | null>(null);
  // Module progress tracking
  const [moduleStatus, setModuleStatus] = useState<Record<string, "pending" | "building" | "done">>({});
  const [moduleCosts, setModuleCosts] = useState<Record<string, number>>({});
  const lastDetectedModule = useRef<string | null>(null);
  const moduleStartChars = useRef(0);

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

  // ─── LOAD saved build: localStorage first (instant), then Supabase (authoritative) ───
  useEffect(() => {
    if (!systemId) return;
    const lsKey = `layra_build_${systemId}`;

    // 1) Instant restore from localStorage
    try {
      const cached = localStorage.getItem(lsKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.messages?.length) setMessages(parsed.messages);
        if (parsed.html_preview) setHtmlContent(parsed.html_preview);
        if (parsed.generated_files && Object.keys(parsed.generated_files).length > 0) {
          setSandpackFiles(parsed.generated_files);
        }
      }
    } catch { /* ignore corrupt localStorage */ }

    // 2) Then try Supabase (may have newer data from another device)
    async function load() {
      const { data, error } = await supabase
        .from("system_builds")
        .select("*")
        .eq("system_id", systemId)
        .single();

      if (error) {
        console.warn("[builder] Supabase load failed (using localStorage):", error.message);
      }

      if (data) {
        const savedMessages = (data.messages as Message[]) || [];
        if (savedMessages.length > 0) setMessages(savedMessages);
        if (data.html_preview) setHtmlContent(data.html_preview);
        if (data.generated_files && Object.keys(data.generated_files).length > 0) {
          setSandpackFiles(data.generated_files as Record<string, string>);
        }
      }
      setLoaded(true);
    }
    load();
  }, [systemId]);

  // Initialize module status
  useEffect(() => {
    if (!system) return;
    const initial: Record<string, "pending" | "building" | "done"> = {};
    for (const mod of system.modules) initial[mod] = "pending";
    setModuleStatus(initial);
  }, [system]);

  // ─── TEMPLATE ENGINE: instant render if pre-built config exists ───
  const templateConfig = systemId ? getTemplateConfig(systemId) : null;

  useEffect(() => {
    if (!loaded || !systemId || !templateConfig) return;

    // Template ALWAYS wins — clear any old AI builder cache
    const lsKey = `layra_build_${systemId}`;
    try { localStorage.removeItem(lsKey); } catch { /* ignore */ }

    const html = renderSystemHtml(templateConfig);
    setHtmlContent(html);
    // Mark all modules as done
    const done: Record<string, "done"> = {};
    for (const mod of templateConfig.modules) done[mod.id] = "done";
    setModuleStatus(done);
    // Add a system message so the chat shows the build is done
    setMessages([{
      role: "assistant",
      content: `Sistema **${resolveI18n(templateConfig.name)}** generado con el motor de templates.\n\nTodos los ${templateConfig.modules.length} modulos estan listos con:\n- Navegacion funcional\n- Tablas con datos reales\n- Modales de creacion\n- Busqueda y filtros\n- Notificaciones toast\n\nPuedes personalizarlo usando el chat.`,
    }]);
  }, [loaded, systemId, templateConfig]);

  // Auto-set initial prompt only after load + if no saved messages (AI builder fallback)
  useEffect(() => {
    if (!loaded || !system) return;
    if (templateConfig) return; // skip — template engine handles this
    if (messages.length === 0) {
      const moduleList = system.modules.map((m, i) => `${i + 1}. ${m}`).join("\n");
      const prompt = `Build "${system.id}" (${system.category}). Tier: ${system.tier}.

MODULES TO BUILD:
${moduleList}

Generate ONE HTML page with modular architecture:
- Shell (sidebar + header + showModule() JS navigation)
- Each module as <section id="mod-NAME" class="module-panel">
- Mark each with <!-- MODULE:name --> comments
- Include working buttons, modals, tables with real data
- Start with shell + dashboard + first 2 modules COMPLETE

The auto-continue system will request remaining modules.
Start directly with \`\`\`html — no explanations.`;
      setInput(prompt);
    }
  }, [loaded, system, templateConfig]);

  // ─── AUTO-SAVE: localStorage (instant) + Supabase (debounced) ───
  useEffect(() => {
    if (!systemId || !loaded || messages.length === 0) return;

    // Instant localStorage save (survives refresh)
    const lsKey = `layra_build_${systemId}`;
    try {
      localStorage.setItem(lsKey, JSON.stringify({
        messages,
        generated_files: sandpackFiles,
        html_preview: htmlContent,
      }));
    } catch { /* localStorage full — ignore */ }

    // Debounced Supabase save
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
          if (error) console.error("[builder] Supabase save error:", error);
        });
    }, 2000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [messages, sandpackFiles, htmlContent, systemId, loaded]);

  // Update preview from assistant messages
  // During streaming: debounced live preview (every 3s)
  // After streaming: immediate final update
  const previewTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastPreviewLen = useRef(0);

  useEffect(() => {
    const assistants = messages.filter((m) => m.role === "assistant" && m.content.length > 100);
    if (assistants.length === 0) return;

    function updatePreview() {
      // MERGE HTML from all messages (base + continue sections)
      const mergedHtml = mergeHtmlFromMessages(messages);
      if (mergedHtml && mergedHtml.length > (htmlContent?.length || 0)) {
        setHtmlContent(mergedHtml);
      }

      // Only update sandpack/codeblocks when not streaming (expensive)
      if (!streaming) {
        let bestFiles: Record<string, string> = {};
        for (const msg of assistants) {
          const files = buildSandpackFiles(msg.content);
          if (Object.keys(files).length > Object.keys(bestFiles).length) {
            bestFiles = files;
          }
        }
        if (Object.keys(bestFiles).length > 0) setSandpackFiles(bestFiles);

        let bestBlocks: CodeBlock[] = [];
        for (const msg of assistants) {
          const blocks = extractCodeBlocks(msg.content);
          if (blocks.length > bestBlocks.length) bestBlocks = blocks;
        }
        if (bestBlocks.length > 0) setCodeBlocks(bestBlocks);
      }
    }

    if (streaming) {
      // During streaming: check if enough new content to warrant a preview update
      const lastMsg = assistants[assistants.length - 1];
      const contentLen = lastMsg?.content.length || 0;
      // Update every ~5KB of new content (debounced)
      if (contentLen - lastPreviewLen.current > 5000) {
        lastPreviewLen.current = contentLen;
        if (previewTimer.current) clearTimeout(previewTimer.current);
        previewTimer.current = setTimeout(updatePreview, 500);
      }
    } else {
      // After streaming: immediate update
      lastPreviewLen.current = 0;
      if (previewTimer.current) clearTimeout(previewTimer.current);
      updatePreview();
    }

    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [messages, streaming]);

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

  async function resetBuild() {
    if (!systemId) return;
    if (!confirm("¿Resetear conversación? Se borrarán todos los mensajes y el preview.")) return;
    setMessages([]);
    setHtmlContent(null);
    setSandpackFiles({});
    setCodeBlocks([]);
    setDebugStatus(null);
    setCostData({ inputTokens: 0, outputTokens: 0 });
    setModuleCosts({});
    if (system) {
      const initial: Record<string, "pending" | "building" | "done"> = {};
      for (const mod of system.modules) initial[mod] = "pending";
      setModuleStatus(initial);
    }
    lastDetectedModule.current = null;
    moduleStartChars.current = 0;
    // Clear from localStorage + DB
    try { localStorage.removeItem(`layra_build_${systemId}`); } catch {}
    await supabase.from("system_builds").delete().eq("system_id", systemId);
    // Re-set initial prompt
    if (system) {
      const moduleList = system.modules.map((m, i) => `${i + 1}. ${m}`).join("\n");
      const prompt = `Build "${system.id}" (${system.category}). Tier: ${system.tier}.

MODULES TO BUILD:
${moduleList}

Generate ONE HTML page with modular architecture:
- Shell (sidebar + header + showModule() JS navigation)
- Each module as <section id="mod-NAME" class="module-panel">
- Mark each with <!-- MODULE:name --> comments
- Include working buttons, modals, tables with real data
- Start with shell + dashboard + first 2 modules COMPLETE

The auto-continue system will request remaining modules.
Start directly with \`\`\`html — no explanations.`;
      setInput(prompt);
    }
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
          setDebugStatus(`Código incompleto — continuando automáticamente (ronda ${autoContinueCount.current + 1}/${MAX_AUTO_CONTINUES + 1})...`);
          setTimeout(() => {
            // Find which modules are still pending
            const pending = system?.modules.filter((m) => {
              const s = moduleStatus[m];
              return s === "pending" || s === undefined;
            }) || [];
            const continueMsg = pending.length > 0
              ? `Continue building. Pending modules: ${pending.join(", ")}. Output ONLY the next module sections as <section id="mod-NAME" class="module-panel">. Do NOT repeat the shell or already-built modules. Pick up exactly where you stopped.`
              : "Continue generating exactly from where you stopped. Do NOT repeat any code. Just continue.";
            handleSend(continueMsg);
          }, 1500);
        } else {
          autoContinueCount.current = 0;
          if (openBlocks % 2 !== 0) {
            setDebugStatus("Generación completa (máximo de rondas alcanzado)");
          }
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

    // Build context with codemap for targeted edits
    let systemContext = "";
    if (system) {
      const builtModules = Object.entries(moduleStatus)
        .filter(([, s]) => s === "done")
        .map(([m]) => m);
      const pendingModules = Object.entries(moduleStatus)
        .filter(([, s]) => s === "pending")
        .map(([m]) => m);

      const codemap = {
        system: system.id,
        modules: Object.fromEntries(
          system.modules.map((m) => [m, { status: moduleStatus[m] || "pending" }])
        ),
      };

      systemContext = `Building system: ${system.id} (${system.category}).
All modules: ${system.modules.join(", ")}.
Built: ${builtModules.length > 0 ? builtModules.join(", ") : "none"}.
Pending: ${pendingModules.length > 0 ? pendingModules.join(", ") : "none"}.
CODEMAP: ${JSON.stringify(codemap)}
Use <!-- MODULE:name --> markers. Each module = <section id="mod-NAME" class="module-panel">.
Navigation: showModule('name') JS function. Sidebar buttons with data-nav="name".`;
    }

    // Abort controller for cleanup
    abortRef.current = new AbortController();

    const roundLabel = autoContinueCount.current > 0
      ? ` (ronda ${autoContinueCount.current + 1}/${MAX_AUTO_CONTINUES + 1})`
      : "";
    setDebugStatus(`Conectando con Claude${roundLabel}...`);

    try {
      const apiUrl = `${window.location.origin}/api/admin/ai`;
      const payload = JSON.stringify({
        messages: newMessages.map((m) => ({
          role: m.role,
          content: m.content,
          attachments: m.attachments,
        })),
        context: systemContext,
      });

      // Use XMLHttpRequest for SSE — most reliable across all browsers including Safari
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let fullContent = "";
        // Track position of last fully-processed double-newline boundary
        let parsedUpTo = 0;
        // Estimate input tokens (~4 chars per token)
        const inputChars = payload.length;
        const estimatedInputTokens = Math.ceil(inputChars / 4);
        const streamStartTime = Date.now();

        xhr.open("POST", apiUrl, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        function parseFromBuffer() {
          const raw = xhr.responseText;
          // Find all complete SSE events (terminated by \n\n)
          // Process from where we last left off
          let searchFrom = parsedUpTo;
          while (true) {
            const eventEnd = raw.indexOf("\n\n", searchFrom);
            if (eventEnd === -1) break; // No more complete events

            const eventText = raw.slice(searchFrom, eventEnd);
            searchFrom = eventEnd + 2;

            // Parse each line in this event
            const lines = eventText.split("\n");
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data: ")) continue;
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                if (parsed.type === "meta" && parsed.model) {
                  setActiveModel(parsed.model);
                } else if (parsed.type === "text" && parsed.content) {
                  fullContent += parsed.content;
                } else if (parsed.type === "error") {
                  reject(new Error(parsed.content || "Stream error"));
                  xhr.abort();
                  return;
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
          parsedUpTo = searchFrom;

          // Update UI
          if (fullContent.length > 0) {
            const content = fullContent;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content };
              return updated;
            });
          }
          // Detect modules being built from MODULE markers and section ids
          if (system) {
            // Only search within ```html blocks (not prompt text)
            const htmlStart = fullContent.indexOf("```html");
            const codeContent = htmlStart >= 0 ? fullContent.slice(htmlStart) : "";

            const newStatus: Record<string, "pending" | "building" | "done"> = {};
            const detectedOrder: string[] = [];

            for (const mod of system.modules) {
              const variants = [
                mod,                              // task_management
                mod.replace(/_/g, "-"),            // task-management
                mod.replace(/_/g, ""),             // taskmanagement
              ];
              // Search for MODULE markers, section ids, or nav items in HTML code only
              const found = variants.some((v) =>
                codeContent.includes(`<!-- MODULE:${v}`) ||
                codeContent.includes(`id="mod-${v}"`) ||
                codeContent.includes(`id="${v}"`) ||
                codeContent.includes(`id="${v}-`) ||
                codeContent.includes(`data-nav="${v}"`) ||
                codeContent.includes(`showModule('${v}')`)
              );

              if (found) detectedOrder.push(mod);
              newStatus[mod] = found ? "done" : "pending";
            }

            // The LAST detected module is "building" while streaming
            let currentModName = "iniciando";
            if (detectedOrder.length > 0) {
              const lastMod = detectedOrder[detectedOrder.length - 1];
              newStatus[lastMod] = "building";
              currentModName = lastMod.replace(/_/g, " ");

              // Track cost per module: when a NEW module is detected, close the previous one
              if (lastMod !== lastDetectedModule.current) {
                if (lastDetectedModule.current) {
                  const charsForModule = fullContent.length - moduleStartChars.current;
                  const tokensForModule = Math.ceil(charsForModule / 4);
                  const moduleCost = (tokensForModule / 1_000_000) * 75;
                  setModuleCosts((prev) => ({
                    ...prev,
                    [lastDetectedModule.current!]: moduleCost,
                  }));
                }
                lastDetectedModule.current = lastMod;
                moduleStartChars.current = fullContent.length;
              }
            } else if (codeContent.length > 0) {
              currentModName = "HTML base";
            }

            const doneCount = detectedOrder.length > 0 ? detectedOrder.length - 1 : 0; // last is "building"
            setModuleStatus(newStatus);

            // Status bar with live info
            const elapsed = (Date.now() - streamStartTime) / 1000;
            const kbPerSec = elapsed > 0 ? (raw.length / 1024) / elapsed : 0;
            const totalCost = (estimatedInputTokens / 1_000_000) * 15 + (Math.ceil(fullContent.length / 4) / 1_000_000) * 75;

            const round = autoContinueCount.current > 0
              ? ` · Ronda ${autoContinueCount.current + 1}/${MAX_AUTO_CONTINUES + 1}`
              : "";
            setDebugStatus(
              `${currentModName} · ${doneCount}/${system.modules.length} módulos · ${(raw.length / 1024).toFixed(0)}KB · $${totalCost.toFixed(2)}${round}`
            );
          }
        }

        xhr.onprogress = parseFromBuffer;

        xhr.onload = () => {
          if (xhr.status !== 200) {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error || `Error ${xhr.status}`));
            } catch {
              reject(new Error(`Error ${xhr.status}: ${xhr.responseText.slice(0, 100)}`));
            }
            return;
          }

          // Final parse of any remaining data
          parseFromBuffer();

          if (fullContent.length > 0) {
            // Update cost tracker
            const estimatedOutputTokens = Math.ceil(fullContent.length / 4);
            setCostData((prev) => ({
              inputTokens: prev.inputTokens + estimatedInputTokens,
              outputTokens: prev.outputTokens + estimatedOutputTokens,
            }));
            // Close last module cost
            if (lastDetectedModule.current) {
              const charsForModule = fullContent.length - moduleStartChars.current;
              const tokensForModule = Math.ceil(charsForModule / 4);
              const moduleCost = (tokensForModule / 1_000_000) * 75;
              setModuleCosts((prev) => ({
                ...prev,
                [lastDetectedModule.current!]: moduleCost,
              }));
            }
            // Mark all detected as done
            if (system) {
              setModuleStatus((prev) => {
                const updated = { ...prev };
                for (const k of Object.keys(updated)) {
                  if (updated[k] === "building") updated[k] = "done";
                }
                return updated;
              });
            }
            resolve();
          } else {
            const raw = xhr.responseText;
            setDebugStatus(`Error: sin contenido (${raw.length} bytes). Inicio: "${raw.slice(0, 120)}"`);
            reject(new Error("Respuesta vacía del servidor"));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Error de red — conexión fallida"));
        };

        xhr.ontimeout = () => {
          reject(new Error("Timeout — respuesta demasiado lenta"));
        };

        xhr.timeout = 300000; // 5 minutes

        // Store abort reference
        const prevAbort = abortRef.current;
        if (prevAbort) {
          prevAbort.signal.addEventListener("abort", () => xhr.abort());
        }

        xhr.send(payload);
      });

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
            <div className={cn("h-1.5 w-1.5 rounded-full", streaming ? "bg-green-500 animate-pulse" : "bg-green-500")} />
            {activeModel?.includes("opus") ? "Opus" : activeModel?.includes("sonnet") ? "Sonnet" : "Claude"}
            {activeModel?.includes("sonnet") && (
              <span className="text-[8px] text-blue-500 ml-0.5">FAST</span>
            )}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={resetBuild}
            disabled={streaming}
            title="Resetear conversación"
          >
            <Trash2 className="h-3 w-3" />
            Reset
          </Button>
          {(costData.inputTokens > 0 || costData.outputTokens > 0) && (
            <Badge
              variant="outline"
              className="gap-1 text-[10px] h-6 font-mono border-amber-300 text-amber-700 bg-amber-50"
              title={`Input: ~${(costData.inputTokens / 1000).toFixed(1)}K tokens ($${((costData.inputTokens / 1_000_000) * 15).toFixed(3)})\nOutput: ~${(costData.outputTokens / 1000).toFixed(1)}K tokens ($${((costData.outputTokens / 1_000_000) * 75).toFixed(3)})`}
            >
              <DollarSign className="h-3 w-3" />
              {((costData.inputTokens / 1_000_000) * 15 + (costData.outputTokens / 1_000_000) * 75).toFixed(2)}
            </Badge>
          )}
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
          <div className="[&_button]:h-7 [&_button]:w-7 [&_svg]:h-3.5 [&_svg]:w-3.5">
            <ThemeToggle />
          </div>
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
                  ? "bg-red-500/10 text-red-600 dark:text-red-300"
                  : "bg-emerald-500/10 text-emerald-800 dark:text-white"
              )}>
                {debugStatus}
              </div>
            )}

            {/* Module progress list */}
            {system && Object.keys(moduleStatus).length > 0 && (
              <div className="border-t px-2 py-1.5 space-y-1 max-h-[160px] overflow-y-auto native-scroll">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Módulos</span>
                  <span className="text-[10px] font-mono text-foreground">
                    {Object.values(moduleStatus).filter((s) => s !== "pending").length}/{system.modules.length}
                    {" · "}
                    <span className="text-yellow-400 font-bold">${Object.values(moduleCosts).reduce((a, b) => a + b, 0).toFixed(2)}</span>
                  </span>
                </div>
                {system.modules.map((mod) => {
                  const status = moduleStatus[mod] || "pending";
                  const cost = moduleCosts[mod];
                  return (
                    <div
                      key={mod}
                      className={cn(
                        "flex items-center justify-between rounded-md px-2 py-1 text-[11px]",
                        status === "done" && "bg-green-500/20",
                        status === "building" && "bg-yellow-500/20 ring-1 ring-yellow-500/50",
                        status === "pending" && "opacity-30"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />}
                        {status === "building" && <Loader2 className="h-3.5 w-3.5 text-yellow-400 animate-spin" />}
                        {status === "pending" && <div className="h-3.5 w-3.5 rounded-full border-2 border-foreground/20" />}
                        <span className={cn(
                          "capitalize text-foreground",
                          (status === "done" || status === "building") && "font-semibold",
                        )}>
                          {mod.replace(/_/g, " ")}
                        </span>
                      </div>
                      {cost != null && cost > 0 ? (
                        <span className="text-[10px] font-mono font-semibold text-foreground">
                          ${cost.toFixed(3)}
                        </span>
                      ) : status === "building" ? (
                        <span className="text-[9px] font-mono text-yellow-400">
                          ...
                        </span>
                      ) : null}
                    </div>
                  );
                })}
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
        <div className="flex-1 min-w-0 bg-white dark:bg-white flex items-center justify-center" style={{ backgroundColor: "#ffffff" }}>
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
