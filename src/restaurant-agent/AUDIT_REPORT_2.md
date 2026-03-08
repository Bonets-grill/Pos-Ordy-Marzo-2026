# AUDIT_REPORT_2.md — Behavior Audit

> Fecha: 2026-03-08 | Resultado: **PASS**

## Objetivo

Validar que los flujos críticos del sistema funcionan end-to-end: catálogo → carrito → reglas de negocio → orquestación de pedido → máquina de estados.

## Flujo Auditado

### 1. Catálogo → Carrito

```
CatalogEngine(demoCatalog)
  └── getProduct("p1") → Hamburguesa (€10)
        └── CartEngine.addItem(product, qty=2) → total = €20
```

| Paso | Operación | Input | Output esperado | Resultado |
|------|-----------|-------|-----------------|-----------|
| 1.1 | Crear catálogo | MenuCatalog con 1 producto | CatalogEngine instanciado | PASS |
| 1.2 | Buscar producto | productId="p1" | Hamburguesa, price=10 | PASS |
| 1.3 | Agregar al carrito | qty=2 | lineTotal=20, total=20 | PASS |

### 2. Reglas de Negocio

```
BusinessRulesEngine(config)
  ├── openHours: L-S 00:00-23:59, Dom cerrado
  ├── deliveryEnabled: true
  ├── deliveryZones: ["CENTRO"]
  └── minimumOrderByMode: { delivery: 15 }
```

| Paso | Validación | Input | Output esperado | Resultado |
|------|-----------|-------|-----------------|-----------|
| 2.1 | Modo delivery | mode="delivery" | { ok: true } | PASS |
| 2.2 | Zona delivery | zone="CENTRO" | { ok: true } | PASS |
| 2.3 | Mínimo pedido | total=20, min=15 | { ok: true } | PASS |

### 3. Orquestación de Pedido

```
OrderOrchestrator(cart, rules)
  └── confirmAndCreateOrder("delivery", draft, "idem-order-1")
        ├── validateMode ✅
        ├── cart.items > 0 ✅
        ├── validateMinimum(20 >= 15) ✅
        ├── validateDeliveryZone("CENTRO") ✅
        ├── freezeCartBeforeCheckout() ✅
        └── return { orderId, mode="delivery", total=20, payloadVersion="v1" }
```

| Paso | Validación | Resultado |
|------|-----------|-----------|
| 3.1 | Idempotencia (key nueva) | PASS |
| 3.2 | Modo válido | PASS |
| 3.3 | Carrito no vacío | PASS |
| 3.4 | Mínimo cumplido | PASS |
| 3.5 | Dirección + zona presentes | PASS |
| 3.6 | Zona en cobertura | PASS |
| 3.7 | Carrito congelado post-confirm | PASS |
| 3.8 | Orden creada con total=20 | PASS |

### 4. Máquina de Estados

```
RestaurantStateMachine()
  IDLE → DISCOVERY → MENU_BROWSING → ORDER_BUILDING → CART_REVIEW
```

| Paso | Transición | Guard | Resultado |
|------|-----------|-------|-----------|
| 4.1 | IDLE → DISCOVERY | always | PASS |
| 4.2 | DISCOVERY → MENU_BROWSING | always | PASS |
| 4.3 | MENU_BROWSING → ORDER_BUILDING | always | PASS |
| 4.4 | ORDER_BUILDING → CART_REVIEW | cartItems=1 > 0 | PASS |

### 5. Validación Final

| Check | Condición | Resultado |
|-------|-----------|-----------|
| Total >= mínimo delivery | 20 >= 15 | PASS |

## Veredicto

**PASS** — Flujo completo catálogo→carrito→reglas→orquestación→FSM validado sin errores. Todos los guards y validaciones funcionan correctamente.
