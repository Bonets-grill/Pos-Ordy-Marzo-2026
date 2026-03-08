# Restaurant Agent Immutable Architecture v1

Implementación base plug-and-play con enfoque determinístico:

- Contratos estrictos (`foundation/contracts.ts`)
- Motores determinísticos (`engines/*`)
- Locks de integridad (`locks/moduleLock.ts`)
- Tres auditorías previas a entrega (`audits/*`)

## Auditorías incluidas

1. **Contract Audit**: valida todos los esquemas críticos.
2. **Behavior Audit**: valida flujo cart + reglas + state machine + confirmación.
3. **Integrity Audit**: valida generación de hash lock inmutable.
