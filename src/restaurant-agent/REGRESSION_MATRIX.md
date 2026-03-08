# REGRESSION_MATRIX.md — Test → Comportamiento

> 13 suites | 84 tests | Vitest v4.0.18 | Cobertura total: 92.67% stmts

## Suite 1: contracts.test.ts (12 tests)

| # | Test | Comportamiento validado | Módulo |
|---|------|------------------------|--------|
| 1 | TenantScopeSchema acepta datos válidos | Tenant scope con tenantId, agentId, channel | contracts.ts |
| 2 | TenantScopeSchema rechaza canal inválido | Canales fuera de enum (sms) rechazan | contracts.ts |
| 3 | ProductSchema acepta producto con defaults | Defaults: available=true, allergens=[], modifiers=[] | contracts.ts |
| 4 | ProductSchema rechaza precio negativo | Validación nonnegative en price | contracts.ts |
| 5 | MenuCatalogSchema acepta catálogo completo | Catálogo con products, categories, confidence | contracts.ts |
| 6 | CartSchema acepta carrito vacío | Carrito inicial: frozen=false, items=[] | contracts.ts |
| 7 | ReservationSchema acepta reserva válida | Reserva con date, time regex, peopleCount | contracts.ts |
| 8 | ReservationSchema rechaza hora inválida | Regex ^([01]\d|2[0-3]):([0-5]\d)$ | contracts.ts |
| 9 | IdempotencySchema acepta key >= 8 chars | Key mínimo 8 caracteres + operation enum | contracts.ts |
| 10 | AuditEventSchema acepta evento válido | Evento con eventType enum + payload record | contracts.ts |
| 11 | SessionStateSchema acepta estados válidos | 17 estados válidos, rechaza inválidos | contracts.ts |
| 12 | OperationalModeSchema acepta modos válidos | delivery, takeaway, dine_in; rechaza otros | contracts.ts |

## Suite 2: cartEngine.test.ts (9 tests)

| # | Test | Comportamiento validado | Módulo |
|---|------|------------------------|--------|
| 1 | inicia con carrito vacío | Constructor: items=[], total=0, frozen=false | cartEngine.ts |
| 2 | agrega item y calcula total | addItem: qty*price = lineTotal, recalculate subtotal | cartEngine.ts |
| 3 | agrega item con modifiers y calcula precio | priceDelta se suma al unitPrice | cartEngine.ts |
| 4 | rechaza item sin modifiers requeridos | Validación requiredModifiers por groupId | cartEngine.ts |
| 5 | rechaza cantidad 0 | Guard: quantity < 1 throws | cartEngine.ts |
| 6 | elimina item del carrito | removeItem por lineId, recalcula total | cartEngine.ts |
| 7 | congela carrito y bloquea modificaciones | freezeCartBeforeCheckout bloquea add/remove | cartEngine.ts |
| 8 | recalcula con tax y fee | recalculate(taxRate, fee) aplica impuestos | cartEngine.ts |
| 9 | retorna copia inmutable | structuredClone: referencias distintas | cartEngine.ts |

## Suite 3: businessRules.test.ts (10 tests)

| # | Test | Comportamiento validado | Módulo |
|---|------|------------------------|--------|
| 1 | detecta abierto en horario válido | isOpen: lunes 12:00 UTC dentro de 09:00-22:00 | businessRulesEngine.ts |
| 2 | detecta cerrado en domingo | openHours[0] = null → cerrado | businessRulesEngine.ts |
| 3 | detecta cerrado en fecha festiva | closedDates Set contiene la fecha | businessRulesEngine.ts |
| 4 | valida modo delivery habilitado | validateMode: deliveryEnabled=true | businessRulesEngine.ts |
| 5 | rechaza modo deshabilitado | validateMode: deliveryEnabled=false → error | businessRulesEngine.ts |
| 6 | valida zona dentro de cobertura | validateDeliveryZone: zona en whitelist | businessRulesEngine.ts |
| 7 | rechaza zona fuera de cobertura | validateDeliveryZone: zona no en whitelist | businessRulesEngine.ts |
| 8 | valida pedido mínimo cumplido | validateMinimum: total >= minimum | businessRulesEngine.ts |
| 9 | rechaza pedido bajo mínimo | validateMinimum: total < minimum → error | businessRulesEngine.ts |
| 10 | modo sin mínimo acepta cualquier total | minimumOrderByMode sin entry → default 0 | businessRulesEngine.ts |

## Suite 4: stateMachine.test.ts (8 tests)

