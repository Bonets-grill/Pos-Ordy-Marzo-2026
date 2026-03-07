import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

// ─── Clients ───
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ─── Auth helpers ───
async function verifySuperAdmin(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  return profile?.role === "super_admin" ? user.id : null;
}

async function verifyAuthUser(
  req: VercelRequest
): Promise<{ userId: string; tenantId: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.tenant_id) return null;
  return { userId: user.id, tenantId: profile.tenant_id };
}

// ─── Route: /api/health ───
function handleHealth(_req: VercelRequest, res: VercelResponse) {
  return res.json({ status: "ok", version: "2.0.0" });
}

// ─── Rate limiting (in-memory, per-IP) ───
const rateLimits = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, maxPerWindow: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxPerWindow) return false;
  entry.count++;
  return true;
}

// ─── Route: /api/auth/register ───
async function handleRegister(req: VercelRequest, res: VercelResponse) {
  // Rate limit: 5 registrations per IP per hour
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`reg:${ip}`, 5, 3600000)) {
    return res.status(429).json({ error: "Too many registration attempts. Try again later." });
  }

  const { email, password, displayName, orgName } = req.body;

  if (!email || !password || !displayName || !orgName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // H2: Server-side password validation
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  // H3: Input sanitization
  const cleanName = String(displayName).trim().slice(0, 100);
  const cleanOrg = String(orgName).trim().slice(0, 100);
  if (!cleanName || !cleanOrg) {
    return res.status(400).json({ error: "Invalid name or organization" });
  }

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password,
      email_confirm: true,
    });

  if (authError) {
    return res.status(400).json({ error: "Registration failed. Email may already be in use." });
  }

  const userId = authData.user.id;
  // H5: Unique slug with random suffix
  const baseSlug = cleanOrg
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .insert({ name: cleanOrg, slug })
    .select()
    .single();

  if (tenantError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return res.status(500).json({ error: "Could not create organization. Please try again." });
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      user_id: userId,
      tenant_id: tenant.id,
      role: "tenant_admin",
      display_name: cleanName,
    });

  if (profileError) {
    await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return res.status(500).json({ error: "Registration failed. Please try again." });
  }

  return res.json({ success: true, userId, tenantId: tenant.id });
}

