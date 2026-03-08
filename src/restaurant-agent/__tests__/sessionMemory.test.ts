import { describe, it, expect } from "vitest";
import { SessionMemoryEngine } from "../engines/sessionMemoryEngine";

describe("SessionMemoryEngine", () => {
  it("crea sesión nueva", () => {
    const engine = new SessionMemoryEngine();
    const session = engine.createSession("t1", "whatsapp");
    expect(session.sessionId).toBeTruthy();
    expect(session.tenantId).toBe("t1");
    expect(session.state).toBe("IDLE");
  });

  it("restaura sesión existente", () => {
    const engine = new SessionMemoryEngine();
    const created = engine.createSession("t1", "web");
    const restored = engine.restoreSession(created.sessionId, "t1");
    expect(restored.sessionId).toBe(created.sessionId);
  });

  it("error al restaurar sesión de otro tenant", () => {
    const engine = new SessionMemoryEngine();
    const created = engine.createSession("t1", "web");
    expect(() => engine.restoreSession(created.sessionId, "t2")).toThrow("fuera de tenant");
  });

  it("error al restaurar sesión inexistente", () => {
    const engine = new SessionMemoryEngine();
    expect(() => engine.restoreSession("fake-id", "t1")).toThrow("no encontrada");
  });
});
