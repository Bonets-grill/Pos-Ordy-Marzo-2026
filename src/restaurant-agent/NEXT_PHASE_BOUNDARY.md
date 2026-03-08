# NEXT_PHASE_BOUNDARY.md — Frontera Oficial Phase 2

> Fecha: 2026-03-08
> Referencia: FREEZE_V1.md
> Regla base: Phase 2 NO contamina Freeze v1. Cero excepciones.

---

## 1. Qué se puede tocar en la siguiente fase

### Zonas permitidas para código nuevo

```
src/restaurant-agent/
├── foundation/          ❌ CONGELADO (LOCK_M0)
├── engines/             ❌ CONGELADO (LOCK_M1)
├── locks/               ❌ CONGELADO (LOCK_M1)
├── audits/              ❌ CONGELADO (LOCK_M2)
├── index.ts             ❌ CONGELADO (LOCK_M1)
│
├── phase2/              ✅ NUEVA — todo el código Phase 2 va aquí
│   ├── engines/         ✅ engines nuevos (pagos, notificaciones, etc.)
│   ├── adapters/        ✅ conectores externos (Evolution API, POS HTTP, DB)
│   ├── api/             ✅ endpoints HTTP / edge functions
│   ├── middleware/       ✅ auth, rate limiting, logging
│   └── index.ts         ✅ barrel export de Phase 2
│
├── __tests__/           ✅ MODIFICABLE — agregar tests nuevos, NO borrar existentes
│   ├── *.test.ts        ✅ los 13 existentes: pueden recibir tests adicionales
│   └── phase2/          ✅ tests exclusivos de Phase 2
│
├── FREEZE_V1.md         ❌ CONGELADO (documento de referencia)
├── NEXT_PHASE_BOUNDARY.md  ← este archivo (referencia, no congelado)
└── vitest.config.ts     ✅ MODIFICABLE — puede extender include para phase2/
```

### Reglas para la zona `__tests__/`

| Acción | Permitida |
|--------|-----------|
| Agregar tests nuevos a suites existentes | SI — solo append, no modificar tests existentes |
| Crear suites nuevas en `__tests__/phase2/` | SI |
| Modificar o eliminar tests existentes | NO — son la red de seguridad de Freeze v1 |
| Los 84 tests actuales deben seguir pasando | OBLIGATORIO en todo momento |

### Archivos raíz modificables

| Archivo | Permitido | Restricción |
|---------|-----------|-------------|
| `tsconfig.json` | SI | Solo agregar paths, no cambiar strict/target |
| `vitest.config.ts` | SI | Solo extender include, no excluir tests existentes |
| `package.json` | SI | Solo agregar dependencias nuevas, no modificar ni eliminar existentes |

---

## 2. Locks absolutamente intocables

| Lock | Archivos | Master Hash | Estado |
|------|----------|-------------|--------|
| **LOCK_M0_FOUNDATION** | `foundation/contracts.ts`, `foundation/moduleManifest.ts` | `cf217334...` | INTOCABLE |
| **LOCK_M1_CORE_ENGINES** | 11 engines + `locks/moduleLock.ts` + `index.ts` | `b6c6f562...` | INTOCABLE |
| **LOCK_M2_DOCS_AND_AUDITS** | 4 auditorías + 8 documentos | `daf7dba8...` | INTOCABLE |

### Qué significa "intocable"

- No se puede modificar ni un solo byte de ningún archivo listado
- No se puede renombrar ningún archivo
- No se puede mover ningún archivo a otro directorio
- No se puede eliminar ningún archivo
- No se puede cambiar el encoding del archivo
- No se puede agregar imports a estos archivos
- No se puede agregar exports a estos archivos
- No se puede modificar `index.ts` para agregar re-exports de Phase 2

### Verificación continua

Antes de cada merge/deploy de Phase 2, ejecutar:

```bash
# 1. Hashes intactos
shasum -a 256 src/restaurant-agent/foundation/contracts.ts
# Debe ser: dc1b0de1c8712aaac56e5836cefde1d3...

# 2. Tests v1 intactos
npx vitest run src/restaurant-agent/__tests__/
# Debe ser: 84/84 pass (o más si se agregaron)

# 3. Types intactos
npx tsc --noEmit
# Debe ser: 0 errors

# 4. Auditorías intactas
# runThreeAudits() debe retornar 3/3 PASS
```

---

## 3. Archivos nuevos que deberán crearse fuera del freeze actual

### Directorio `phase2/engines/` — Engines nuevos

