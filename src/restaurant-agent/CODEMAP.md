# CODEMAP.md — Restaurant Agent Immutable Architecture v1

> Generado: 2026-03-08 | Master Hash: `5a811010a9fe...`

## Estructura de Directorios

```
src/restaurant-agent/
├── index.ts                          # Barrel export — punto de entrada único
├── README.md                         # Descripción del módulo
│
├── foundation/                       # Capa 0 — Contratos inmutables
│   ├── contracts.ts                  # Zod schemas + tipos TypeScript
│   └── moduleManifest.ts             # Registro de 13 módulos inmutables
│
├── engines/                          # Capa 1 — Motores determinísticos
│   ├── businessRulesEngine.ts        # Horarios, zonas, mínimos, modos operativos
│   ├── cartEngine.ts                 # Carrito: add/remove/freeze/recalculate
│   ├── catalogEngine.ts             # Catálogo: búsqueda, validación, productos
│   ├── channelAdapters.ts           # Normalización entrada Web + WhatsApp
│   ├── humanEscalationEngine.ts     # Generación de tickets de escalación
│   ├── intentEntityEngine.ts        # Detección de intents + extracción entidades
│   ├── orderOrchestrator.ts         # Confirmación de pedido con idempotencia
│   ├── posBridge.ts                 # Despacho al POS con firma SHA-256
│   ├── reservationEngine.ts         # CRUD de reservas con validación Zod
│   ├── sessionMemoryEngine.ts       # Gestión de sesiones por tenant
│   └── stateMachine.ts             # FSM: 17 estados, guards, wildcards
│
├── locks/                            # Capa 2 — Integridad inmutable
│   └── moduleLock.ts                 # Generador de hashes SHA-256 por módulo
│
├── audits/                           # Capa 3 — Auditorías pre-entrega
│   ├── contractAudit.ts              # Valida todos los Zod schemas
│   ├── behaviorAudit.ts             # Valida flujo cart→order→stateMachine
│   ├── integrityAudit.ts            # Valida generación de lock hash
│   └── runAudits.ts                 # Runner: ejecuta las 3 auditorías
│
└── __tests__/                        # 13 suites — 84 tests
    ├── contracts.test.ts             # 12 tests — schemas Zod
    ├── cartEngine.test.ts            # 9 tests — carrito completo
    ├── businessRules.test.ts         # 10 tests — reglas de negocio
    ├── stateMachine.test.ts          # 8 tests — transiciones FSM
    ├── orderOrchestrator.test.ts     # 7 tests — orquestación pedidos
    ├── catalogEngine.test.ts         # 8 tests — catálogo
    ├── intentEntity.test.ts          # 10 tests — intents
    ├── reservation.test.ts           # 5 tests — reservas
    ├── posBridge.test.ts             # 3 tests — POS bridge
    ├── channelAdapters.test.ts       # 2 tests — adaptadores canal
    ├── humanEscalation.test.ts       # 2 tests — escalación
    ├── sessionMemory.test.ts         # 4 tests — sesiones
    └── audits.test.ts                # 4 tests — auditorías
```

## Grafo de Dependencias

```
contracts.ts ─────────────┬──> cartEngine.ts ──────────> orderOrchestrator.ts
                          ├──> catalogEngine.ts ───────> intentEntityEngine.ts
                          ├──> reservationEngine.ts
                          ├──> businessRulesEngine.ts ─> orderOrchestrator.ts
                          ├──> sessionMemoryEngine.ts
                          ├──> stateMachine.ts
                          ├──> contractAudit.ts
                          └──> behaviorAudit.ts ───────> (cart + catalog + rules + orchestrator + stateMachine)

moduleManifest.ts ─────── (standalone, sin dependencias)

channelAdapters.ts ─────── (standalone, sin dependencias)

humanEscalationEngine.ts ─ (standalone, sin dependencias)

posBridge.ts ──────────── (standalone, usa node:crypto)

moduleLock.ts ─────────── (standalone, usa node:crypto + node:fs)
                          └──> integrityAudit.ts

runAudits.ts ──────────── contractAudit + behaviorAudit + integrityAudit

index.ts ──────────────── re-exporta todo
```

## Blast Radius

| Si modificas...            | Impacta en...                                                         |
|---------------------------|-----------------------------------------------------------------------|
| `contracts.ts`            | **TODOS** los engines, auditorías, y tests                            |
| `cartEngine.ts`           | orderOrchestrator, behaviorAudit, cartEngine.test, audits.test        |
| `catalogEngine.ts`        | intentEntityEngine, behaviorAudit, catalogEngine.test, audits.test    |
| `businessRulesEngine.ts`  | orderOrchestrator, behaviorAudit, businessRules.test, audits.test     |
| `stateMachine.ts`         | behaviorAudit, stateMachine.test, audits.test                         |
| `orderOrchestrator.ts`    | behaviorAudit, orderOrchestrator.test, audits.test                    |
| `moduleLock.ts`           | integrityAudit, audits.test                                          |
| `channelAdapters.ts`      | channelAdapters.test (aislado)                                        |
| `posBridge.ts`            | posBridge.test (aislado)                                               |
| `humanEscalationEngine.ts`| humanEscalation.test (aislado)                                        |
| `reservationEngine.ts`    | reservation.test (aislado)                                             |
| `sessionMemoryEngine.ts`  | sessionMemory.test (aislado)                                           |

## Tecnologías

| Componente     | Tecnología             |
|---------------|------------------------|
| Validación     | Zod v4.3.6             |
| Hashing        | node:crypto (SHA-256)  |
| Tests          | Vitest v4.0.18         |
| Cobertura      | @vitest/coverage-v8    |
| TypeScript     | tsc (strict mode)      |
| Runtime        | Node.js                |
