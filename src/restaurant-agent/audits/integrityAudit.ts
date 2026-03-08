import { buildModuleLock } from "../locks/moduleLock";

export function runIntegrityAudit(): { name: string; pass: boolean; details: string } {
  try {
    const lock = buildModuleLock(
      "LOCK_M0_FOUNDATION",
      ["src/restaurant-agent/foundation/contracts.ts"],
      ["TenantScopeSchema", "MenuCatalogSchema", "CartSchema", "ReservationSchema"],
      ["contract-audit"],
      ["Cambios en contratos impactan todos los módulos"],
    );

    if (!lock.masterHash || Object.keys(lock.fileHashes).length === 0) {
      throw new Error("Lock incompleto");
    }

    return {
      name: "Integrity Audit",
      pass: true,
      details: `Master hash generado: ${lock.masterHash.slice(0, 12)}...`,
    };
  } catch (error) {
    return {
      name: "Integrity Audit",
      pass: false,
      details: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
