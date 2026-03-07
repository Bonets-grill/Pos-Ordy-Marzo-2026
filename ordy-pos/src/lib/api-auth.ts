import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Verify that the request comes from an authenticated user.
 * Returns the user if authenticated, or a 401 NextResponse if not.
 */
export async function requireAuth(): Promise<
  | { user: { id: string; email?: string }; tenantId: string | null; error?: never }
  | { error: NextResponse; user?: never }
> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // Extract tenant_id from user metadata if available
  const tenantId = (user.user_metadata?.tenant_id as string) || null;

  return { user: { id: user.id, email: user.email }, tenantId };
}
