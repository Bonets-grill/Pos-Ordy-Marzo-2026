# ORDY MED AI COPILOT — Guia de Activacion de Integraciones Reales

Esta guia convierte el sistema de **mocks deterministicos** a **funcionalidad real**
sin tocar ninguno de los 19 modulos bloqueados con HARD LOCK H256.

---

## 1. Resumen de lo que se activa

El modulo `live-integrations` (no bloqueado) contiene adaptadores REALES que implementan
las interfaces definidas en los modulos bloqueados:

| Feature | Mock (actual) | Real (cuando configures) |
|---------|---------------|--------------------------|
| Auth | `MockAuthProvider` (6 users hardcoded) | `SupabaseAuthAdapter` (Supabase Auth real) |
| Base de datos | `InMemoryStorageProvider` | `SupabasePatientRepo` + 4 repos mas |
| Transcripcion | `MockTranscriptionProvider` | `WhisperTranscriptionProvider` (OpenAI Whisper) |
| Notas clinicas | `MockNoteProvider` | `ClaudeNoteProvider` (Anthropic Claude) |
| Audit logs | In-memory | `SupabaseAuditRepo` (tabla real) |
| Captura audio | Ninguna | `MediaRecorderCapture` (navegador) |

---

## 2. Requisitos externos

Antes de activar, necesitas CREAR/OBTENER:

### 2.1 Proyecto Supabase
1. Entra a https://supabase.com/dashboard
2. Crea un proyecto nuevo (ej: `ordy-med-prod`)
3. Anota la **URL** del proyecto: `https://xxx.supabase.co`
4. En Settings → API copia:
   - `anon` / `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (SECRETO, no exponer al frontend)

### 2.2 Ejecutar la migracion SQL
Ejecuta `supabase/migrations/20260405000000_ordy_med_schema.sql` en el SQL Editor de Supabase.
Esto crea:
- 7 tablas: `tenants`, `profiles`, `patients`, `sessions`, `documents`, `memory_items`, `audit_events`
- Row-Level Security con aislamiento por tenant
- Indexes + triggers de `updated_at`

### 2.3 Anthropic API Key
1. https://console.anthropic.com/settings/keys
2. Create Key → copia y guarda
3. Esta key vale dinero por uso (aprox $15/M input tokens, $75/M output tokens para Opus)

### 2.4 OpenAI API Key (para Whisper)
1. https://platform.openai.com/api-keys
2. Create new secret key
3. Whisper cuesta $0.006 por minuto de audio transcrito

---

## 3. Configuracion de variables de entorno

### Local (desarrollo)
Copia `.env.live-integrations.example` a `.env.local`:
```bash
cp .env.live-integrations.example .env.local
```

Rellena los valores reales y reinicia el dev server:
```bash
npm run dev
```

### Produccion (Vercel)
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add ANTHROPIC_API_KEY production
vercel env add OPENAI_API_KEY production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
vercel --prod  # redeploy
```

---

## 4. Verificar que todo este activo

### 4.1 Health check
```bash
curl https://drkernai.com/api/integrations-health
```
Deberia devolver:
```json
{
  "ok": true,
  "mode": "live",
  "integrations": {
    "supabase": "ready",
    "claude": "ready",
    "whisper": "ready"
  },
  "missing_env": []
}
```
Si `mode: "partial"` o hay items en `missing_env`, te faltan variables.

### 4.2 Test del endpoint de transcripcion
```bash
curl -X POST https://drkernai.com/api/transcribe \
  -F "audio=@sample.webm" \
  -F "language=es-ES"
```

### 4.3 Test del endpoint de generacion de notas
```bash
curl -X POST https://drkernai.com/api/generate-note \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "s1",
    "tenantId": "t1",
    "patientId": "p1",
    "patientName": "Maria Lopez",
    "doctorName": "Dr. Garcia",
    "language": "es-ES",
    "consultationMode": "general",
    "transcript": "Paciente refiere dolor de cabeza hace 3 dias...",
    "template": "soap",
    "memoryItems": [
      {"type": "allergy", "title": "Penicilina", "severity": "high"}
    ]
  }'
```

---

## 5. Arquitectura de activacion (no rompe locks)

```
┌─────────────────────────────────────────────┐
│        MODULOS BLOQUEADOS (19 locks)        │
│  voice-engine, scribe-ai, medical-memory,   │
│  auth-rbac, persistence-api, ...            │
│  ← definen INTERFACES (publico)             │
└─────────────────────────────────────────────┘
                    ↑
                    │ implementa
                    │
┌─────────────────────────────────────────────┐
│     live-integrations (NO bloqueado)        │
│  ├─ adapters/ (Supabase, Claude, Whisper)   │
│  ├─ audio/ (MediaRecorder real)             │
│  ├─ services/ (LiveModeService)             │
│  └─ client/ (Supabase client)               │
└─────────────────────────────────────────────┘
                    ↑
                    │ usado por
                    │
┌─────────────────────────────────────────────┐
│          API Routes (Next.js)               │
│  /api/transcribe → Whisper                  │
│  /api/generate-note → Claude                │
│  /api/integrations-health → status          │
└─────────────────────────────────────────────┘
```

