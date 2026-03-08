# ARCHITECTURE.md — Restaurant Agent Immutable Architecture v1

> Fecha: 2026-03-08 | Versión: 1.0

## Visión General

Sistema de agente de restaurante **determinístico e inmutable** diseñado como módulo plug-and-play. Maneja pedidos, reservas, catálogo, y comunicación multicanal (Web + WhatsApp) con validación estricta en cada capa.

## Principios de Diseño

1. **Determinismo**: Toda operación produce el mismo resultado dado el mismo input. No hay efectos secundarios ocultos.
2. **Inmutabilidad**: Los contratos (schemas) son la fuente de verdad. Cambiarlos requiere refresh de locks.
3. **Idempotencia**: Operaciones críticas (crear pedido, despacho a POS) usan claves de idempotencia.
4. **Aislamiento por Tenant**: Cada sesión está scoped por `tenantId`. No hay leak de datos entre tenants.
5. **Fail-fast**: Validación Zod en el borde. Si un dato no cumple el contrato, falla inmediatamente.

## Capas

```
┌─────────────────────────────────────────────────────────┐
│  Capa 3 — AUDITORÍAS                                    │
│  contractAudit · behaviorAudit · integrityAudit         │
│  Pre-entrega: validan schemas, flujos, y hashes         │
├─────────────────────────────────────────────────────────┤
│  Capa 2 — LOCKS DE INTEGRIDAD                           │
│  moduleLock.ts — SHA-256 por archivo + master hash      │
│  Detecta modificaciones no autorizadas                  │
├─────────────────────────────────────────────────────────┤
│  Capa 1 — MOTORES DETERMINÍSTICOS                       │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │ Catalog  │ Cart     │ Business │ State    │          │
│  │ Engine   │ Engine   │ Rules    │ Machine  │          │
│  ├──────────┼──────────┼──────────┼──────────┤          │
│  │ Intent   │ Order    │ Reserv.  │ Session  │          │
│  │ Entity   │ Orchest. │ Engine   │ Memory   │          │
│  ├──────────┼──────────┼──────────┼──────────┤          │
│  │ POS      │ Channel  │ Human    │          │          │
│  │ Bridge   │ Adapters │ Escalat. │          │          │
│  └──────────┴──────────┴──────────┴──────────┘          │
├─────────────────────────────────────────────────────────┤
│  Capa 0 — FOUNDATION (contratos Zod inmutables)         │
│  TenantScope · Product · Cart · Reservation · Session   │
│  MenuCatalog · Idempotency · AuditEvent                 │
└─────────────────────────────────────────────────────────┘
```

## Flujos Principales

### Flujo de Pedido (Order Flow)

```
Cliente envía mensaje
     │
     ▼
Channel Adapter (normaliza Web/WhatsApp)
     │
     ▼
Intent Entity Engine (detecta intent + entidades)
     │
     ├─ greeting ──────> respuesta saludo
     ├─ show_menu ─────> CatalogEngine.searchByName()
     ├─ add_item ──────> CartEngine.addItem()
     ├─ ask_hours ─────> BusinessRulesEngine.isOpen()
     └─ start_order ───> State Machine → ORDER_BUILDING
     │
     ▼
State Machine (valida transiciones con guards)
     │
     ▼
Cart Review → Checkout Mode Select
     │
     ├─ dine_in ───> OrderOrchestrator.confirmAndCreateOrder()
     ├─ takeaway ──> OrderOrchestrator.confirmAndCreateOrder()
     └─ delivery ──> validar zona + dirección → confirm
     │
     ▼
POSBridge.dispatch() (firma SHA-256, idempotencia)
```

### Flujo de Reserva

```
Cliente: "Quiero reservar"
     │
     ▼
Intent: reservation_new → State: RESERVATION_FLOW
     │
     ▼
ReservationEngine.createReservation() (validación Zod)
     │
     ▼
State: RESERVATION_CONFIRMATION → IDLE
```

### Flujo de Escalación Humana

```
Cualquier estado (wildcard *) → HUMAN_ESCALATION
     │
     ▼
HumanEscalationEngine.createTicket()
     │
     ▼
Dispatch a email o dashboard
```

## Seguridad

| Control                    | Implementación                                          |
|---------------------------|--------------------------------------------------------|
| Tenant isolation          | `TenantScopeSchema` en cada sesión                      |
| Input validation          | Zod parse en borde de cada engine                       |
| Idempotencia              | Set<string> en OrderOrchestrator y POSBridge             |
| Cart immutability         | `freezeCartBeforeCheckout()` bloquea add/remove          |
| Hash integrity            | SHA-256 por archivo + master hash                        |
| Delivery zone validation  | Whitelist de zonas en BusinessRulesConfig                |
| Minimum order enforcement | Por modo operativo (delivery, takeaway, dine_in)         |

## Extensibilidad

| Módulo futuro              | Punto de extensión                                     |
|---------------------------|-------------------------------------------------------|
| Pagos                     | Nuevo engine post-OrderOrchestrator                     |
| Analytics                 | AuditEventSchema ya soporta eventos tipados             |
| Multi-idioma              | IntentEntityEngine — agregar regex por idioma            |
| Nuevos canales (Telegram) | Nuevo adapter en channelAdapters.ts                     |
| Promociones/descuentos    | CartEngine.recalculate() acepta fees y tax rates         |
| Kitchen Display System    | POSBridge — nuevo dispatch target                       |
