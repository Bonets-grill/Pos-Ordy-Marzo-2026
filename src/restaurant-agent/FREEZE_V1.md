# FREEZE_V1.md — Restaurant Agent Immutable Zone v1

> Fecha de congelado: 2026-03-08
> Tipo: FREEZE FORMAL — Solo lectura. No se permiten cambios sin proceso de descongelado.
> Verificación: `tsc --noEmit` 0 errors | `vitest run` 84/84 pass | 3 auditorías PASS

---

## 1. Separación Oficial de Módulos Congelados

```
ZONA INMUTABLE v1
├── LOCK_M0_FOUNDATION        ← Contratos Zod + Manifiesto de módulos
├── LOCK_M1_CORE_ENGINES      ← 11 engines + lock system + barrel export
└── LOCK_M2_DOCS_AND_AUDITS   ← 4 auditorías + 8 documentos
```

Política: **Ningún archivo dentro de estos 3 locks puede ser modificado, renombrado, o eliminado sin:**
1. Autorización explícita del owner
2. Re-ejecución de las 3 auditorías
3. Regeneración de todos los hashes afectados
4. Nuevo FREEZE con versión incrementada

---

## 2. LOCK_M0_FOUNDATION

**Propósito**: Fuente de verdad absoluta. Todos los tipos, schemas y contratos del sistema.

**Archivos congelados (2):**

| Archivo | SHA-256 |
|---------|---------|
| `foundation/contracts.ts` | `dc1b0de1c8712aaac56e5836cefde1d3b2d0f6361dcf531d870434d592101cb5` |
| `foundation/moduleManifest.ts` | `96ee05dc47e487adb92651586cc08cb19af1cd34e0fe2d6c34aab93c0a0ab3a7` |

**Master Hash M0:**
```
cf217334564f17d9c7600f80036c935c11ac058d02a0a83ac64751372a659509
```

**Contratos cubiertos:**
- `TenantScopeSchema` — aislamiento por tenant + canal
- `CurrencySchema` — EUR, USD, MXN, COP
- `OperationalModeSchema` — dine_in, takeaway, delivery
- `ProductSchema` — producto con precio, allergens, modifiers requeridos/opcionales
- `ModifierOptionSchema` — opción de modifier con priceDelta
- `MenuCatalogSchema` — catálogo completo con source, confidence, versión
- `CartItemSchema` — línea de carrito con unitPrice, modifiers, lineTotal
- `CartSchema` — carrito con subtotal, fees, taxes, total, frozen
- `ReservationSchema` — reserva con fecha, hora, personas, estado
- `SessionStateSchema` — 17 estados de la FSM
- `IdempotencySchema` — clave de idempotencia con operación
- `AuditEventSchema` — evento de auditoría tipado

**Behaviors cubiertos:**
- Validación de input en el borde (parse-or-throw)
- Defaults automáticos (available=true, allergens=[], frozen=false)
- Enums estrictos (canales, currencies, modos, estados, operaciones, event types)
- Regex para formato de hora (HH:MM)
- String date para formato de fecha (YYYY-MM-DD)
- Mínimos de longitud en IDs y claves

**Blast radius si se modifica M0:**
```
IMPACTO TOTAL — Afecta TODO el sistema:
├── engines/cartEngine.ts          (importa Cart, CartSchema, Product, ModifierOption)
├── engines/catalogEngine.ts       (importa MenuCatalog, MenuCatalogSchema, Product)
├── engines/businessRulesEngine.ts (importa OperationalModeSchema)
├── engines/orderOrchestrator.ts   (importa indirectamente via cartEngine + businessRules)
├── engines/reservationEngine.ts   (importa Reservation, ReservationSchema)
├── engines/sessionMemoryEngine.ts (importa SessionState)
├── engines/stateMachine.ts        (importa SessionState)
├── engines/intentEntityEngine.ts  (importa via catalogEngine)
├── audits/contractAudit.ts        (importa 6 schemas directamente)
├── audits/behaviorAudit.ts        (importa MenuCatalog + todos los engines)
├── __tests__/contracts.test.ts    (12 tests)
├── __tests__/cartEngine.test.ts   (9 tests)
├── __tests__/catalogEngine.test.ts (8 tests)
├── __tests__/orderOrchestrator.test.ts (7 tests)
├── __tests__/reservation.test.ts  (5 tests)
├── __tests__/audits.test.ts       (4 tests)
└── 84/84 tests potencialmente afectados
```

