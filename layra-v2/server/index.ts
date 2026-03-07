import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
const PORT = process.env.PORT || 3001;

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ── Security headers ──
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(
  cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5180" })
);
app.use(express.json({ limit: "5mb" }));

// ── Rate limiter (in-memory) ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(windowMs: number, maxRequests: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      res.status(429).json({ error: "Too many requests. Try again later." });
      return;
    }

    entry.count++;
    next();
  };
}

// Clean up rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", version: "2.0.0" });
});

// ────────────────────────────────
// AUTH: Verify super_admin from JWT
// ────────────────────────────────
async function verifySuperAdmin(
  req: express.Request
): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    console.error("[auth] No Bearer token in Authorization header");
    return null;
  }

  const token = authHeader.slice(7);
  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);
  if (!user) {
    console.error("[auth] getUser failed:", userError?.message || "no user");
    return null;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    console.error("[auth] profile not found for user:", user.id, profileError?.message);
    return null;
  }

  if (profile.role !== "super_admin") {
    console.error("[auth] user role is:", profile.role, "expected super_admin");
    return null;
  }

  return user.id;
}

// ────────────────────────────────
// REGISTER
// ────────────────────────────────
app.post("/api/auth/register", rateLimit(60_000, 5), async (req, res) => {
  const { email, password, displayName, orgName } = req.body;

  if (!email || !password || !displayName || !orgName) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    console.error("[register] auth error:", authError);
    res.status(400).json({ error: authError.message });
    return;
  }

  const userId = authData.user.id;

  const slug = orgName
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .insert({ name: orgName, slug })
    .select()
    .single();

  if (tenantError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    res.status(500).json({ error: tenantError.message });
    return;
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      user_id: userId,
      tenant_id: tenant.id,
      role: "tenant_admin",
      display_name: displayName,
    });

  if (profileError) {
    await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    res.status(500).json({ error: profileError.message });
    return;
  }

  res.json({ success: true, userId, tenantId: tenant.id });
});

// ────────────────────────────────
// SHARED: System prompt builder
// ────────────────────────────────
function buildSystemPrompt(context?: string): string {
  return `You are LAYRA BUILDER — an elite AI system architect that builds production-grade SaaS systems.

LANGUAGE: ALWAYS respond in SPANISH. All explanations, comments, and conversation must be in Spanish. Code comments can be in English but all user-facing text and your responses MUST be in Spanish.

YOUR MISSION: Build fully functional, beautiful SaaS systems. Every button must work, every module must be interactive.

═══ MODULAR ARCHITECTURE (CRITICAL) ═══

You build systems MODULE BY MODULE, not all at once. Each module is a self-contained \`<section>\` inside ONE HTML page.

STRUCTURE:
\`\`\`
<!-- SHELL: sidebar + header + navigation JS -->
<aside id="sidebar">...</aside>
<main id="main-content">

  <!-- MODULE:dashboard -->
  <section id="mod-dashboard" class="module-panel">
    <!-- Complete dashboard content here -->
  </section>

  <!-- MODULE:patients -->
  <section id="mod-patients" class="module-panel hidden">
    <!-- Complete patients content here -->
  </section>

  <!-- MODULE:appointments -->
  <section id="mod-appointments" class="module-panel hidden">
    <!-- Complete appointments content here -->
  </section>

</main>
\`\`\`

NAVIGATION JS (MANDATORY — include in EVERY response):
\`\`\`javascript
function showModule(id) {
  document.querySelectorAll('.module-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById('mod-' + id)?.classList.remove('hidden');
  document.querySelectorAll('[data-nav]').forEach(n => {
    n.classList.toggle('bg-emerald-50', n.dataset.nav === id);
    n.classList.toggle('text-emerald-700', n.dataset.nav === id);
  });
}
\`\`\`

Sidebar nav items MUST use: \`<button data-nav="patients" onclick="showModule('patients')">\`

═══ MODULE REQUIREMENTS ═══

Each module section MUST include:
- KPI cards with realistic numbers at the top
- A data table with 5+ rows of realistic data (real names, dates, amounts)
- Action buttons that work (Add, Edit, Delete with modal/form)
- Search/filter input
- Status badges with colors
- Modals for add/edit forms (toggled via JS)

MODAL PATTERN (use for every add/edit):
\`\`\`javascript
function toggleModal(id) {
  const m = document.getElementById(id);
  m.classList.toggle('hidden');
}
\`\`\`
\`\`\`html
<div id="add-patient-modal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div class="bg-white rounded-xl p-6 w-full max-w-lg">
    <h3>Add Patient</h3>
    <form>...</form>
    <button onclick="toggleModal('add-patient-modal')">Cancel</button>
  </div>
</div>
\`\`\`

═══ BUILD MODES ═══

MODE 1 — INITIAL BUILD: When asked to build a system, generate the SHELL + first 2-3 modules fully complete.
The auto-continue system will ask you to keep going with the remaining modules.

MODE 2 — CONTINUE: When asked to "continue", output ONLY the next module sections (<!-- MODULE:name --> blocks).
Start with the section tag, end with the closing section tag. The system will merge them into the existing HTML.

MODE 3 — FIX/EDIT: When context includes "CODEMAP" and "TARGET MODULE", you receive ONLY one module's code.
Fix ONLY that module. Output the complete fixed module section. Do NOT output other modules.

═══ CODEMAP (sent with fix requests) ═══
\`\`\`json
{
  "modules": {
    "dashboard": { "status": "complete", "lines": "50-120", "has_modals": true },
    "patients": { "status": "complete", "lines": "121-280", "has_modals": true, "depends": ["shared-utils"] },
    "appointments": { "status": "incomplete", "lines": "281-350" }
  }
}
\`\`\`
When you receive a codemap, ONLY modify the TARGET MODULE. Never touch other modules.

═══ BUSINESS MODEL — B2B2B ═══
Each system is a white-label SaaS sold to an entrepreneur who resells to businesses.
3 roles: Super Admin (buyer), Tenant Admin (business owner), Staff (employees).

═══ DESIGN ═══
- Tailwind CDN + Inter font + inline SVG icons
- Brand: emerald/jade (#00e5b8)
- Linear/Vercel/Stripe quality: rounded-xl, shadows, clean spacing
- Mobile responsive
- Dark sidebar with light content area

${context ? \`═══ BUILD CONTEXT ═══\\n\${context}\\n\` : ""}

═══ OUTPUT FORMAT ═══
Start IMMEDIATELY with \\\`\\\`\\\`html — no text before it.
After code, max 2 sentences of explanation.
NEVER use "..." or "// rest". Write COMPLETE code.
NEVER output a module with empty tables or placeholder content.
Every module must have REAL mock data and WORKING buttons.`;
}

