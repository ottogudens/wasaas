# Plan de Mantenimiento y Evolución — wasaas

**Objetivo:** llevar la aplicación de MVP funcional a producto robusto, seguro y con excelente UX en web y móvil, sin detener el servicio a clientes activos.

**Principio rector:** cada fase debe ser desplegable de forma independiente y reversible. Nada de "big bang". Feature flags y ramas cortas.

---

## Fase 0 — Estabilización y Seguridad Crítica (Semana 1-2)

Esto se hace primero porque son riesgos activos, no mejoras. No se toca UX ni features nuevas hasta cerrar esto.

### 0.1 Secretos y credenciales
- [ ] Eliminar el fallback hardcodeado `'skale-saas-secret-key'` en `bot-engine/src/index.ts`. La app debe **fallar al arrancar** (`process.exit(1)`) si `INTERNAL_API_KEY`, `OPENAI_API_KEY`, `DATABASE_URL` o `JWT_SECRET` no están definidas.
- [ ] Rotar `INTERNAL_API_KEY` actual (asumir que está comprometida por estar en el historial de git).
- [ ] Auditar `git log` en busca de secretos commiteados alguna vez (`git log -p | grep -i "api_key\|secret\|password"`); si aparece algo, rotar esa credencial también, no basta con borrarla del HEAD.
- [ ] Mover todos los secretos a Railway Variables (ya lo hacen parcialmente) y documentar cuáles son obligatorias en un `.env.example` completo.
- [ ] Añadir un script de arranque (`scripts/check-env.ts`) que valide con `zod` que todas las env vars requeridas existen y tienen formato correcto, corriendo antes de `nest start` y antes de iniciar `bot-engine`.

### 0.2 Autenticación y autorización
- [ ] Verificar que **todos** los endpoints `/internal/*` del bot-engine y los endpoints internos del API (`/ai/chat-with-context`, `/rag/process-whatsapp-file`, `/ai/transcribe-voice`) validen `x-api-key` — confirmar que no hay ninguno sin guard.
- [ ] Añadir rate limiting (`@nestjs/throttler`) en endpoints públicos de auth (`/auth/login`, `/auth/register`) para prevenir fuerza bruta.
- [ ] Revisar que el JWT tenga expiración razonable (ej. 7 días access + refresh token), y que exista endpoint de logout/revocación.
- [ ] Confirmar aislamiento multi-tenant en cada query Prisma: todo `findMany`/`findFirst` que toque datos de negocio debe filtrar por `organizationId`. Esto es el riesgo #1 en un SaaS multi-tenant — un olvido aquí filtra datos entre clientes. Recomiendo un **middleware de Prisma** que inyecte automáticamente el filtro `organizationId` en vez de confiar en que cada desarrollador lo recuerde en cada query.

### 0.3 Dependencias
- [ ] `npm audit` / `pnpm audit` en las 3 apps + en `builderbot-builderbot`. Priorizar CVEs críticos/altos.
- [ ] Congelar versión de Baileys probada y documentar el proceso de actualización (Baileys rompe frecuentemente con cambios de WhatsApp Web; no actualizar a ciegas en producción).

**Entregable de Fase 0:** checklist de seguridad firmado + variables rotadas + tests de humo pasando en staging.

---

## Fase 1 — Infraestructura y Entornos (Semana 2-3)

No se puede hacer buen mantenimiento sin un entorno de staging real.

- [ ] **Staging en Railway**: réplica del proyecto de producción (misma topología: api + bot-engine + web + Postgres con pgvector), con un número de WhatsApp de prueba dedicado (nunca reusar el de un cliente real para probar).
- [ ] **CI/CD**: GitHub Actions con:
  - Lint + typecheck en cada PR (`tsc --noEmit`, ESLint)
  - Tests automáticos (ver Fase 2)
  - Build de Docker de las 3 apps
  - Deploy automático a staging al mergear a `develop`
  - Deploy a producción solo vía tag/release manual, con posibilidad de rollback en un click (Railway lo soporta nativamente por deployment)
- [ ] **Backups de base de datos**: verificar que Railway Postgres tenga backups automáticos habilitados; si no, configurar `pg_dump` diario a un bucket externo (S3/R2) con retención de 30 días. Esto es no-negociable dado que hay `KnowledgeDocument`, conversaciones e historial de facturación.
- [ ] **Monitoreo y alertas**: integrar algo tipo Sentry (errores) + un uptime checker (ej. Better Stack / UptimeRobot) sobre `/health` de las 3 apps, con alertas a Slack/WhatsApp del equipo cuando un bot se desconecta inesperadamente (`bot:disconnected` ya se emite — hay que engancharlo a una notificación real, no solo log).
- [ ] **Logs estructurados**: reemplazar `console.log` por un logger real (`pino` o el `Logger` de Nest ya usado en API, pero llevarlo también al bot-engine) con niveles y correlación por `tenantId` + `conversationId`, exportado a un sistema centralizado (Railway logs tiene retención corta).