| Archivo a crear | Propósito | Depende de (solo lectura) |
|----------------|-----------|---------------------------|
| `phase2/engines/paymentEngine.ts` | Procesamiento de pagos post-confirmación | Importa tipos de `foundation/contracts.ts` (read-only) |
| `phase2/engines/notificationEngine.ts` | Push, email, SMS post-evento | Importa `AuditEvent` de contracts (read-only) |
| `phase2/engines/observabilityEngine.ts` | Emisor de AuditEvents, logging estructurado | Importa `AuditEventSchema` de contracts (read-only) |
| `phase2/engines/promotionEngine.ts` | Descuentos, cupones, ofertas | Importa `Cart` de contracts (read-only) |
| `phase2/engines/multiLangIntentEngine.ts` | Detección de intents multi-idioma | Importa `CatalogEngine` de engines (read-only) |

### Directorio `phase2/adapters/` — Conectores externos

| Archivo a crear | Propósito | Depende de (solo lectura) |
|----------------|-----------|---------------------------|
| `phase2/adapters/evolutionApiAdapter.ts` | Conexión real a Evolution API (WhatsApp) | Importa `NormalizedInboundMessage` de channelAdapters (read-only) |
| `phase2/adapters/posHttpAdapter.ts` | Envío HTTP real al POS | Importa tipo de retorno de `POSBridge` (read-only) |
| `phase2/adapters/supabaseAdapter.ts` | Persistencia real en Supabase/Postgres | Importa tipos de contracts (read-only) |
| `phase2/adapters/reservationDbAdapter.ts` | Persistencia de reservas en DB | Importa `Reservation` de contracts (read-only) |

### Directorio `phase2/middleware/`

| Archivo a crear | Propósito | Depende de (solo lectura) |
|----------------|-----------|---------------------------|
| `phase2/middleware/authMiddleware.ts` | Verificación de JWT/session | Importa `TenantScope` de contracts (read-only) |
| `phase2/middleware/rateLimiter.ts` | Rate limiting por tenant/IP | Standalone |
| `phase2/middleware/requestLogger.ts` | Logging de requests | Importa `AuditEvent` de contracts (read-only) |

### Directorio `phase2/api/`

| Archivo a crear | Propósito | Depende de (solo lectura) |
|----------------|-----------|---------------------------|
| `phase2/api/chatEndpoint.ts` | Endpoint HTTP para chat web | Compone engines de M1 (read-only) |
| `phase2/api/webhookEndpoint.ts` | Webhook para WhatsApp inbound | Usa channelAdapters (read-only) |
| `phase2/api/adminEndpoint.ts` | API admin (reservas, config) | Compone engines de M1 (read-only) |

### Barrel export de Phase 2

```
phase2/index.ts  ← re-exporta solo código de Phase 2
                    NO modifica src/restaurant-agent/index.ts (congelado)
```

### Tests de Phase 2

```
__tests__/phase2/
├── paymentEngine.test.ts
├── notificationEngine.test.ts
├── evolutionAdapter.test.ts
├── posHttpAdapter.test.ts
├── supabaseAdapter.test.ts
├── authMiddleware.test.ts
├── rateLimiter.test.ts
├── chatEndpoint.test.ts
└── webhookEndpoint.test.ts
```

---

## 4. Dependencias shared prohibidas

### Regla fundamental

> Phase 2 puede **importar** de Freeze v1 (solo lectura).
> Phase 2 NO puede **exportar hacia** Freeze v1.
> La dependencia es **unidireccional**: Phase 2 → Freeze v1, nunca al revés.

```
PROHIBIDO:
  foundation/contracts.ts  ──import──>  phase2/anything.ts    ❌
  engines/cartEngine.ts    ──import──>  phase2/anything.ts    ❌
  audits/behaviorAudit.ts  ──import──>  phase2/anything.ts    ❌
  index.ts                 ──export──>  phase2/index.ts       ❌

PERMITIDO:
  phase2/engines/paymentEngine.ts  ──import──>  foundation/contracts.ts  ✅
  phase2/adapters/posHttp.ts       ──import──>  engines/posBridge.ts     ✅
  phase2/middleware/auth.ts        ──import──>  foundation/contracts.ts  ✅
```

### Imports prohibidos específicos

| Desde (Phase 2) | Hacia (Phase 2) | Prohibido porque |
|-----------------|-----------------|------------------|
| Cualquier engine de Phase 2 | Otro engine de Phase 2 de distinto dominio | Evitar acoplamiento cruzado prematuro |
| Cualquier adapter | Otro adapter | Cada adapter es independiente |
| Middleware | Engines de Phase 2 | Middleware es transversal, no depende de lógica de negocio |

### Dependencias npm

| Acción | Permitida | Restricción |
|--------|-----------|-------------|
| Agregar dependencias nuevas | SI | No deben conflictuar con zod v4.3.6 ni vitest v4.0.18 |
| Actualizar dependencias existentes | NO | zod, vitest, typescript quedan en versión actual |
| Eliminar dependencias existentes | NO | Rompe Freeze v1 |