// ────────────────────────────────
// AI TERMINAL — Super Admin only
// Streaming Claude conversation
// ────────────────────────────────
app.post("/api/admin/ai", rateLimit(60_000, 20), async (req, res) => {
  const adminId = await verifySuperAdmin(req);
  if (!adminId) {
    res.status(403).json({ error: "Forbidden: super_admin required" });
    return;
  }

  const { messages, context } = req.body;
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  // Build system prompt with platform context
  const systemPrompt = buildSystemPrompt(context);

  // ─── Intelligent Model Router ───
  const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user")?.content?.toLowerCase() || "";
  const msgCount = messages.length;

  const isSimpleTask =
    /^(cambia|change|mueve|move|pon|put|quita|remove|arregla|fix)\s/i.test(lastUserMsg) ||
    (/(color|font|tamaño|size|titulo|title|texto|text|margen|margin|padding|borde|border)/i.test(lastUserMsg) && lastUserMsg.length < 200) ||
    /^continue\s/i.test(lastUserMsg) ||
    (lastUserMsg.length < 100 && !/build|construye|genera|crea|sistema|module|módulo/i.test(lastUserMsg));

  const isComplexTask =
    msgCount <= 2 ||
    /build|construye|genera|crea|sistema completo|all modules|todos los módulos/i.test(lastUserMsg) ||
    /architect|refactor|redesign|migra|database|schema|rls|security/i.test(lastUserMsg) ||
    lastUserMsg.length > 500;

  const selectedModel = isComplexTask ? "claude-opus-4-6" : isSimpleTask ? "claude-sonnet-4-6" : "claude-opus-4-6";
  const selectedMaxTokens = selectedModel === "claude-opus-4-6" ? 65536 : 16384;

  // Set up SSE streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send model info as first SSE event
  res.write(`data: ${JSON.stringify({ type: "meta", model: selectedModel })}\n\n`);

  try {
    // Convert messages to Claude format, handling image/file attachments
    const claudeMessages = messages.map(
      (m: { role: string; content: string; attachments?: Array<{ type: string; name: string; data: string; mimeType: string }> }) => {
        // If no attachments, send as plain text
        if (!m.attachments || m.attachments.length === 0) {
          return { role: m.role as "user" | "assistant", content: m.content };
        }

        // Build multi-modal content array
        const contentBlocks: Array<
          | { type: "text"; text: string }
          | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
        > = [];

        // Add image attachments first
        for (const att of m.attachments) {
          if (att.type === "image" && att.mimeType.startsWith("image/")) {
            contentBlocks.push({
              type: "image",
              source: {
                type: "base64",
                media_type: att.mimeType,
                data: att.data,
              },
            });
          } else {
            // For non-image files, include content as text with filename header
            try {
              const decoded = Buffer.from(att.data, "base64").toString("utf-8");
              contentBlocks.push({
                type: "text",
                text: `--- File: ${att.name} (${att.mimeType}) ---\n${decoded}\n--- End of ${att.name} ---`,
              });
            } catch {
              contentBlocks.push({
                type: "text",
                text: `[Attached file: ${att.name} (${att.mimeType}) — binary, could not decode]`,
              });
            }
          }
        }

        // Add the text message
        if (m.content.trim()) {
          contentBlocks.push({ type: "text", text: m.content });
        }

        return { role: m.role as "user" | "assistant", content: contentBlocks };
      }
    );

    const stream = anthropic.messages.stream({
      model: selectedModel,
      max_tokens: selectedMaxTokens,
      system: systemPrompt,
      messages: claudeMessages,
    });

    stream.on("text", (text) => {
      res.write(`data: ${JSON.stringify({ type: "text", content: text })}\n\n`);
    });

    stream.on("end", () => {
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    });

    stream.on("error", (error) => {
      console.error("[ai] stream error:", error);
      res.write(
        `data: ${JSON.stringify({ type: "error", content: String(error) })}\n\n`
      );
      res.end();
    });

    // Handle client disconnect
    req.on("close", () => {
      stream.abort();
    });
  } catch (error) {
    console.error("[ai] error:", error);
    res.write(
      `data: ${JSON.stringify({ type: "error", content: "AI service error" })}\n\n`
    );
    res.end();
  }
});

