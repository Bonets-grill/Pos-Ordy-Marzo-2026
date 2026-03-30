# 🚀 SMOKE TEST GUIDE — Ordy POS SaaS

> **Objetivo**: Verificar que todos los flujos principales funcionan end-to-end antes de cada despliegue.  
> **Duración estimada**: ~60 minutos  
> **Entorno**: Staging / Producción con datos de prueba

---

## 📋 PRE-REQUISITOS

```bash
# 1. Servidor en marcha
npm run dev  # o npm start en producción

# 2. Tests unitarios verdes
npm run test

# 3. Variables de entorno configuradas
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# 4. Tenant de prueba existente
slug: bonets-grill
locale: es
currency: EUR
tax_rate: 10
tax_included: false
```

---

## 🔴 FLUJO 1: QR → Menú → Pedido (CRÍTICO)

### 1.1 Carga de Menú

| # | Acción | Resultado Esperado | Pass/Fail |
|---|--------|-------------------|-----------|
| 1 | Abrir `/qr/bonets-grill/1` | Página carga sin errores 404/500 | ☐ |
| 2 | Ver categorías | Se muestran todas las categorías activas | ☐ |
| 3 | Ver productos | Se muestran productos con precio | ☐ |
| 4 | Cambiar idioma a DE 🇩🇪 | Nombres de producto cambian a alemán | ☐ |
| 5 | Cambiar idioma a FR 🇫🇷 | Nombres cambian a francés | ☐ |
| 6 | Volver a ES 🇪🇸 | Nombres vuelven a español | ☐ |

**API Verificación:**
```bash
curl "http://localhost:3000/api/public/menu?slug=bonets-grill&table=1"
# Debe retornar: { tenant, table, categories, items, modifierGroups, modifiers }
# items[0] debe tener: name_es, name_en, name_fr, name_de, name_it
```

### 1.2 Submisión de Pedido

| # | Acción | Resultado Esperado | Pass/Fail |
|---|--------|-------------------|-----------|
| 1 | Seleccionar idioma DE | Menú en alemán | ☐ |
| 2 | Añadir producto con modificadores | Aparece en carrito con precio correcto | ☐ |
| 3 | Verificar precio total | Subtotal + IGIC (10%) correcto | ☐ |
| 4 | Pulsar "Bestellen" (Enviar) | Spinner de carga visible | ☐ |
| 5 | Pedido enviado | Mensaje "Bestellung gesendet!" | ☐ |
| 6 | Número de pedido visible | Formato "ORD-XXXX" | ☐ |
| 7 | Estado en tiempo real | "Confirmado" → "En preparación" → "Listo" | ☐ |

**API Verificación:**
```bash
curl -X POST "http://localhost:3000/api/public/order" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantSlug": "bonets-grill",
    "tableNumber": "1",
    "customerLang": "de",
    "items": [{
      "menu_item_id": "<UUID>",
      "quantity": 1
    }],
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000"
  }'
# Debe retornar: { orderId, orderNumber }
```

**Bug Check:**  
✅ Nombres de items en respuesta son en ESPAÑOL (tenant locale), no en alemán  
✅ metadata.customer_lang = "de" guardado correctamente  
✅ Segunda llamada con mismo idempotencyKey devuelve `idempotent: true`

---

## 🔴 FLUJO 2: KDS (Kitchen Display System) (CRÍTICO)

### 2.1 Acceso y Carga

| # | Acción | Resultado Esperado | Pass/Fail |
|---|--------|-------------------|-----------|
| 1 | Login como staff | Redirige a `/dashboard` | ☐ |
| 2 | Ir a `/kds` | Pantalla KDS carga sin sidebar | ☐ |
| 3 | Ver pedidos activos | Se listan pedidos con status confirmed/preparing/ready | ☐ |
| 4 | Pedidos en ESPAÑOL | Items muestran nombres en español (tenant lang) | ☐ |

### 2.2 Tiempo Real

| # | Acción | Resultado Esperado | Pass/Fail |
|---|--------|-------------------|-----------|
| 1 | Crear nuevo pedido (desde QR) | Aparece en KDS sin recargar | ☐ |
| 2 | Alerta de audio | Se escucha beep de 880Hz | ☐ |
| 3 | Timestamp del pedido | Formato "Xm" o "Xs" relativo | ☐ |

### 2.3 Ciclo de Vida del Pedido

```
confirmed → preparing → ready → served
```

| # | Acción | Resultado Esperado | Pass/Fail |
|---|--------|-------------------|-----------|
| 1 | Click "Preparando" en pedido | Status → `preparing` | ☐ |
| 2 | Click "Listo" en pedido | Status → `ready` (si todos los items listos) | ☐ |
| 3 | Click "Servido" (bump) | Status → `served`, sale del KDS | ☐ |
| 4 | Click "Recall" | Pedido vuelve a aparecer, status restaurado | ☐ |

**Verificación DB:**
```sql
SELECT id, status, confirmed_at, preparing_at, ready_at, served_at
FROM orders WHERE id = '<ORDER_ID>';
-- Debe tener los timestamps correspondientes
```

---

## 🟡 FLUJO 3: Gestión de Pedidos

### 3.1 Lista de Pedidos