**Entregable de Fase 1:** pipeline CI/CD funcionando, staging idéntico a prod, backups verificados con un restore de prueba real.

---

## Fase 2 — Calidad y Testing (Semana 3-5, en paralelo con Fase 1)

Actualmente no hay evidencia de tests. Sin tests, cada "actualización" es una apuesta.

- [ ] **Tests unitarios** en `api/src`: prioridad a `ai.service.ts`, `rag.service.ts`, `auth.service.ts` (lógica de negocio pura, alto riesgo si se rompe silenciosamente).
- [ ] **Tests de integración**: endpoints críticos con base de datos de prueba (Testcontainers con Postgres+pgvector).
- [ ] **Tests E2E del flujo WhatsApp**: mockear Baileys (no se puede testear contra WhatsApp real de forma confiable) simulando mensajes entrantes de texto, audio y documento, verificando que el pipeline completo (transcribe → RAG → respuesta → guardado en BD) funciona.
- [ ] **Tests de frontend**: al menos smoke tests con Playwright para los flujos críticos (login, conectar bot vía QR, subir documento, ver conversación en Live Chat) en viewport desktop y móvil.
- [ ] Definir un umbral mínimo de cobertura en CI (no need to perseguir 100%, pero sí bloquear PRs que bajen la cobertura en los módulos core).

---

## Fase 3 — Refactor de Deuda Técnica (Semana 5-8)

Aquí se atacan los problemas estructurales ya identificados, ahora con red de seguridad (tests + staging).

### 3.1 Backend
- [ ] Partir `bot-engine/src/index.ts` (919 líneas) en módulos: `providers/`, `webhooks/`, `websocket/`, `routes/internal/`, `session-manager.ts`. Un solo archivo con toda la lógica de negocio + servidor HTTP + WebSocket es difícil de testear y de que trabajen dos personas en paralelo.
- [ ] Middleware de Prisma para scoping automático por `organizationId` (mencionado en 0.2).
- [ ] Chunking RAG mejorado: usar `tiktoken` para contar tokens reales (no palabras) y respetar límites de párrafo/oración en vez de cortar a ciegas.
- [ ] Extracción real de documentos multi-formato en el flujo de WhatsApp: `pdf-parse` para PDF, `mammoth` para DOCX, OCR (ej. Tesseract o Vision API) para imágenes escaneadas — hoy solo funciona `.txt` plano.
- [ ] TTL / invalidación de `SemanticMemoryCache`: expirar entradas tras N días o al editar/borrar el `KnowledgeDocument` relacionado, para no servir respuestas obsoletas indefinidamente.
- [ ] Timeouts y reintentos (con backoff) en las llamadas HTTP internas bot-engine ↔ api, con mensaje de fallback al usuario de WhatsApp si la API no responde a tiempo, en vez de silencio total.

### 3.2 Frontend
- [ ] Descomponer `dashboard/page.tsx` (136K, monolítico) en componentes por dominio: `BotsPanel`, `LiveChat`, `KnowledgeBase`, `Billing`, `Analytics`, cada uno con su propio hook de datos (`useBotStatus`, `useConversations`, `useDocuments`, etc.).
- [ ] Introducir data-fetching con caché (TanStack Query) en vez de fetch manual disperso — reduce requests redundantes y simplifica estados de loading/error.
- [ ] Revisar el bundle: con Next.js, un archivo de 136K en una sola ruta client-side probablemente esté enviando JS innecesario al primer load. Medir con `next build --profile` y hacer code-splitting por pestaña del dashboard (lazy load de `LiveChat`, `KnowledgeBase`, etc. con `next/dynamic`).

**Entregable de Fase 3:** PRs incrementales, cada uno con tests, revisados y mergeados a `develop`, validados en staging antes de producción.

---

## Fase 4 — Diseño de UX/UI multiplataforma (Semana 6-10, en paralelo)

Aquí es donde entra el rediseño consciente, no solo "que funcione".

### 4.1 Principios de diseño a aplicar
- **Mobile-first real**: dado que dueños de restaurantes/retail van a gestionar esto desde el celular la mayoría del tiempo (no van a estar frente a un desktop viendo el Live Chat), el dashboard debe diseñarse primero para pantalla angosta y luego expandirse a desktop — no al revés.
- **Estado de conexión siempre visible**: el estado del bot de WhatsApp (`CONNECTED`, `QR_READY`, `ERROR`, etc.) es la señal más importante para el usuario dueño del negocio. Debe ser un indicador persistente (badge en el header), no algo que hay que entrar a buscar.
- **Feedback inmediato en acciones asíncronas**: conectar un bot vía QR, subir un documento, procesar RAG — todas estas operaciones tardan segundos/minutos. Usar skeletons, progress indicators y toasts de confirmación en cada una, en vez de dejar al usuario sin señal de qué está pasando.
- **Accesibilidad**: contraste AA mínimo, foco visible en navegación por teclado, labels reales en inputs (no solo placeholder), soporte de lector de pantalla en el Live Chat.

