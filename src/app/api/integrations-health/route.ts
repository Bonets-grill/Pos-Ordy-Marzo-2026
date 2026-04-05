/**
 * GET /api/integrations-health
 * Reports readiness of all live integrations (Supabase, Claude, Whisper).
 */

import { NextResponse } from 'next/server';
import { LiveModeService } from '@/modules/live-integrations/services/LiveModeService';

export const runtime = 'nodejs';

export async function GET() {
  const service = new LiveModeService();
  const status = service.getStatus();

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    mode: status.allReady ? 'live' : 'partial',
    integrations: {
      supabase: status.supabaseReady ? 'ready' : 'not_configured',
      claude: status.claudeReady ? 'ready' : 'not_configured',
      whisper: status.whisperReady ? 'ready' : 'not_configured',
    },
    missing_env: status.missing,
  }, {
    status: status.allReady ? 200 : 206,
  });
}