---

## 3. LOCK_M1_CORE_ENGINES

**Propósito**: Toda la lógica de negocio determinística. Motores, integridad, y punto de entrada.

**Archivos congelados (13):**

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
| `locks/moduleLock.ts` | `8a6dd144db6bdd708d93b89e630bc7899e3dbb95f1f48bacc827de7467c992f3` |
| `index.ts` | `aa8d3c51aa4c53b22f5e086f5ee1114c4d3752aec05c06692ecf1ecfea58e78e` |

**Master Hash M1:**
```
b6c6f5620a6df5bdebe0c6e663a92d9f85285d6a992d65b1d31b67264eaaecd8
```

**Contratos cubiertos:**
- `BusinessRulesConfig` — tipo de configuración de reglas (horarios, zonas, mínimos)
- `OperationalMode` — tipo derivado de OperationalModeSchema
- `Cart` / `Product` / `ModifierOption` — tipos usados en CartEngine
- `MenuCatalog` — tipo usado en CatalogEngine
- `Reservation` — tipo usado en ReservationEngine
- `SessionState` — tipo usado en StateMachine y SessionMemory
- `NormalizedInboundMessage` — tipo propio de channelAdapters
- `EscalationTicket` — tipo propio de humanEscalationEngine
- `DetectedIntent` / `ExtractionResult` — tipos propios de intentEntityEngine
- `OrderDraft` / `CreatedOrder` — tipos propios de orderOrchestrator
- `ModuleLock` — tipo del sistema de locks

**Behaviors cubiertos:**

| Engine | Behaviors |
|--------|-----------|
| **BusinessRulesEngine** | isOpen (horarios+festivos), validateMode, validateDeliveryZone, validateMinimum |
| **CartEngine** | addItem (con modifiers requeridos), removeItem, freezeCartBeforeCheckout, recalculate (tax+fee), inmutabilidad (structuredClone) |
| **CatalogEngine** | getProduct, searchByName (case-insensitive), validateProduct (existencia+disponibilidad) |
| **ChannelAdapters** | normalizeWebInput, normalizeWhatsAppInput |
| **HumanEscalationEngine** | createTicket (con validación de contexto) |
| **IntentEntityEngine** | detect 7 intents (greeting, show_menu, ask_hours, reservation_new, human_help, add_item/start_order, unknown) |
| **OrderOrchestrator** | confirmAndCreateOrder con idempotencia, validación de modo, carrito no vacío, mínimo, dirección+zona para delivery, freeze post-confirm |
| **POSBridge** | dispatch con signature SHA-256, detección de duplicados por idempotency_key |
| **ReservationEngine** | createReservation (Zod-validated), searchReservation, cancelReservation |
| **SessionMemoryEngine** | createSession, restoreSession (con tenant isolation) |
| **StateMachine** | 17 estados, 15 transiciones, guards condicionales, wildcards (*, escalación, recovery, closed hours) |
| **ModuleLock** | buildModuleLock: SHA-256 por archivo + master hash compuesto |

**Blast radius si se modifica M1:**

| Si modificas... | Impacta en... |
|-----------------|---------------|
| `cartEngine.ts` | orderOrchestrator, behaviorAudit, 9 tests cart + 7 tests order + 4 tests audit |
| `catalogEngine.ts` | intentEntityEngine, behaviorAudit, 8 tests catalog + 10 tests intent + 4 tests audit |
| `businessRulesEngine.ts` | orderOrchestrator, behaviorAudit, 10 tests rules + 7 tests order + 4 tests audit |
| `stateMachine.ts` | behaviorAudit, 8 tests FSM + 4 tests audit |
| `orderOrchestrator.ts` | behaviorAudit, 7 tests order + 4 tests audit |
| `intentEntityEngine.ts` | 10 tests intent (aislado de auditorías) |
| `reservationEngine.ts` | 5 tests reservation (aislado) |
| `sessionMemoryEngine.ts` | 4 tests session (aislado) |
| `posBridge.ts` | 3 tests POS (aislado) |
| `channelAdapters.ts` | 2 tests channel (aislado) |
| `humanEscalationEngine.ts` | 2 tests escalation (aislado) |
| `moduleLock.ts` | integrityAudit, 4 tests audit |
| `index.ts` | Consumidores externos (barrel re-export) |