---

## 5. Protocolo si algo nuevo necesita impactar un lock existente

### Escenario: Phase 2 necesita un tipo nuevo en contracts.ts

**NO se modifica contracts.ts.** En su lugar:

```typescript
// phase2/foundation/contractsExtension.ts
import { z } from "zod";
import { CartSchema, ProductSchema } from "../../foundation/contracts";

// Extender sin tocar el original
export const PaymentSchema = z.object({
  paymentId: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.number().nonnegative(),
  method: z.enum(["card", "cash", "bizum"]),
  status: z.enum(["pending", "completed", "failed"]),
});

export type Payment = z.infer<typeof PaymentSchema>;
```

### Escenario: Phase 2 necesita agregar un estado nuevo a la FSM

**NO se modifica stateMachine.ts.** En su lugar:

```typescript
// phase2/engines/extendedStateMachine.ts
import { RestaurantStateMachine } from "../../engines/stateMachine";

// Wrapper que agrega estados de Phase 2 sin tocar el original
export class ExtendedStateMachine {
  private readonly base = new RestaurantStateMachine();
  // ...estados adicionales de Phase 2
}
```

### Escenario: Phase 2 necesita un nuevo export en index.ts

**NO se modifica index.ts.** En su lugar, consumidores importan de dos puntos:

```typescript
import { CartEngine, Product } from "src/restaurant-agent";           // Freeze v1
import { PaymentEngine } from "src/restaurant-agent/phase2";          // Phase 2
```

### Escenario: Realmente es IMPOSIBLE sin modificar un lock

Si tras evaluar todas las alternativas (extension, wrapper, composition, adapter) se determina que es **técnicamente imposible** avanzar sin modificar un archivo congelado:

#### Proceso de Descongelado Controlado

| Paso | Acción | Responsable |
|------|--------|-------------|
| 1 | Documentar: qué archivo, qué cambio exacto, por qué no hay alternativa | Solicitante |
| 2 | Autorización explícita del owner | Owner |
| 3 | Crear branch `unfreeze/v1-{motivo}` | Desarrollador |
| 4 | Aplicar el cambio mínimo necesario (no refactors oportunistas) | Desarrollador |
| 5 | Ejecutar `tsc --noEmit` — 0 errors | Automatizado |
| 6 | Ejecutar `vitest run` — 84/84 pass (mínimo) | Automatizado |
| 7 | Ejecutar `runThreeAudits()` — 3/3 PASS | Automatizado |
| 8 | Regenerar SHA-256 de archivos modificados | Automatizado |
| 9 | Regenerar master hash del lock afectado | Automatizado |
| 10 | Generar FREEZE_V2.md con nuevos hashes y changelog | Desarrollador |
| 11 | Review + merge | Owner |

#### Restricciones del descongelado

- Solo se modifica el archivo estrictamente necesario
- No se aprovecha para "limpiar", "mejorar", o "refactorear" nada más
- El cambio debe ser backward-compatible (no romper consumidores existentes)
- Si el cambio rompe backward-compatibility, se documenta la migración
- El FREEZE_V1.md original se preserva como histórico (no se borra)

---

## Resumen Visual

```
┌─────────────────────────────────────────────────────────────┐
│                    FREEZE v1 (INTOCABLE)                     │
│  ┌─────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  LOCK_M0    │  │    LOCK_M1      │  │   LOCK_M2      │  │
│  │ Foundation  │  │  Core Engines   │  │ Docs & Audits  │  │
│  │  2 files    │  │   13 files      │  │   13 files     │  │
│  └──────┬──────┘  └────────┬────────┘  └───────┬────────┘  │
│         │                  │                    │            │
│         │    SOLO LECTURA  │   SOLO LECTURA     │            │
└─────────┼──────────────────┼────────────────────┼────────────┘
          │                  │                    │
          ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 2 (ZONA LIBRE)                      │
│                                                              │
│  phase2/engines/     ← engines nuevos                        │
│  phase2/adapters/    ← conectores externos                   │
│  phase2/api/         ← endpoints HTTP                        │
│  phase2/middleware/  ← auth, rate limit, logging             │
│  phase2/foundation/  ← extensiones de contratos              │
│  phase2/index.ts     ← barrel export Phase 2                 │
│  __tests__/phase2/   ← tests Phase 2                         │
│                                                              │
│  Dependencia UNIDIRECCIONAL: Phase 2 importa de Freeze v1   │
│  Freeze v1 NUNCA importa de Phase 2                          │
└─────────────────────────────────────────────────────────────┘
```
