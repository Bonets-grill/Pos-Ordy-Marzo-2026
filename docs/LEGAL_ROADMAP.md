# ORDY MED — Roadmap Legal y Regulatorio

**CRITICO:** Un producto de software que asiste en la generacion de documentacion clinica
medica NO puede venderse legalmente sin cumplir los requerimientos de esta guia.

Este documento es **informativo**, NO es asesoria legal. Contrata un abogado especialista
en salud digital ANTES de vender.

---

## 1. Clasificacion regulatoria

### Pregunta 1: ¿Es un "medical device"?
- Si el software **toma decisiones clinicas** → probablemente SI (SaMD: Software as a Medical Device)
- Si el software **solo documenta lo que el medico dice/decide** → probablemente NO
- **ORDY MED con Claude generando SOAP notes** → ZONA GRIS. Consulta abogado.

### Pregunta 2: ¿En que paises vas a vender?

| Pais/Region | Regulador | Si califica como SaMD |
|-------------|-----------|-----------------------|
| EEUU | FDA | 510(k) o De Novo clearance |
| Europa | EMA + nacional | Marcado CE + MDR 2017/745 |
| Reino Unido | MHRA | UKCA marking |
| España | AEMPS | Registro sanitario |
| Mexico | COFEPRIS | Registro sanitario |
| Chile | ISP | Registro sanitario |

**Estimado de tiempo y costo:**
- FDA 510(k): 6-12 meses, $50K-$200K
- Marcado CE MDR: 6-18 meses, €30K-€150K
- Registro nacional: 3-6 meses, $5K-$20K

---

## 2. Privacidad y proteccion de datos

### HIPAA (EEUU)

**Aplica si:** Tus usuarios son entidades cubiertas (hospitales, clinicas, doctores en EEUU).

**Requisitos tecnicos:**
- [ ] Cifrado en transito (HTTPS obligatorio) ✅ Vercel lo provee
- [ ] Cifrado at-rest (base de datos cifrada) ✅ Supabase Pro+ lo provee
- [ ] Audit trails completos de accesos a PHI ✅ `audit_events` table
- [ ] Control de acceso basado en roles ✅ `auth-rbac` module
- [ ] Backups y disaster recovery
- [ ] Desidentificacion de datos para desarrollo/testing

**Requisitos legales (BAA — Business Associate Agreement):**
- [ ] **Supabase:** BAA disponible en plan Team+ ($599/mes). Sin esto, NO puedes usar Supabase con PHI real.
- [ ] **Vercel:** BAA disponible en Enterprise plan. Contactar ventas.
- [ ] **Anthropic (Claude):** BAA disponible en planes empresariales. Contactar ventas.
- [ ] **OpenAI (Whisper):** BAA NO disponible en plan standard. **NO usar con PHI.** Alternativas:
  - Deepgram (BAA disponible)
  - AssemblyAI (BAA disponible)
  - Self-hosted Whisper (infraestructura propia)

**Politicas requeridas:**
- [ ] Privacy Policy HIPAA-compliant
- [ ] Notice of Privacy Practices
- [ ] Incident response plan
- [ ] Breach notification procedures (60 dias)
- [ ] Employee training en HIPAA
- [ ] Risk assessment anual documentada

---

### GDPR (Europa)

**Aplica si:** Tus usuarios o pacientes estan en la UE/EEA.

**Requisitos:**
- [ ] **DPO (Data Protection Officer)** designado (obligatorio para procesamiento de datos de salud)
- [ ] **DPIA (Data Protection Impact Assessment)** documentada
- [ ] **DPA (Data Processing Agreement)** firmado con TODOS los vendors:
  - [ ] Supabase
  - [ ] Anthropic
  - [ ] OpenAI / vendor de STT
  - [ ] Vercel
  - [ ] Sentry (si se usa)
- [ ] **Base legal** documentada para procesamiento (Art. 6 + Art. 9 para datos de salud)
- [ ] **Consentimiento explicito** del paciente antes de procesamiento
- [ ] **Derechos del titular** implementados:
  - [ ] Derecho de acceso (Art. 15)
  - [ ] Derecho de rectificacion (Art. 16)
  - [ ] Derecho de supresion / "olvido" (Art. 17)
  - [ ] Derecho de portabilidad (Art. 20)
  - [ ] Derecho de oposicion (Art. 21)
- [ ] **Registro de actividades de tratamiento** (Art. 30)
- [ ] **Notificacion de brechas** en 72 horas a autoridad
- [ ] **Transferencias internacionales:** SCCs o adequacy decision para datos que salen de EEA
- [ ] **Tiempo de retencion** definido y justificado por cada categoria de dato

---

## 3. Responsabilidad medica

### Pregunta clave: ¿Quien es responsable si la nota generada tiene un error que causa dano al paciente?

**Escenarios posibles:**
1. **El medico revisa y firma la nota** → El medico es principalmente responsable (pero tu empresa puede tener co-responsabilidad como "vendor")
2. **La nota se usa sin revision humana** → Tu empresa tiene responsabilidad directa potencial
3. **El paciente accede a la nota y actua en ella** → Responsabilidad compartida