| # | Acción | Resultado Esperado | Pass/Fail |
|---|--------|-------------------|-----------|
| 1 | Ir a `/orders` | Tabla con pedidos del día | ☐ |
| 2 | Filtrar por estado | Filtra correctamente | ☐ |
| 3 | Buscar por número | Resultado correcto | ☐ |
| 4 | Ver detalles de pedido | Items, modificadores, totales | ☐ |
| 5 | Exportar CSV | Descarga archivo CSV válido | ☐ |

---

## 🟡 FLUJO 4: Pagos

### 4.1 Registro de Pago

| # | Acción | Resultado Esperado | Pass/Fail |
|---|--------|-------------------|-----------|
| 1 | Ir a `/payments` | Lista de pagos | ☐ |
| 2 | Click "Nuevo Pago" | Modal con pedidos sin pagar | ☐ |
| 3 | Seleccionar pedido servido | Se carga el total | ☐ |
| 4 | Pagar con Efectivo | payment_record creado, order.payment_status = "paid" | ☐ |
| 5 | Pagar con Tarjeta | Igual que efectivo | ☐ |

### 4.2 Reembolso

| # | Acción | Resultado Esperado | Pass/Fail |
|---|--------|-------------------|-----------|
| 1 | Ver pago completado | Estado "Completado" visible | ☐ |
| 2 | Click "Reembolso" | Modal de confirmación | ☐ |
| 3 | Confirmar reembolso | payment_record con monto negativo | ☐ |
| 4 | Order queda marcada como "refunded" | ☐ |

---

## 🟠 FLUJO 5: i18n y Traducciones

### 5.1 Traducciones del UI

| # | Acción | Resultado Esperado | Pass/Fail |
|---|--------|-------------------|-----------|
| 1 | Cambiar idioma en `/settings` | UI cambia de idioma | ☐ |
| 2 | Navegar a `/dashboard` en DE | Labels en alemán | ☐ |
| 3 | Recargar página | Idioma persistido (localStorage) | ☐ |

### 5.2 Traducciones del Menú

| # | Acción | Resultado Esperado | Pass/Fail |
|---|--------|-------------------|-----------|
| 1 | Abrir `/menu` con items | Ver items en español | ☐ |
| 2 | Click "Traducir todo" | Llama `/api/ai/translate-menu` | ☐ |
| 3 | Items sin name_de | Se traduce y guarda | ☐ |
| 4 | Recargar QR en DE | Muestra las nuevas traducciones | ☐ |

---

## 🔴 VERIFICACIONES DE SEGURIDAD

### Auth & RLS

| # | Check | Resultado Esperado | Pass/Fail |
|---|-------|-------------------|-----------|
| 1 | Acceder a `/dashboard` sin login | Redirige a `/login` | ☐ |
| 2 | Acceder a `/kds` sin login | Redirige a `/login` | ☐ |
| 3 | Acceder a `/qr/bonets-grill/1` sin login | Carga normalmente (ruta pública) | ☐ |
| 4 | POST `/api/public/order` sin auth | Funciona (endpoint público) | ☐ |
| 5 | GET `/api/public/menu` con slug inválido | Retorna 404 | ☐ |

### Rate Limiting

| # | Check | Resultado Esperado | Pass/Fail |
|---|-------|-------------------|-----------|
| 1 | 11+ pedidos en < 60s desde misma IP | 429 Too Many Requests | ☐ |
| 2 | 11+ intentos de login en < 5min | 429 Too Many Requests | ☐ |

### Input Sanitization

| # | Check | Resultado Esperado | Pass/Fail |
|---|-------|-------------------|-----------|
| 1 | XSS en nombre de cliente | `<script>` removido del nombre | ☐ |
| 2 | SQL injection en slug | 400 Bad Request | ☐ |
| 3 | Notas de pedido > 500 chars | Truncado a 500 chars | ☐ |

---

## 🔧 HERRAMIENTAS DE DIAGNÓSTICO

```bash
# Health check
curl http://localhost:3000/api/health

# Logs en tiempo real (dev)
npm run dev

# Verificar integridad de archivos locked
bash verify-flow-lock.sh

# Tests unitarios
npm run test

# Build completo (tests + next build)
npm run build
```

---

## ✅ CHECKLIST DE APROBACIÓN

Para aprobar el despliegue a producción:

- [ ] Todos los tests unitarios pasan (`npm run test`)
- [ ] Build sin errores (`npm run build`)
- [ ] Flujo QR → Menú → Pedido funcional
- [ ] KDS recibe pedidos en tiempo real
- [ ] Alerta de audio funciona en KDS
- [ ] Pagos se registran correctamente
- [ ] Reembolsos funcionan
- [ ] Multi-idioma funciona (al menos ES + DE)
- [ ] Rutas protegidas requieren autenticación
- [ ] Rate limiting activo en endpoints públicos
- [ ] No hay errores en Sentry

---

## 📞 CONTACTO EN CASO DE FALLOS

| Componente | Responsable | Escalación |
|-----------|-------------|------------|
| Supabase DB | Admin | Dashboard Supabase |
| Auth | Admin | Supabase Auth logs |
| API Keys | Admin | `.env` + Vercel/Netlify |
| Realtime | Dev | Supabase Realtime config |

---

*Última actualización: 2026-03-30*  
*Versión: Next.js 16.1.6 + Supabase + Vitest*