---

## 4. LOCK_M2_DOCS_AND_AUDITS

**Propósito**: Auditorías de verificación y documentación de referencia. Garantizan que M0 y M1 no se rompan.

**Archivos congelados (13):**

| Archivo | SHA-256 |
|---------|---------|
| `audits/contractAudit.ts` | `53549dd47e52b35f3d2d9b4655201495e97eaab932de4a79a23627faa69d4aef` |
| `audits/behaviorAudit.ts` | `86a0ba0dcd16cdac9b398c3fdb4f4eea3c35cf5f86a7b5ee27be78afa6de1f76` |
| `audits/integrityAudit.ts` | `7fca94f319c9fb8dc7a713329a771ee8654a3e0c3dc5853a3b919583d4e378ce` |
| `audits/runAudits.ts` | `49aea57025af3f56c6f534c0afafd500d2819b7ceeb07d78fbfe7e66873db894` |
| `README.md` | `52b85af2f719ba257c38611bb87bf180cffd92fc2c48816bd3d34c7312c78ed5` |
| `CODEMAP.md` | `39249306f27b3fc695dee622c90f3aa1707feb5404a42105fbc9b55331bf7e1f` |
| `ARCHITECTURE.md` | `5ba6cc9c2a97e70fd4817495238965574cbbce7995bddd45b854adfcfae2281f` |
| `STATE_MACHINE.md` | `4d0bc7df349cc6d1fed2ace20618bc009fa79de9f2893146c6f1c01989b33d66` |
| `REGRESSION_MATRIX.md` | `6e51816de0b07299575f55765ad5e8027f6e62f78a2d51711f23fd59eb33f208` |
| `AUDIT_REPORT_1.md` | `19fb58ea0993c7412f5186326585c2a95e8d7e20806c5024230a4cb90c6e4a19` |
| `AUDIT_REPORT_2.md` | `847ca3dd79f7edc1e35cfc577888d18840b950322560fa85868fd9aa050d5195` |
| `AUDIT_REPORT_3.md` | `f7b2189f345915610eed9c19fbb03162d5789d73333f98f035bceebf3c3d0e2c` |
| `LOCK_REPORT.md` | `c1ba934418bd187f6b21e3d5f0b01182c0943a13dfc3ec64c1fb41454c459f0b` |

**Master Hash M2:**
```
daf7dba81ebd74aa197ea29b66ba430ab531b52eb0bbbac6dab382eeb65ed147
```

**Contratos cubiertos:**
- contractAudit: valida TenantScopeSchema, MenuCatalogSchema, CartSchema, ReservationSchema, IdempotencySchema, AuditEventSchema
- behaviorAudit: valida CatalogEngine + CartEngine + BusinessRulesEngine + OrderOrchestrator + RestaurantStateMachine integrados
- integrityAudit: valida buildModuleLock con contracts.ts

**Behaviors cubiertos:**
- Contract Audit: 6 schemas parseados con datos representativos
- Behavior Audit: flujo end-to-end (catálogo→carrito→reglas→orden→FSM)
- Integrity Audit: generación de lock hash, verificación de estructura
- runThreeAudits: ejecución orquestada + assertAuditsPass

**Blast radius si se modifica M2:**
```
IMPACTO BAJO — Solo afecta verificación, no lógica:
├── audits.test.ts (4 tests)
└── No afecta M0 ni M1
NOTA: Si las auditorías se modifican incorrectamente, podrían dar
falsos positivos y ocultar roturas en M0/M1.
```

---

## 5. Resumen de Hashes Maestros

| Lock | Archivos | Master Hash |
|------|----------|-------------|
| **LOCK_M0_FOUNDATION** | 2 | `cf217334564f17d9c7600f80036c935c11ac058d02a0a83ac64751372a659509` |
| **LOCK_M1_CORE_ENGINES** | 13 | `b6c6f5620a6df5bdebe0c6e663a92d9f85285d6a992d65b1d31b67264eaaecd8` |
| **LOCK_M2_DOCS_AND_AUDITS** | 13 | `daf7dba81ebd74aa197ea29b66ba430ab531b52eb0bbbac6dab382eeb65ed147` |
| **TOTAL** | **28 archivos** | — |

---

## 6. Verificación de Integridad

