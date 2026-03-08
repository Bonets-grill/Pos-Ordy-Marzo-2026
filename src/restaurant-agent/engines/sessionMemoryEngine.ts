import { randomUUID } from "node:crypto";
import { SessionState } from "../foundation/contracts";

type SessionRecord = {
  sessionId: string;
  tenantId: string;
  channel: string;
  state: SessionState;
  updatedAt: string;
  idempotencyKeys: string[];
};

export class SessionMemoryEngine {
  private readonly sessions = new Map<string, SessionRecord>();

  createSession(tenantId: string, channel: string): SessionRecord {
    const session: SessionRecord = {
      sessionId: randomUUID(),
      tenantId,
      channel,
      state: "IDLE",
      updatedAt: new Date().toISOString(),
      idempotencyKeys: [],
    };
    this.sessions.set(session.sessionId, session);
    return session;
  }

  restoreSession(sessionId: string, tenantId: string): SessionRecord {
    const session = this.sessions.get(sessionId);
    if (!session || session.tenantId !== tenantId) {
      throw new Error("Sesión no encontrada o fuera de tenant");
    }
    return session;
  }
}