// ─── Route: /api/admin/ai (SSE streaming) ───
async function handleAI(req: VercelRequest, res: VercelResponse) {
  const adminId = await verifySuperAdmin(req);
  if (!adminId) {
    return res.status(403).json({ error: "Forbidden: super_admin required" });
  }

  // C4: Rate limit AI endpoint (20 req/min per user)
  if (!checkRateLimit(`ai:${adminId}`, 20, 60000)) {
    return res.status(429).json({ error: "Rate limit exceeded. Wait a moment." });
  }

  const { messages, context } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array required" });
  }
  // Cap messages to prevent abuse
  if (messages.length > 50) {
    return res.status(400).json({ error: "Too many messages. Start a new conversation." });
  }

  const systemPrompt = buildSystemPrompt(context);

  // ─── Intelligent Model Router ───
  // Analyzes the task complexity to choose the optimal model
  const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user")?.content?.toLowerCase() || "";
  const msgCount = messages.length;

  const isSimpleTask =
    // Style/text changes
    /^(cambia|change|mueve|move|pon|put|quita|remove|arregla|fix)\s/i.test(lastUserMsg) ||
    // Color/font tweaks
    /(color|font|tamaño|size|titulo|title|texto|text|margen|margin|padding|borde|border)/i.test(lastUserMsg) && lastUserMsg.length < 200 ||
    // Auto-continue (context already set by Opus)
    /^continue\s/i.test(lastUserMsg) ||
    // Short simple requests
    (lastUserMsg.length < 100 && !/build|construye|genera|crea|sistema|module|módulo/i.test(lastUserMsg));

  const isComplexTask =
    // Initial system generation
    msgCount <= 2 ||
    // Explicit build requests
    /build|construye|genera|crea|sistema completo|all modules|todos los módulos/i.test(lastUserMsg) ||
    // Architecture decisions
    /architect|refactor|redesign|migra|database|schema|rls|security/i.test(lastUserMsg) ||
    // Long detailed requests
    lastUserMsg.length > 500;

  const selectedModel = isComplexTask ? "claude-opus-4-6" : isSimpleTask ? "claude-sonnet-4-6" : "claude-opus-4-6";
  const selectedMaxTokens = selectedModel === "claude-opus-4-6" ? 65536 : 16384;

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  // Send model info as first SSE event
  res.write(`data: ${JSON.stringify({ type: "meta", model: selectedModel })}\n\n`);

  try {
    const claudeMessages = messages.map(
      (m: { role: string; content: string; attachments?: Array<{ type: string; name: string; data: string; mimeType: string }> }) => {
        if (!m.attachments || m.attachments.length === 0) {
          return { role: m.role as "user" | "assistant", content: m.content };
        }

        type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
        const contentBlocks: Array<
          | { type: "text"; text: string }
          | { type: "image"; source: { type: "base64"; media_type: ImageMediaType; data: string } }
        > = [];

        for (const att of m.attachments) {
          if (att.type === "image" && att.mimeType.startsWith("image/")) {
            contentBlocks.push({
              type: "image",
              source: { type: "base64", media_type: att.mimeType as ImageMediaType, data: att.data },
            });
          } else {
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
      res.write(`data: ${JSON.stringify({ type: "error", content: String(error) })}\n\n`);
      res.end();
    });
  } catch (error) {
    console.error("[ai] error:", error);
    res.write(`data: ${JSON.stringify({ type: "error", content: "AI service error" })}\n\n`);
    res.end();
  }
}

// ─── Route: /api/checkout/create ───
async function handleCheckout(req: VercelRequest, res: VercelResponse) {
  const auth = await verifyAuthUser(req);
  if (!auth) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const { systemId } = req.body;
  if (!systemId || typeof systemId !== "string") {
    return res.status(400).json({ error: "systemId required" });
  }

  // H4: Server-side pricing catalog — never trust client prices
  const PRICING: Record<string, { price: number; monthly: number }> = {
    crm: { price: 34900, monthly: 5900 }, project_management: { price: 34900, monthly: 5900 },
    invoicing: { price: 34900, monthly: 5900 }, restaurant: { price: 34900, monthly: 5900 },
    booking_system: { price: 34900, monthly: 5900 }, ecommerce: { price: 34900, monthly: 5900 },
    pos_system: { price: 34900, monthly: 5900 }, freelancer_platform: { price: 34900, monthly: 5900 },
    salon_spa: { price: 34900, monthly: 5900 }, saas_dashboard: { price: 34900, monthly: 5900 },
    helpdesk: { price: 34900, monthly: 5900 }, cms: { price: 34900, monthly: 5900 },
    social_media_manager: { price: 34900, monthly: 5900 }, real_estate: { price: 34900, monthly: 5900 },
    gym_fitness: { price: 29900, monthly: 4900 }, cleaning_service: { price: 29900, monthly: 4900 },
    auto_repair: { price: 29900, monthly: 4900 }, tutoring: { price: 29900, monthly: 4900 },
    event_management: { price: 29900, monthly: 4900 }, catering: { price: 24900, monthly: 3900 },
    podcast_platform: { price: 24900, monthly: 3900 },
    hr_platform: { price: 49900, monthly: 7900 }, agency_platform: { price: 49900, monthly: 7900 },
    clinic_management: { price: 59900, monthly: 9900 }, hotel_booking: { price: 49900, monthly: 7900 },
    food_delivery: { price: 59900, monthly: 9900 }, dental_clinic: { price: 49900, monthly: 7900 },
    lms: { price: 59900, monthly: 9900 }, school_management: { price: 49900, monthly: 7900 },
    property_management: { price: 49900, monthly: 7900 }, legal_firm: { price: 49900, monthly: 7900 },
    marketplace: { price: 59900, monthly: 9900 }, ai_automation: { price: 59900, monthly: 9900 },
    accounting: { price: 49900, monthly: 7900 }, expense_tracker: { price: 0, monthly: 0 },
  };
  const pricing = PRICING[systemId];
  if (!pricing) {
    return res.status(400).json({ error: "Unknown system" });
  }

  const { data: stripeKeys } = await supabaseAdmin
    .from("platform_settings")
    .select("key, value")
    .in("key", ["stripe_secret_key", "stripe_public_key"]);

  const stripeSecretKey = stripeKeys?.find((k) => k.key === "stripe_secret_key")?.value;

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      system_id: systemId,
      status: "pending",
      amount: pricing.price,
      monthly_fee: pricing.monthly,
    })
    .select()
    .single();

  if (orderError) {
    return res.status(500).json({ error: orderError.message });
  }

  if (stripeSecretKey && stripeSecretKey.startsWith("sk_")) {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeSecretKey);

      const origin = process.env.CORS_ORIGIN || "https://layra.orsysuite.com";
      const stripeSession = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${origin}/dashboard?checkout=success&order=${order.id}`,
        cancel_url: `${origin}/checkout/${systemId}?cancelled=true`,
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
        metadata: { order_id: order.id, system_id: systemId, tenant_id: auth.tenantId },
      });

      await supabaseAdmin
        .from("orders")
        .update({ stripe_checkout_id: stripeSession.id })
        .eq("id", order.id);

      return res.json({ url: stripeSession.url, orderId: order.id });
    } catch (err) {
      console.error("[checkout] stripe error:", err);
      return res.status(500).json({ error: "Stripe checkout failed", orderId: order.id });
    }
  }

  return res.json({ orderId: order.id, message: "Order created. Stripe not configured." });
}

// ─── Route: /api/webhook/stripe ───
async function handleWebhook(req: VercelRequest, res: VercelResponse) {
  const { data: settings } = await supabaseAdmin
    .from("platform_settings")
    .select("key, value")
    .in("key", ["stripe_secret_key", "stripe_webhook_secret"]);

  const stripeSecretKey = settings?.find((k) => k.key === "stripe_secret_key")?.value;
  const webhookSecret = settings?.find((k) => k.key === "stripe_webhook_secret")?.value;

  if (!stripeSecretKey || !webhookSecret) {
    return res.status(400).json({ error: "Stripe not configured" });
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecretKey);

    const sig = req.headers["stripe-signature"] as string;
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const orderId = session.metadata?.order_id;
      if (orderId) {
        await supabaseAdmin
          .from("orders")
          .update({ status: "paid", stripe_customer_id: session.customer })
          .eq("id", orderId);
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("[webhook] error:", err);
    return res.status(400).json({ error: "Webhook verification failed" });
  }
}

// ─── Router ───
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Security headers (M3)
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // CORS (M1 — only set headers for allowed origins)
  const origin = req.headers.origin || "";
  const allowed = [
    "https://layra.orsysuite.com",
    "https://layra-v2.vercel.app",
    "http://localhost:5180",
  ];
  if (allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const path = req.url?.replace(/\?.*$/, "") || "";

  // Route matching
  if (path === "/api/health" && req.method === "GET") {
    return handleHealth(req, res);
  }
  if (path === "/api/auth/register" && req.method === "POST") {
    return handleRegister(req, res);
  }
  if (path === "/api/admin/ai" && req.method === "POST") {
    return handleAI(req, res);
  }
  if (path === "/api/checkout/create" && req.method === "POST") {
    return handleCheckout(req, res);
  }
  if (path === "/api/webhook/stripe" && req.method === "POST") {
    return handleWebhook(req, res);
  }

  return res.status(404).json({ error: "Not found" });
}

// ─── System prompt (extracted for readability) ───
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

${context ? `═══ BUILD CONTEXT ═══\n${context}\n` : ""}

═══ OUTPUT FORMAT ═══
Start IMMEDIATELY with \`\`\`html — no text before it.
After code, max 2 sentences of explanation.
NEVER use "..." or "// rest". Write COMPLETE code.
NEVER output a module with empty tables or placeholder content.
Every module must have REAL mock data and WORKING buttons.`;
}
