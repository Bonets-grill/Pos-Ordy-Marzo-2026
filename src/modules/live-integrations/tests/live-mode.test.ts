import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LiveModeService } from '../services/LiveModeService';

describe('LiveModeService', () => {
  const original = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY,
    claude: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
  };

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = original.url;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = original.anon;
    process.env.SUPABASE_SERVICE_ROLE_KEY = original.service;
    process.env.ANTHROPIC_API_KEY = original.claude;
    process.env.OPENAI_API_KEY = original.openai;
  });

  it('detects all ready', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-xxx';
    process.env.OPENAI_API_KEY = 'sk-proj-xxx';

    const s = new LiveModeService().getStatus();
    expect(s.allReady).toBe(true);
    expect(s.supabaseReady).toBe(true);
    expect(s.claudeReady).toBe(true);
    expect(s.whisperReady).toBe(true);
    expect(s.missing).toEqual([]);
  });

  it('detects missing supabase', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-xxx';
    process.env.OPENAI_API_KEY = 'sk-proj-xxx';

    const s = new LiveModeService().getStatus();
    expect(s.allReady).toBe(false);
    expect(s.supabaseReady).toBe(false);
    expect(s.missing).toContain('NEXT_PUBLIC_SUPABASE_URL');
  });

  it('detects missing claude', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'x';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'x';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
    delete process.env.ANTHROPIC_API_KEY;
    process.env.OPENAI_API_KEY = 'x';

    const s = new LiveModeService().getStatus();
    expect(s.claudeReady).toBe(false);
    expect(s.missing).toContain('ANTHROPIC_API_KEY');
  });
});
