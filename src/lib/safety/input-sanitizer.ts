/**
 * Input Sanitization & Validation
 *
 * Centralized input cleaning for all API endpoints.
 * Prevents:
 *   - XSS via HTML injection
 *   - SQL injection via special characters (defense-in-depth, Supabase parameterizes)
 *   - Oversized inputs causing memory issues
 *   - Invalid data types reaching business logic
 */

// ─── Text Sanitization ─────────────────────────────────

/**
 * Sanitize a text input: remove HTML tags, collapse whitespace, trim, enforce max length.
 */
export function sanitizeText(input: unknown, maxLength: number = 500): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "")          // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "") // strip control characters (keep \n, \r, \t)
    .replace(/\s+/g, " ")            // collapse whitespace
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize a name (person name): additional restrictions.
 */
export function sanitizeName(input: unknown, maxLength: number = 100): string {
  const clean = sanitizeText(input, maxLength);
  // Remove characters that aren't typical in names (letters, spaces, hyphens, apostrophes, accents)
  return clean.replace(/[^\p{L}\p{M}\s\-'\.]/gu, "").trim();
}

/**
 * Sanitize a phone number: keep only digits and leading +.
 */
export function sanitizePhone(input: unknown): string {
  if (typeof input !== "string") return "";
  const clean = input.replace(/[^\d+]/g, "").slice(0, 20);
  // Must start with + or digit
  if (clean && !clean.match(/^[\d+]/)) return "";
  return clean;
}

// ─── Validation ─────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate that a value is a valid UUID v4.
 */
export function isValidUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Validate a quantity: must be integer, 1-50.
 */
export function validateQuantity(value: unknown, min: number = 1, max: number = 50): { valid: boolean; value: number; error?: string } {
  const num = typeof value === "number" ? value : parseInt(String(value), 10);
  if (isNaN(num)) return { valid: false, value: 0, error: "quantity must be a number" };
  if (!Number.isInteger(num)) return { valid: false, value: 0, error: "quantity must be an integer" };
  if (num < min) return { valid: false, value: num, error: `quantity must be >= ${min}` };
  if (num > max) return { valid: false, value: num, error: `quantity must be <= ${max}` };
  return { valid: true, value: num };
}

/**
 * Validate a price: must be non-negative number with at most 2 decimals.
 */
export function validatePrice(value: unknown): { valid: boolean; value: number; error?: string } {
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(num)) return { valid: false, value: 0, error: "price must be a number" };
  if (num < 0) return { valid: false, value: num, error: "price must be non-negative" };
  if (num > 99999) return { valid: false, value: num, error: "price exceeds maximum" };
  return { valid: true, value: Math.round(num * 100) / 100 };
}

/**
 * Validate a phone number format (E.164-like).
 */
export function isValidPhone(value: unknown): boolean {
  if (typeof value !== "string") return false;
  // Minimum 8 digits, maximum 15, optional leading +
  return /^\+?\d{8,15}$/.test(value.replace(/[\s\-()]/g, ""));
}

/**
 * Validate a slug (URL-safe identifier).
 */
export function isValidSlug(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 100;
}

// ─── Batch Sanitizer ────────────────────────────────────

/**
 * Sanitize a set of common fields from a request body.
 * Returns a clean copy with all text fields sanitized.
 */
export function sanitizeOrderInput(body: Record<string, unknown>): Record<string, unknown> {
  return {
    ...body,
    item_name: body.item_name ? sanitizeText(body.item_name, 200) : undefined,
    name: body.name ? sanitizeName(body.name) : undefined,
    notes: body.notes ? sanitizeText(body.notes, 500) : undefined,
    customer_name: body.customer_name ? sanitizeName(body.customer_name) : undefined,
    customer_phone: body.customer_phone ? sanitizePhone(body.customer_phone) : undefined,
    customer_notes: body.customer_notes ? sanitizeText(body.customer_notes, 500) : undefined,
    delivery_address: body.delivery_address ? sanitizeText(body.delivery_address, 300) : undefined,
  };
}