| # | Test | Comportamiento validado | Módulo |
|---|------|------------------------|--------|
| 1 | inicia en IDLE | Constructor: state = "IDLE" | stateMachine.ts |
| 2 | IDLE → DISCOVERY → MENU_BROWSING | Transiciones secuenciales válidas | stateMachine.ts |
| 3 | flujo completo pedido | IDLE→DISCOVERY→MENU→ORDER→CART_REVIEW | stateMachine.ts |
| 4 | rechaza transición inválida | IDLE → CART_REVIEW throws | stateMachine.ts |
| 5 | guard bloquea sin items | CART_REVIEW con cartItems=0 → guard blocks | stateMachine.ts |
| 6 | escalación desde cualquier estado | Wildcard * → HUMAN_ESCALATION | stateMachine.ts |
| 7 | flujo reserva completo | IDLE→RESERVATION→CONFIRMATION→IDLE | stateMachine.ts |
| 8 | checkout delivery | CART_REVIEW→MODE_SELECT→DELIVERY_FLOW | stateMachine.ts |

## Suite 5: orderOrchestrator.test.ts (7 tests)

| # | Test | Comportamiento validado | Módulo |
|---|------|------------------------|--------|
| 1 | crea orden delivery válida | Flujo completo: cart+rules+confirm | orderOrchestrator.ts |
| 2 | bloquea confirmación duplicada | Idempotencia: misma key rechazada | orderOrchestrator.ts |
| 3 | rechaza carrito vacío | Guard: items.length === 0 | orderOrchestrator.ts |
| 4 | rechaza delivery bajo mínimo | validateMinimum: 10 < 15 | orderOrchestrator.ts |
| 5 | rechaza delivery sin dirección | Guard: !address || !deliveryZone | orderOrchestrator.ts |
| 6 | rechaza zona fuera de cobertura | validateDeliveryZone: SUR not in whitelist | orderOrchestrator.ts |
| 7 | crea orden dine_in sin mínimo | Sin minimumOrderByMode para dine_in | orderOrchestrator.ts |

## Suite 6: catalogEngine.test.ts (8 tests)

| # | Test | Comportamiento validado | Módulo |
|---|------|------------------------|--------|
| 1 | retorna versión del catálogo | getCatalogVersion() | catalogEngine.ts |
| 2 | busca producto por ID | getProduct(id) retorna Product | catalogEngine.ts |
| 3 | retorna null para inexistente | getProduct("fake") === null | catalogEngine.ts |
| 4 | busca por nombre parcial | searchByName("hamburguesa") → 2 results | catalogEngine.ts |
| 5 | búsqueda case-insensitive | searchByName("COCA") → match | catalogEngine.ts |
| 6 | valida producto disponible | validateProduct: available=true → ok | catalogEngine.ts |
| 7 | rechaza producto inexistente | validateProduct: not found → error | catalogEngine.ts |
| 8 | rechaza producto no disponible | validateProduct: available=false → error | catalogEngine.ts |

## Suite 7: intentEntity.test.ts (10 tests)

| # | Test | Comportamiento validado | Módulo |
|---|------|------------------------|--------|
| 1 | detecta saludo | /hola\|buenas/ → greeting | intentEntityEngine.ts |
| 2 | detecta pedido de menú | /menú\|menu\|carta/ → show_menu | intentEntityEngine.ts |
| 3 | detecta pregunta de horarios | /horario\|abren/ → ask_hours | intentEntityEngine.ts |
| 4 | detecta intención de reserva | /reserva\|reservar/ → reservation_new | intentEntityEngine.ts |
| 5 | detecta escalación humana | /humano\|agente/ → human_help | intentEntityEngine.ts |
| 6 | start_order texto largo no matchea | searchByName con texto completo → 0 results | intentEntityEngine.ts |
| 7 | start_order búsqueda parcial | searchByName genérico → 0 results | intentEntityEngine.ts |
| 8 | start_order texto con trigger | /agrega/ trigger sin match producto | intentEntityEngine.ts |
| 9 | start_order genérico | /agrega/ + sin match → clarification | intentEntityEngine.ts |
| 10 | unknown para texto no reconocido | Sin regex match → unknown | intentEntityEngine.ts |

## Suite 8: reservation.test.ts (5 tests)

