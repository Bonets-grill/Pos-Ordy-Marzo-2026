# STATE_MACHINE.md — Restaurant Agent FSM

> 17 estados | 15 transiciones definidas | Guards activos

## Diagrama de Estados

```
                          ┌─────────────────────────────────────────────┐
                          │         WILDCARD TRANSITIONS (*)            │
                          │  Desde cualquier estado:                     │
                          │  * ──> HUMAN_ESCALATION (always)            │
                          │  * ──> ERROR_RECOVERY   (always)            │
                          │  * ──> CLOSED_HOURS     (operationAllowed   │
                          │                          === false)         │
                          └─────────────────────────────────────────────┘

  ┌──────┐     ┌───────────┐     ┌──────────────┐     ┌────────────────┐
  │ IDLE │────>│ DISCOVERY │────>│ MENU_BROWSING│────>│ ORDER_BUILDING │
  └──┬───┘     └───────────┘     └──────────────┘     └───────┬────────┘
     │                                                         │
     │                                               ┌─────────┼──────────┐
     │                                               │         │          │
     │                                      ambiguous│   cartItems > 0    │
     │                                               │         │          │
     │                                               ▼         ▼          │
     │                                    ┌──────────────┐ ┌───────────┐  │
     │                                    │    ITEM_     │ │  CART_    │  │
     │                                    │CLARIFICATION │ │  REVIEW  │  │
     │                                    └──────────────┘ └─────┬─────┘  │
     │                                                           │        │
     │                                                           ▼        │
     │                                                  ┌────────────────┐│
     │                                                  │CHECKOUT_MODE_  ││
     │                                                  │    SELECT      ││
     │                                                  └───┬───┬───┬────┘│
     │                                                      │   │   │     │
     │                                          delivery    │   │   │dine │
     │                                                      │   │   │ _in │
     │                                                      ▼   │   ▼     │
     │                                          ┌──────────┐│   │┌──────────────┐
     │                                          │DELIVERY_ ││   ││   ORDER_     │
     │                                          │  FLOW    ││   ││CONFIRMATION  │
     │                                          └──────────┘│   │└──────────────┘
     │                                                      │   │
     │                                              takeaway│   │
     │                                                      ▼   │
     │                                          ┌──────────────┐│
     │                                          │ TAKEAWAY_    ││
     │                                          │   FLOW       ││
     │                                          └──────────────┘│
     │                                                          │
     │     ┌──────────────────┐     ┌────────────────────────┐  │
     └────>│ RESERVATION_FLOW │────>│ RESERVATION_           │  │
           └──────────────────┘     │ CONFIRMATION           │──┘
             guard: always          └────────────────────────┘
                                      guard: hasReservationDraft
                                           │
                                           ▼
                                        ┌──────┐
                                        │ IDLE │
                                        └──────┘
```

## Tabla de Estados

| #  | Estado                     | Descripción                                      |
|----|---------------------------|--------------------------------------------------|
| 1  | `IDLE`                    | Estado inicial, esperando input                   |
| 2  | `DISCOVERY`               | Usuario inició conversación                       |
| 3  | `MENU_BROWSING`           | Explorando catálogo/menú                          |
| 4  | `ITEM_CLARIFICATION`      | Producto ambiguo, requiere clarificación          |
| 5  | `ORDER_BUILDING`          | Construyendo pedido (agregando items)             |
| 6  | `CART_REVIEW`             | Revisando carrito antes de checkout               |
| 7  | `CHECKOUT_MODE_SELECT`    | Seleccionando modo: delivery/takeaway/dine_in     |
| 8  | `DELIVERY_FLOW`           | Flujo delivery: dirección + zona                  |
| 9  | `TAKEAWAY_FLOW`           | Flujo takeaway: nombre + teléfono                 |
| 10 | `RESERVATION_FLOW`        | Creando nueva reserva                             |
| 11 | `RESERVATION_MODIFY_FLOW` | Modificando reserva existente                     |
| 12 | `RESERVATION_CANCEL_FLOW` | Cancelando reserva                                |
| 13 | `ORDER_CONFIRMATION`      | Confirmando pedido (pre-POS)                      |
| 14 | `RESERVATION_CONFIRMATION`| Confirmando reserva                               |
| 15 | `HUMAN_ESCALATION`        | Transferido a humano                              |
| 16 | `CLOSED_HOURS`            | Restaurante cerrado                               |
| 17 | `ERROR_RECOVERY`          | Recuperación de error                             |

## Tabla de Transiciones

| #  | From                    | To                       | Guard                            | Razón               |
|----|------------------------|--------------------------|----------------------------------|----------------------|
| 1  | IDLE                   | DISCOVERY                | `() => true`                     | inicio               |
| 2  | DISCOVERY              | MENU_BROWSING            | `() => true`                     | show_menu            |
| 3  | MENU_BROWSING          | ORDER_BUILDING           | `() => true`                     | start_order          |
| 4  | ORDER_BUILDING         | ITEM_CLARIFICATION       | `ctx.ambiguousProduct`           | producto ambiguo     |
| 5  | ORDER_BUILDING         | CART_REVIEW              | `ctx.cartItems > 0`             | carrito con items    |
| 6  | CART_REVIEW            | CHECKOUT_MODE_SELECT     | `() => true`                     | checkout             |
| 7  | CHECKOUT_MODE_SELECT   | DELIVERY_FLOW            | `ctx.mode === "delivery"`        | delivery             |
| 8  | CHECKOUT_MODE_SELECT   | TAKEAWAY_FLOW            | `ctx.mode === "takeaway"`        | takeaway             |
| 9  | CHECKOUT_MODE_SELECT   | ORDER_CONFIRMATION       | `ctx.mode === "dine_in"`         | dine in              |
| 10 | IDLE                   | RESERVATION_FLOW         | `() => true`                     | new reservation      |
| 11 | RESERVATION_FLOW       | RESERVATION_CONFIRMATION | `ctx.hasReservationDraft`        | draft ready          |
| 12 | RESERVATION_CONFIRMATION | IDLE                   | `() => true`                     | done                 |
| 13 | `*` (cualquiera)       | HUMAN_ESCALATION         | `() => true`                     | escalation           |
| 14 | `*` (cualquiera)       | ERROR_RECOVERY           | `() => true`                     | recovery             |
| 15 | `*` (cualquiera)       | CLOSED_HOURS             | `ctx.operationAllowed === false` | closed hours         |

## Guards

Los guards son funciones puras que reciben `ctx: Record<string, unknown>` y retornan `boolean`.

- **Sin guard** (`() => true`): Transición siempre permitida
- **Con guard**: La transición se bloquea si el guard retorna `false`, lanzando error con el motivo

## Comportamiento ante Transiciones Inválidas

Si se intenta una transición no definida en la tabla (ej: `IDLE → CART_REVIEW`), el sistema lanza:
```
Error: Transición inválida: IDLE -> CART_REVIEW
```

Si el guard bloquea una transición válida (ej: `ORDER_BUILDING → CART_REVIEW` con `cartItems: 0`):
```
Error: Guard bloqueó transición ORDER_BUILDING -> CART_REVIEW: carrito con items
```
