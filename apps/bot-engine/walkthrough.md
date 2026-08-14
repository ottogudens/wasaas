# Resumen de Cambios: Fase 3 (Refactorización de Deuda Técnica)

Se ha completado satisfactoriamente la Fase 3 del plan de escalado, enfocada en resolver la deuda técnica más crítica en los monolitos del Frontend y del Backend.

## 1. Refactorización del Web Dashboard (`apps/web`)

El archivo `dashboard/page.tsx` era un monolito de más de 2500 líneas que manejaba múltiples estados (Bots, Bases de Conocimiento, Facturación, Chat en vivo, QR) y la inyección global de `useContext`.

### Cambios realizados:
- **Integración de React Query**: Se instaló `@tanstack/react-query` y se envolvió la aplicación en un `Providers.tsx` para habilitar el cacheo y la revalidación automática.
- **Componentes Modulares**: Se extrajeron las distintas pestañas del Dashboard hacia componentes independientes y asíncronos en `apps/web/src/components/dashboard/`:
  - `BotsPanel.tsx`
  - `KnowledgeBasePanel.tsx`
  - `BillingPanel.tsx`
  - `LiveChatPanel.tsx`
- **Custom Hooks**: Toda la lógica de fetching, mutación y sondeo de datos se encapsuló en hooks limpios:
  - `useBots.ts`
  - `useDocuments.ts`
  - `useConversations.ts`
- **Resultados**: 
  - `page.tsx` quedó como un simple orquestador de Layout y navegación de pestañas.
  - La aplicación ahora es capaz de revalidar datos automáticamente sin refrescar toda la pantalla.
  - Compilación exitosa de Next.js sin errores de tipos.

---

## 2. Refactorización del Bot Engine (`apps/bot-engine`)

El archivo `src/index.ts` era un monolito de casi 1000 líneas. Actuaba como gestor multi-tenant de WhatsApp, servidor HTTP Polka, servidor WebSockets, e integrador de NestJS, todo en uno.

### Cambios realizados:
Se rediseñó la arquitectura de carpetas para aislar responsabilidades:

- **`src/config.ts`**: Centraliza las variables de entorno.
- **`src/utils/`**:
  - `http.ts`: Helper `fetchWithRetry` genérico.
  - `format.ts`: Helpers para limpiar números de teléfono y extraer texto nativo de Baileys.
- **`src/services/`**:
  - `api.ts`: Todas las llamadas salientes hacia la API de NestJS (`chat-with-context`, `transcribe-voice`, etc).
  - `webhook.ts`: Lógica de sincronización de eventos de estado hacia la API.
- **`src/server/`**:
  - `websocket.ts`: Configuración del servidor `wss` y lógica de broadcast multi-tenant.
  - `routes.ts`: Endpoints HTTP internos (Polka) para manejar reconexión, mensajes manuales, y estado de la sesión.
- **`src/providers/manager.ts`**: El núcleo de WhatsApp. Aquí se hace override de `manager.createBot` y se escuchan los eventos nativos de Baileys (`require_action`, `message`, `auth_failure`).
- **`src/index.ts`**: 
  - Reducido de 1000 a 100 líneas.
  - Ahora solo importa los módulos y orquesta la inicialización secuencial del servidor y la rehidratación.
- **Resultados**: 
  - El código de TypeScript (`tsc`) compiló exitosamente.
  - Mayor seguridad al realizar cambios, ya que cada capa (HTTP vs WebSockets vs Baileys) está aislada.

> [!TIP]
> **Siguiente paso recomendado:** Con el backend y frontend optimizados, se recomienda realizar un despliegue en staging o producción (Railway) para verificar que las sesiones de WhatsApp y WebSockets se reconectan correctamente con la nueva estructura de módulos.