| # | Test | Comportamiento validado | Módulo |
|---|------|------------------------|--------|
| 1 | crea reserva válida | createReservation: status=booked | reservationEngine.ts |
| 2 | busca reserva existente | searchReservation por ID | reservationEngine.ts |
| 3 | retorna null para inexistente | searchReservation("fake") === null | reservationEngine.ts |
| 4 | cancela reserva existente | cancelReservation: status=cancelled | reservationEngine.ts |
| 5 | error al cancelar inexistente | cancelReservation("fake") throws | reservationEngine.ts |

## Suite 9: posBridge.test.ts (3 tests)

| # | Test | Comportamiento validado | Módulo |
|---|------|------------------------|--------|
| 1 | despacha payload con signature | dispatch: SHA-256 signature 16 chars | posBridge.ts |
| 2 | detecta duplicado | idempotency_key repetida → duplicate=true | posBridge.ts |
| 3 | rechaza payload sin items | items.length === 0 throws | posBridge.ts |

## Suite 10: channelAdapters.test.ts (2 tests)

| # | Test | Comportamiento validado | Módulo |
|---|------|------------------------|--------|
| 1 | normaliza input web | channel=web, sessionKey, text | channelAdapters.ts |
| 2 | normaliza input WhatsApp | channel=whatsapp, from→sessionKey | channelAdapters.ts |

## Suite 11: humanEscalation.test.ts (2 tests)

| # | Test | Comportamiento validado | Módulo |
|---|------|------------------------|--------|
| 1 | crea ticket válido | ticketId=TICKET-{timestamp} | humanEscalationEngine.ts |
| 2 | rechaza ticket sin razón | reason="" → throws | humanEscalationEngine.ts |

## Suite 12: sessionMemory.test.ts (4 tests)

| # | Test | Comportamiento validado | Módulo |
|---|------|------------------------|--------|
| 1 | crea sesión nueva | state=IDLE, tenantId scoped | sessionMemoryEngine.ts |
| 2 | restaura sesión existente | restoreSession por ID + tenantId | sessionMemoryEngine.ts |
| 3 | error al restaurar de otro tenant | Tenant isolation enforced | sessionMemoryEngine.ts |
| 4 | error al restaurar inexistente | Session not found throws | sessionMemoryEngine.ts |

## Suite 13: audits.test.ts (4 tests)

| # | Test | Comportamiento validado | Módulo |
|---|------|------------------------|--------|
| 1 | Contract Audit pasa | Todos los schemas validan | contractAudit.ts |
| 2 | Behavior Audit pasa | Flujo cart→order→stateMachine funciona | behaviorAudit.ts |
| 3 | Integrity Audit pasa | Master hash generado correctamente | integrityAudit.ts |
| 4 | Las 3 auditorías pasan juntas | runThreeAudits + assertAuditsPass | runAudits.ts |

## Cobertura por Módulo

| Módulo | % Stmts | % Branch | % Funcs | % Lines | Líneas sin cubrir |
|--------|---------|----------|---------|---------|-------------------|
| **foundation/contracts.ts** | 100 | 100 | 100 | 100 | — |
| **engines/cartEngine.ts** | 100 | 100 | 100 | 100 | — |
| **engines/catalogEngine.ts** | 100 | 100 | 100 | 100 | — |
| **engines/channelAdapters.ts** | 100 | 100 | 100 | 100 | — |
| **engines/humanEscalationEngine.ts** | 100 | 100 | 100 | 100 | — |
| **engines/posBridge.ts** | 100 | 100 | 100 | 100 | — |
| **engines/reservationEngine.ts** | 100 | 100 | 100 | 100 | — |
| **engines/sessionMemoryEngine.ts** | 100 | 100 | 100 | 100 | — |
| **locks/moduleLock.ts** | 100 | 100 | 100 | 100 | — |
| **engines/businessRulesEngine.ts** | 95.65 | 93.75 | 100 | 100 | L47 |
| **engines/orderOrchestrator.ts** | 95.65 | 93.75 | 100 | 100 | L38 |
| **audits/behaviorAudit.ts** | 88.23 | 25 | 100 | 88.23 | L78,83 |
| **audits/contractAudit.ts** | 88.88 | 0 | 100 | 88.88 | L68 |
| **engines/intentEntityEngine.ts** | 85.71 | 87.5 | 66.66 | 85.71 | L48,56-58 |
| **engines/stateMachine.ts** | 80.76 | 90 | 72.22 | 80.76 | L17,36-42,54-58 |
| **audits/integrityAudit.ts** | 66.66 | 50 | 100 | 66.66 | L14,23 |
| **audits/runAudits.ts** | 66.66 | 50 | 75 | 75 | L18 |
| **TOTAL** | **92.67** | **86.66** | **89.70** | **93.36** | — |