// ────────────────────────────────
// CHECKOUT — Create Stripe session or pending order
// ────────────────────────────────
async function verifyAuthUser(
  req: express.Request
): Promise<{ userId: string; tenantId: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const {
    data: { user },
  } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.tenant_id) return null;
  return { userId: user.id, tenantId: profile.tenant_id };
}

app.post("/api/checkout/create", rateLimit(60_000, 10), async (req, res) => {
  const auth = await verifyAuthUser(req);
  if (!auth) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { systemId } = req.body;
  if (!systemId || typeof systemId !== "string" || systemId.length > 100) {
    res.status(400).json({ error: "Valid systemId required" });
    return;
  }

  // Validate amount if provided
  const amount = Number(req.body.amount) || 0;
  const monthlyFee = Number(req.body.monthlyFee) || 0;
  if (amount < 0 || amount > 10_000_00 || monthlyFee < 0 || monthlyFee > 10_000_00) {
    res.status(400).json({ error: "Invalid amount" });
    return;
  }

  // Check if Stripe is configured
  const { data: stripeKeys } = await supabaseAdmin
    .from("platform_settings")
    .select("key, value")
    .in("key", ["stripe_secret_key", "stripe_public_key"]);

  const stripeSecretKey = stripeKeys?.find(
    (k) => k.key === "stripe_secret_key"
  )?.value;

  // Create the order record
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      system_id: systemId,
      status: "pending",
      amount,
      monthly_fee: monthlyFee,
    })
    .select()
    .single();

  if (orderError) {
    console.error("[checkout] order error:", orderError);
    res.status(500).json({ error: orderError.message });
    return;
  }

  // If Stripe is configured, create a Stripe Checkout session
  if (stripeSecretKey && stripeSecretKey.startsWith("sk_")) {
    try {
      // Dynamic import of stripe
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeSecretKey);

      const sessionParams: any = {
        mode: "payment",
        success_url: `${
          process.env.CORS_ORIGIN || "http://localhost:5180"
        }/dashboard?checkout=success&order=${order.id}`,
        cancel_url: `${
          process.env.CORS_ORIGIN || "http://localhost:5180"
        }/checkout/${systemId}?cancelled=true`,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Layra System: ${systemId}`,
                description: `One-time license for ${systemId} system`,
              },
              unit_amount: order.amount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          order_id: order.id,
          system_id: systemId,
          tenant_id: auth.tenantId,
        },
      };

      const stripeSession = await stripe.checkout.sessions.create(
        sessionParams
      );

      // Update order with Stripe session ID
      await supabaseAdmin
        .from("orders")
        .update({ stripe_checkout_id: stripeSession.id })
        .eq("id", order.id);

      res.json({ url: stripeSession.url, orderId: order.id });
    } catch (err) {
      console.error("[checkout] stripe error:", err);
      res.status(500).json({
        error: "Stripe checkout failed",
        orderId: order.id,
      });
    }
  } else {
    // No Stripe configured — return order without payment URL
    res.json({
      orderId: order.id,
      message: "Order created. Stripe not configured — payment pending.",
    });
  }
});

// ────────────────────────────────
// STRIPE WEBHOOK — Handle payment events
// ────────────────────────────────
app.post(
  "/api/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const { data: settings } = await supabaseAdmin
      .from("platform_settings")
      .select("key, value")
      .in("key", ["stripe_secret_key", "stripe_webhook_secret"]);

    const stripeSecretKey = settings?.find(
      (k) => k.key === "stripe_secret_key"
    )?.value;
    const webhookSecret = settings?.find(
      (k) => k.key === "stripe_webhook_secret"
    )?.value;

    if (!stripeSecretKey || !webhookSecret) {
      res.status(400).json({ error: "Stripe not configured" });
      return;
    }

    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeSecretKey);

      const sig = req.headers["stripe-signature"] as string;
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;
        const orderId = session.metadata?.order_id;

        if (orderId) {
          await supabaseAdmin
            .from("orders")
            .update({
              status: "paid",
              stripe_customer_id: session.customer,
            })
            .eq("id", orderId);

          console.log(`[webhook] Order ${orderId} marked as paid`);
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error("[webhook] error:", err);
      res.status(400).json({ error: "Webhook verification failed" });
    }
  }
);

app.listen(PORT, () => {
  console.log(`[Layra API] Running on port ${PORT}`);
});