**Mitigaciones legales requeridas:**
- [ ] **Disclaimer prominente** en UI: "Esta nota es una ayuda de documentacion, NO reemplaza el juicio clinico del profesional"
- [ ] **Click-through acceptance** antes de usar el producto
- [ ] **Logs de quien reviso y aprobo cada nota** (ya cubierto por `audit_events`)
- [ ] **Terminos de servicio** con:
  - [ ] Limitacion de responsabilidad
  - [ ] Indemnification clauses
  - [ ] Definicion clara de "assistive tool" (no diagnostic)
  - [ ] Require medical license validation al onboarding

### Seguro de responsabilidad
**OBLIGATORIO antes de vender:**
- [ ] Professional Liability / E&O Insurance (mínimo $1M cobertura)
- [ ] Cyber Liability Insurance (por brechas de datos)
- [ ] Product Liability Insurance (si aplica)

Costo estimado: $3,000-$15,000/ano dependiendo de cobertura y jurisdicciones.

---

## 4. Estructura corporativa recomendada

**NO vendas esto como persona fisica.** Riesgo personal ilimitado.

- [ ] Constituir sociedad (LLC/SL/SA segun pais)
- [ ] Capital minimo + separacion patrimonial
- [ ] Cuentas bancarias separadas
- [ ] Contabilidad formal
- [ ] Certificado fiscal activo

---

## 5. Terminos de servicio — secciones obligatorias

1. **Acceptance of Terms**
2. **Description of Service** (claro: "assistive documentation tool")
3. **Eligibility** (solo profesionales medicos licenciados)
4. **Medical Disclaimer** (en grande, no en letra pequena)
5. **User Obligations** (revision humana obligatoria)
6. **Privacy Policy reference**
7. **Data Processing** (HIPAA/GDPR refs)
8. **Intellectual Property**
9. **Limitation of Liability** (caps)
10. **Indemnification**
11. **Dispute Resolution** (arbitration clause)
12. **Governing Law**
13. **Changes to Terms**
14. **Termination**
15. **Contact Information**

---

## 6. Checklist minimo para empezar a vender

### Beta gratuita (riesgo bajo)
- [ ] Usuarios firman consentimiento explicito de beta
- [ ] Disclaimer: "NO usar para decisiones clinicas reales"
- [ ] Monitoreo activo de uso
- [ ] Sin cobro de dinero

### Venta paga — Minimo viable legal
- [ ] Sociedad constituida
- [ ] Seguro de responsabilidad activo
- [ ] Abogado revisando contratos
- [ ] HIPAA BAA con Supabase (plan Team+)
- [ ] HIPAA BAA con Anthropic
- [ ] Reemplazo de OpenAI Whisper por vendor con BAA (Deepgram/AssemblyAI)
- [ ] Terminos de servicio legalmente revisados
- [ ] Privacy policy HIPAA-compliant
- [ ] Disclaimer medico prominente
- [ ] Sistema de consentimiento del paciente (si aplica)
- [ ] Proceso de incident response documentado

### Venta paga — Para uso clinico formal (6-18 meses)
- [ ] TODO lo anterior
- [ ] Clasificacion regulatoria determinada por abogado
- [ ] Si es SaMD: certificacion FDA/CE obtenida
- [ ] ISO 27001 o equivalente (recomendado)
- [ ] Pentest externo aprobado
- [ ] DPO designado (GDPR)
- [ ] Validacion clinica con medicos reales documentada

---

## 7. Contactos legales recomendados

Busca abogados especializados en:
- **Digital Health / HealthTech**
- **Medical Devices regulation**
- **HIPAA compliance**
- **GDPR compliance**

No uses un abogado generalista para esto. El dominio es muy especializado.

Directorios utiles:
- Health Law Center (EEUU)
- European Digital Health Association
- Colegios profesionales de abogados TIC en tu pais

Costo estimado de asesoria legal inicial: **$5,000-$25,000** (revision completa, terminos, privacy policy).

---

## 8. Resumen brutal

**No puedes vender esto legalmente hoy.** Lista de lo que te falta:

| Item | Tiempo | Costo estimado |
|------|--------|----------------|
| BAA con vendors (HIPAA) | 1-4 semanas | $0 (incluido en planes enterprise) |
| Cambiar Whisper por vendor con BAA | 1-2 dias | Dev time |
| Abogado HealthTech (contratos + policies) | 4-8 semanas | $10K-$25K |
| Seguro responsabilidad | 2-4 semanas | $3K-$15K/ano |
| Sociedad constituida | 2-4 semanas | $500-$3K |
| **Total minimo viable legal** | **2-3 meses** | **$15K-$45K** |
| **Certificacion regulatoria** (si SaMD) | **6-18 meses adicionales** | **$50K-$200K** |

**La arquitectura tecnica esta lista. La barrera ahora es legal/regulatoria.**

---

**FIN DEL ROADMAP LEGAL**

Ultima actualizacion: 2026-04-05