**Beneficio:** Si manana cambias de Claude a GPT-4, solo editas
`live-integrations/adapters/ClaudeNoteProvider.ts`. **Cero cambios** en modulos bloqueados.

---

## 6. Proximos pasos despues de activacion

Una vez que `/api/integrations-health` devuelva `mode: "live"`:

### Fase A — Validacion tecnica (1-3 dias)
- [ ] Probar `/api/transcribe` con audio real
- [ ] Probar `/api/generate-note` con transcript real
- [ ] Verificar que los datos se persisten en Supabase
- [ ] Probar signup + login real via `SupabaseAuthAdapter`
- [ ] Monitorear costos de API (Claude + OpenAI)

### Fase B — Reemplazo de mock users (1-2 dias)
Las rutas actuales como `/voice-engine`, `/scribe-ai`, `/super-admin` usan mock users
hardcoded. Hay que crear unas NUEVAS rutas (o nuevos modulos) que usen el
`SupabaseAuthAdapter` real en lugar del mock.

**IMPORTANTE:** NO modificar las rutas bloqueadas. Crear rutas nuevas como
`/app/voice-engine-live/` o similar.

### Fase C — Validacion clinica (semanas/meses)
- [ ] Pilotos con 1-2 medicos reales (con disclaimer claro)
- [ ] Ajustar prompts de Claude segun feedback
- [ ] Validar calidad de transcripciones en entorno clinico real
- [ ] Medir precision de secciones SOAP generadas

### Fase D — Compliance legal (meses)
- [ ] HIPAA: firmar BAA con Supabase (planes Team+)
- [ ] HIPAA: firmar BAA con Anthropic (disponible en planes empresariales)
- [ ] HIPAA: NO usar OpenAI Whisper sin BAA (alternativa: Deepgram con BAA o self-hosted Whisper)
- [ ] GDPR: DPA con todos los vendors, DPO designado
- [ ] Terminos de servicio + Politica de privacidad
- [ ] Disclaimer medico prominente en el UI

### Fase E — Medical device regulation (6-18 meses)
- [ ] Determinar si califica como SaMD (Software as a Medical Device)
- [ ] Si aplica: marcado CE (Europa) o FDA 510(k) (EEUU)
- [ ] Estudios clinicos de validacion
- [ ] ISO 13485, IEC 62304

---

## 7. Costos estimados operativos (por doctor activo/mes)

Asumiendo 100 consultas/mes por doctor, ~10 min cada una:

| Item | Calculo | Costo/mes |
|------|---------|-----------|
| Whisper transcripcion | 1000 min × $0.006 | $6 |
| Claude notas (opus) | ~500K tokens × precios | $30 |
| Supabase (pro plan) | Fijo | $25 (compartido) |
| Vercel (pro plan) | Fijo | $20 (compartido) |
| **Total por doctor** | | **~$40-60/mes** |

Precio de venta sugerido: **$99-149/doctor/mes** (margen 40-60%)

---

## 8. Que HACER si algo no funciona

### Error: "OPENAI_API_KEY not configured"
→ Variable de entorno no esta seteada. Revisa `.env.local` o `vercel env ls`.

### Error: "Supabase client failed"
→ URL o anon key incorrectas. Revisa en Supabase Dashboard → Settings → API.

### Error: "Claude API 429 rate limit"
→ Has excedido el rate limit. Espera o upgrade tu plan Anthropic.

### Error: "RLS policy violation"
→ El usuario esta intentando acceder a datos de otro tenant. Verifica que la sesion
   tiene el `tenant_id` correcto en la tabla `profiles`.

### Error en `/api/transcribe`: "Unsupported audio format"
→ Whisper acepta: mp3, mp4, mpeg, mpga, m4a, wav, webm. Asegurate que
   `MediaRecorderCapture` use `audio/webm` (default).

---

## 9. Checklist final antes de vender

- [ ] Health check devuelve `mode: "live"`
- [ ] Transcripcion real funciona end-to-end
- [ ] Generacion de notas real funciona end-to-end
- [ ] Datos persisten en Supabase entre sesiones
- [ ] Login/signup real funciona
- [ ] RLS policies validadas (cross-tenant bloqueado)
- [ ] BAA firmados con Supabase + Anthropic + vendor de STT con BAA
- [ ] Disclaimer medico visible en UI
- [ ] Terminos de servicio + Privacy policy publicados
- [ ] Seguro de responsabilidad medica activo
- [ ] Pentest externo aprobado
- [ ] Certificacion regulatoria obtenida (si aplica)

**Hasta que TODOS esos items esten completos, el producto NO debe venderse como
herramienta clinica de produccion.** Se puede ofrecer como beta gratuita con
disclaimers, o como demo para inversores.

---

**FIN DE LA GUIA**

Enlaces:
- Repo: https://github.com/Bonets-grill/Pos-Ordy-Marzo-2026
- URL produccion: https://drkernai.com
- System report: `ORDY_MED_SYSTEM_REPORT.md`