### 4.2 Rediseño por superficie

**Dashboard web (desktop)**
- Layout con sidebar de navegación fija + área de contenido, patrón estándar de SaaS admin (similar a Linear/Vercel dashboard) para reducir carga cognitiva.
- Live Chat como vista de dos columnas (lista de conversaciones + hilo activo), con búsqueda y filtro por estado (bot / humano / sin responder).

**Dashboard web (móvil / PWA)**
- Ya existe `manifest.json` y `sw.js` — aprovechar eso: convertir el dashboard en una PWA instalable de verdad, con navegación inferior tipo tab bar (Bots / Chats / Documentos / Config) en vez de sidebar, que es el patrón correcto para pantallas angostas.
- Notificaciones push (via service worker) cuando: un bot se desconecta, un cliente pide hablar con un humano (handoff), o llega un mensaje sin responder por X minutos.
- Modo offline básico: mostrar último estado conocido con indicador "sin conexión" en vez de pantalla en blanco.

**Onboarding (registro → primer bot conectado)**
- Este es el momento crítico de conversión. Diseñar como wizard de 3 pasos: (1) crear cuenta, (2) escanear QR o pairing code con instrucciones visuales claras, (3) subir primer documento o configurar system prompt. Reducir fricción aquí impacta directamente en retención.

**Experiencia del cliente final en WhatsApp**
- No es "UI" tradicional pero es UX: revisar tiempos de respuesta (RAG + LLM no debería tardar más de ~3-5s percibidos; si tarda más, enviar un mensaje de "estoy revisando..." antes de la respuesta final).
- Mensajes de error del bot deben sonar humanos y dar una salida clara (ej. ofrecer handoff a humano automáticamente tras 2 fallos consecutivos, no solo cuando el usuario lo pide explícitamente).

### 4.3 Proceso de diseño
- [ ] Auditoría de UX actual con 3-5 usuarios reales (dueños de negocio, no developers) observando cómo usan el dashboard hoy — esto evita rediseñar en base a suposiciones.
- [ ] Wireframes de baja fidelidad para dashboard móvil y desktop antes de tocar código.
- [ ] Design system mínimo: tokens de color, tipografía, espaciado y componentes base (botón, input, badge de estado, card) documentados y reutilizados — hoy probablemente hay estilos inline dispersos dado el monolito del dashboard.
- [ ] Prototipo navegable (Figma) validado con el mismo grupo de usuarios antes de implementar.

---

## Fase 5 — Rollout Controlado (Semana 10-12)

- [ ] Feature flags para cada cambio grande (nuevo dashboard, nuevo onboarding) — permitir activar por organización, empezando con 1-2 clientes piloto antes de 100%.
- [ ] Plan de comunicación a clientes existentes: changelog simple, ningún cambio que rompa flujos sin aviso previo (especialmente reconexión de WhatsApp, que es sensible).
- [ ] Ventana de rollback definida: si algo falla en producción tras un release, poder revertir en minutos (esto ya lo da Railway con deployments, pero hay que practicarlo, no asumirlo).

---

## Mantenimiento Continuo (a partir de Semana 12, recurrente)

| Cadencia | Actividad |
|---|---|
| Diaria | Revisión de alertas de monitoreo, estado de bots desconectados |
| Semanal | Revisión de `npm audit`, revisión de logs de errores agregados (Sentry) |
| Quincenal | Actualización de dependencias menores (patch/minor), nunca en viernes |
| Mensual | Revisión de costos de OpenAI (tokens consumidos por tenant, efectividad del semantic cache — % de hit rate) para detectar organizaciones con uso anómalo o necesidad de ajustar plan |
| Trimestral | Auditoría de seguridad completa, prueba de restore de backup, revisión de versión de Baileys (WhatsApp cambia su protocolo con frecuencia y rompe versiones viejas sin aviso) |
| Continua | Cada feature nueva pasa por: diseño → staging → tests → piloto con 1 cliente → rollout general |

---

## Resumen de prioridades (si el tiempo/presupuesto es limitado)

1. **Fase 0 (seguridad)** — no negociable, hazlo ya.
2. **Backups + staging (Fase 1 parcial)** — sin esto, cualquier error de Fase 3/4 es irreversible.
3. **Aislamiento multi-tenant verificado** — es el riesgo reputacional más grande de un SaaS: un cliente viendo datos de otro.
4. Todo lo demás (refactor, UX) es importante pero puede iterarse con el negocio funcionando, siempre que los tres puntos anteriores estén cubiertos.

¿Quieres que desarrolle en detalle alguna fase específica — por ejemplo, el middleware de Prisma para scoping multi-tenant, la estructura de carpetas del refactor del bot-engine, o los wireframes del dashboard móvil?