```bash
# Verificar cualquier archivo individual
shasum -a 256 src/restaurant-agent/foundation/contracts.ts
# Esperado: dc1b0de1c8712aaac56e5836cefde1d3b2d0f6361dcf531d870434d592101cb5

# Verificar que los tests siguen pasando
npx vitest run
# Esperado: 13 suites, 84/84 pass

# Verificar tipos
npx tsc --noEmit
# Esperado: 0 errors
```

---

## 7. Lo que TODAVÍA NO queda cubierto por estos locks

### Archivos NO congelados (fuera de los 3 locks)

| Categoría | Archivos | Razón |
|-----------|----------|-------|
| **Tests** | `__tests__/*.test.ts` (13 archivos) | Los tests son la red de seguridad, no el código protegido. Pueden evolucionar para mejorar cobertura sin romper contratos. |

### Funcionalidades NO implementadas

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| **Pagos / Payment Engine** | No existe | No hay engine de pagos post-confirmación |
| **Persistencia real (DB)** | No existe | Todo es in-memory (Map, Set). Sin Supabase/Postgres |
| **API HTTP / Edge Functions** | No existe | No hay endpoints. Solo clases TypeScript |
| **Integración WhatsApp real** | No existe | channelAdapters normaliza pero no conecta a Evolution API |
| **Integración POS real** | No existe | POSBridge genera signature pero no envía HTTP |
| **Notificaciones** | No existe | No hay push, email, o SMS |
| **Multi-idioma en intents** | No existe | IntentEntityEngine solo detecta español |
| **Modificación de reservas** | No existe | Solo create + cancel, no modify |
| **Estado RESERVATION_MODIFY_FLOW** | Definido pero sin transición | Estado en SessionStateSchema, sin entrada en FSM transitions |
| **Estado RESERVATION_CANCEL_FLOW** | Definido pero sin transición | Estado en SessionStateSchema, sin entrada en FSM transitions |
| **Promociones / Descuentos** | No existe | CartEngine.recalculate acepta fee/tax pero no descuentos |
| **Rate limiting** | No existe | Sin protección contra abuso |
| **Logging / Observability** | No existe | AuditEventSchema definido pero sin engine que lo emita |
| **Autenticación** | No existe | TenantScopeSchema define scope pero sin auth middleware |
| **Backoff / Retry** | No existe | Sin manejo de fallos transitorios |
| **Cola de mensajes** | No existe | Procesamiento síncrono, sin queue |

### Cobertura de Tests incompleta (gaps)

| Módulo | % Lines | Líneas sin cubrir | Qué falta |
|--------|---------|-------------------|-----------|
| `stateMachine.ts` | 80.76% | L17,36-42,54-58 | Guards de ITEM_CLARIFICATION, DELIVERY/TAKEAWAY/DINE_IN desde CHECKOUT, CLOSED_HOURS |
| `intentEntityEngine.ts` | 85.71% | L48,56-58 | Rama add_item con 1 match exacto, rama con múltiples candidatos |
| `audits/integrityAudit.ts` | 66.66% | L14,23 | Rama de error (lock incompleto) |
| `audits/runAudits.ts` | 75% | L18 | assertAuditsPass con auditorías fallidas |
| `audits/behaviorAudit.ts` | 88.23% | L78,83 | Rama de error del catch |
| `audits/contractAudit.ts` | 88.88% | L68 | Rama de error del catch |

---

## Protocolo de Descongelado

Si en el futuro se necesita modificar cualquier archivo congelado:

1. **Solicitud**: documentar qué archivo, qué cambio, y por qué
2. **Aprobación**: autorización explícita del owner
3. **Modificación**: aplicar el cambio
4. **Re-auditoría**: ejecutar `runThreeAudits()` — las 3 deben pasar
5. **Re-hash**: regenerar SHA-256 de todos los archivos afectados + master hash del lock
6. **Re-test**: `vitest run` — 84/84 deben pasar (o más si se agregan tests)
7. **Re-typecheck**: `tsc --noEmit` — 0 errors
8. **Nuevo FREEZE**: generar FREEZE_V2.md con nueva fecha y nuevos hashes

---

> **Este documento es el certificado formal de congelado.**
> Cualquier discrepancia entre los hashes aquí registrados y los hashes reales de los archivos indica una modificación no autorizada.
