# LOCK_REPORT.md — SHA-256 Hashes por Módulo

> Fecha: 2026-03-08 | Algoritmo: SHA-256 | Runtime: Node.js crypto

## Master Hash

```
5a811010a9fef6fefcb3c796801a1b6ddaeb91ce573eb16d9adbef7dec555be6
```

Derivado de: `SHA-256(sorted_entries.map(path:hash).join("|"))`

## Hashes por Archivo

### Foundation (Capa 0)

| Archivo | SHA-256 |
|---------|---------|
| `foundation/contracts.ts` | `dc1b0de1c8712aaac56e5836cefde1d3b2d0f6361dcf531d870434d592101cb5` |
| `foundation/moduleManifest.ts` | `96ee05dc47e487adb92651586cc08cb19af1cd34e0fe2d6c34aab93c0a0ab3a7` |

### Engines (Capa 1)

| Archivo | SHA-256 |
|---------|---------|
| `engines/businessRulesEngine.ts` | `87df879fb8dd897fe2316e0faa9598cea17fbbbb86ef459885b1708b51ec327a` |
| `engines/cartEngine.ts` | `f8e5963e844b4b8265a25e4f3b90f4e6a5241a0198fbd923d26776b5d48f677e` |
| `engines/catalogEngine.ts` | `2e86b5d923316b5bee0d8618a29763a329e1a03c7a5b117b44fab8263a6b24f6` |
| `engines/channelAdapters.ts` | `cc6031392fb6fcb3ca0979184d887a4936a62b03c1dc6a52e60dba63cdc889d5` |
| `engines/humanEscalationEngine.ts` | `809c5809cdd58a51dd7c057499c4331f75109e9ac4c10cdbc4ef45fbf4426afa` |
| `engines/intentEntityEngine.ts` | `8e8d8bc27e49fb3dc3fa774be7b1c17f657cca171257ed41eef0286be3ab86a6` |
| `engines/orderOrchestrator.ts` | `f74e6de92a3c87e18260cd632822057c2510144e382cdb1b7ed2352c98eb6c6a` |
| `engines/posBridge.ts` | `2dd7e2fc852f16b72363a1f25133e03542988da1b8f6ff84ec11392fc6da3582` |
| `engines/reservationEngine.ts` | `5698f55c8bd75c664ba3547b003a7df75430d29e5c7c4164fe10bd10d14b7c87` |
| `engines/sessionMemoryEngine.ts` | `deb908e2c18ac64d719414a3f226db9d9587116b5727b24d101287e1ca001ea9` |
| `engines/stateMachine.ts` | `20e087138e1a178be5299b010525ce7d5f8d5c35676019f1726f1099a28ba0d3` |

### Locks (Capa 2)

| Archivo | SHA-256 |
|---------|---------|
| `locks/moduleLock.ts` | `8a6dd144db6bdd708d93b89e630bc7899e3dbb95f1f48bacc827de7467c992f3` |

### Audits (Capa 3)

| Archivo | SHA-256 |
|---------|---------|
| `audits/behaviorAudit.ts` | `86a0ba0dcd16cdac9b398c3fdb4f4eea3c35cf5f86a7b5ee27be78afa6de1f76` |
| `audits/contractAudit.ts` | `53549dd47e52b35f3d2d9b4655201495e97eaab932de4a79a23627faa69d4aef` |
| `audits/integrityAudit.ts` | `7fca94f319c9fb8dc7a713329a771ee8654a3e0c3dc5853a3b919583d4e378ce` |
| `audits/runAudits.ts` | `49aea57025af3f56c6f534c0afafd500d2819b7ceeb07d78fbfe7e66873db894` |

## Mapeo a Module Manifest

| Lock ID | Archivos Principales | Hash Principal |
|---------|---------------------|----------------|
| LOCK_M0_FOUNDATION | contracts.ts, moduleManifest.ts | `dc1b0de1...` |
| LOCK_M1_MENU_INGESTION | catalogEngine.ts | `2e86b5d9...` |
| LOCK_M2_BUSINESS_RULES | businessRulesEngine.ts | `87df879f...` |
| LOCK_M3_INTENT_ENTITY | intentEntityEngine.ts | `8e8d8bc2...` |
| LOCK_M4_SESSION_MEMORY | sessionMemoryEngine.ts | `deb908e2...` |
| LOCK_M5_STATE_MACHINE | stateMachine.ts | `20e08713...` |
| LOCK_M6_CART_ENGINE | cartEngine.ts | `f8e5963e...` |
| LOCK_M7_ORDER_ORCHESTRATION | orderOrchestrator.ts | `f74e6de9...` |
| LOCK_M8_RESERVATION_ENGINE | reservationEngine.ts | `5698f55c...` |
| LOCK_M9_POS_BRIDGE | posBridge.ts | `2dd7e2fc...` |
| LOCK_M10_CHANNEL_ADAPTERS | channelAdapters.ts | `cc603139...` |
| LOCK_M11_HUMAN_ESCALATION | humanEscalationEngine.ts | `809c5809...` |
| LOCK_M12_OBSERVABILITY_SECURITY | (audits/) | `86a0ba0d...` |

## Verificación

Para verificar la integridad de cualquier archivo:

```bash
shasum -a 256 src/restaurant-agent/foundation/contracts.ts
# Debe coincidir con: dc1b0de1c8712aaac56e5836cefde1d3b2d0f6361dcf531d870434d592101cb5
```

## Política de Gobernanza

> No modificar sin autorización explícita y refresh de lock.

Cualquier modificación a un archivo de módulo invalida su hash y el master hash. Se requiere:
1. Autorización explícita
2. Re-ejecución de las 3 auditorías
3. Regeneración de todos los hashes afectados
4. Actualización del master hash
