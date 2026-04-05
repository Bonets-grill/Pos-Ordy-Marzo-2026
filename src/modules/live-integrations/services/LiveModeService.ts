/**
 * LiveModeService — Detects whether live integrations are configured.
 * Allows graceful fallback to mocks if env vars are missing.
 */

export interface LiveModeStatus {
  supabaseReady: boolean;
  claudeReady: boolean;
  whisperReady: boolean;
  allReady: boolean;
  missing: string[];
}

export class LiveModeService {
  getStatus(): LiveModeStatus {
    const supabaseReady = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const claudeReady = !!process.env.ANTHROPIC_API_KEY;
    const whisperReady = !!process.env.OPENAI_API_KEY;

    const missing: string[] = [];
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    if (!process.env.ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY');
    if (!process.env.OPENAI_API_KEY) missing.push('OPENAI_API_KEY');

    return {
      supabaseReady,
      claudeReady,
      whisperReady,
      allReady: supabaseReady && claudeReady && whisperReady,
      missing,
    };
  }
}
