# 🚀 Manual Definitivo de Despliegue en Railway: Plataforma WASaaS

Este manual contiene las instrucciones detalladas, configuraciones de build/deploy, puertos de red y variables de entorno necesarias para desplegar la arquitectura completa de **WASaaS** (SaaS Multi-tenant de Agentes IA de WhatsApp) en **Railway**.

---

## 📋 Arquitectura de Servicios en Railway

La aplicación se compone de **5 servicios interconectados** dentro del mismo proyecto de Railway:

```
[ Proyecto Railway: WASaaS ]
 ├── 1. PostgreSQL Database (+ pgvector)
 ├── 2. Redis Database Engine
 ├── 3. API Central (NestJS Backend) -> Root: /apps/api
 ├── 4. Bot Engine Worker (@builderbot/manager) -> Root: /apps/bot-engine
 └── 5. Web Admin Dashboard (Next.js 14) -> Root: /apps/web
```

---

## 🗄️ PASO 1: Aprovisionar Bases de Datos

### 1.1 PostgreSQL Database + Extensión Vectorial
1. En el Dashboard de Railway, haz clic en **+ New** -> **Database** -> **Add PostgreSQL**.
2. Haz clic en el servicio recién creado y ve a la pestaña **Variables**. Toma nota de la variable de conexión: `DATABASE_URL`.
3. Ve a la pestaña **Data** (o conéctate con `psql` usando el comando en la pestaña **Connect**) y ejecuta la siguiente consulta SQL para habilitar las búsquedas vectoriales del RAG:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### 1.2 Redis Database Engine
1. En el mismo proyecto de Railway, haz clic en **+ New** -> **Database** -> **Add Redis**.
2. Copia la variable de conexión: `REDIS_URL`.

---

## ⚙️ PASO 2: Despliegue del Backend API (`apps/api`)

Este servicio gestiona la lógica SaaS, autenticación, MercadoPago y procesamiento de embeddings para IA.

### Configuración del Servicio:
* **Source**: Selecciona el repositorio GitHub `ottogudens/wasaas`.
* **Root Directory**: `apps/api`
* **Build Command**: `npm run build`
* **Start Command**: `node dist/main.js` (o `npm run start`)
* **Networking**: Exponer puerto interno `3001`.

### Variables de Entorno (`apps/api`):
```env
# Puerto del servicio
PORT=3001

# Conexión a Base de Datos (Usa la variable de referencia de Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Conexión a Redis
REDIS_URL=${{Redis.REDIS_URL}}

# Claves de Servicios de IA y MercadoPago
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Llave de comunicación interna con BotEngine — genera un valor aleatorio propio,
# ej. con `openssl rand -hex 32`. NUNCA uses un valor de ejemplo de esta guía en
# producción: debe coincidir exactamente con la del servicio bot-engine (Paso 3)
# y también autentica ahora las conexiones al WebSocket interno del bot-engine.
INTERNAL_API_KEY=

# URL del Frontend Web
FRONTEND_URL=https://tu-dominio-dashboard.up.railway.app
```

---

## 🤖 PASO 3: Despliegue del Motor de Bots (`apps/bot-engine`)

Este servicio orquesta las instancias de WhatsApp por cliente utilizando `@builderbot/manager` y emite los códigos QR vía WebSockets.

### Configuración del Servicio:
* **Source**: Repositorio GitHub `ottogudens/wasaas`.
* **Root Directory**: `apps/bot-engine`
* **Build Command**: `npm run build`
* **Start Command**: `node dist/index.js`
* **Networking**: Exponer únicamente el puerto HTTP `3005`. El WebSocket se sirve sobre el **mismo** servidor y puerto (no requiere un puerto separado); Railway solo necesita el dominio/puerto HTTP habilitado y `wss://` funcionará automáticamente sobre él.

### ⚠️ IMPORTANTE: Añadir Volumen de Persistencia (Railway Volume)
Para evitar que las sesiones de WhatsApp conectadas se desconecten cuando Railway reinicie el servicio:
1. Dentro del servicio `bot-engine`, ve a la pestaña **Settings**.
2. En la sección **Volumes**, haz clic en **Add Volume**.
3. Configura el **Mount Path** exactamente en:
   ```text
   /app/apps/bot-engine/sessions
   ```

### Variables de Entorno (`apps/bot-engine`):
```env
BOT_ENGINE_PORT=3005
# WS_PORT no se usa: el WebSocket se adjunta al mismo servidor HTTP de arriba.
SESSIONS_DIR=/app/apps/bot-engine/sessions
# Debe ser idéntica, carácter por carácter, a la INTERNAL_API_KEY del Paso 2.
INTERNAL_API_KEY=
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

---

## 💻 PASO 4: Despliegue del Frontend Web Dashboard (`apps/web`)

El panel de control en Next.js para que los usuarios escaneen su QR, configuren prompts y se suscriban con MercadoPago.

### Configuración del Servicio:
* **Source**: Repositorio GitHub `ottogudens/wasaas`.
* **Root Directory**: `apps/web`
* **Build Command**: `npm run build`
* **Start Command**: `npm run start`
* **Networking**: En la pestaña **Settings** -> **Networking**, haz clic en **Generate Domain** para obtener la URL pública (ejemplo: `wasaas-production.up.railway.app`).

### Variables de Entorno (`apps/web`):
```env
PORT=3000
NEXT_PUBLIC_API_URL=https://api-wasaas.up.railway.app
```

> ⚠️ **No definas `NEXT_PUBLIC_WS_URL`.** El WebSocket de `bot-engine` es un canal interno protegido con `INTERNAL_API_KEY` (ver Paso 3); cualquier variable `NEXT_PUBLIC_*` viaja dentro del bundle JS y es visible en el navegador de cualquier persona, así que exponerla ahí anularía la autenticación del socket. El estado de conexión/QR y los mensajes del dashboard se obtienen hoy vía *polling* HTTP autenticado con JWT contra la API Central (`GET /bots/:id`, `GET /bots/:id/conversations`), no por WebSocket directo al bot-engine.

---

## 🔍 PASO 5: Verificación de la Red y Health Checks

Una vez completado el despliegue en Railway, realiza las siguientes verificaciones:

1. **Prueba de Base de Datos**: Asegúrate de que las migraciones de Prisma se hayan aplicado en PostgreSQL:
   ```bash
   npx prisma db push --schema=packages/database/prisma/schema.prisma
   ```
2. **Verificación de Código QR**: Accede a la URL del Dashboard Web, ve a la pestaña **Conectar WhatsApp** y confirma que se renderice la vista previa del QR transmitida desde el servicio `bot-engine`.
3. **Checkout MercadoPago**: Haz clic en el botón de suscripción para confirmar la redirección hacia la pasarela de pagos de MercadoPago.

---

### 🛡️ Recomendación de Seguridad
- Mantén la variable `INTERNAL_API_KEY` idéntica entre `apps/api` y `apps/bot-engine` para autorizar únicamente peticiones internas.
- Activa las alertas de uso en Railway para monitorear el consumo de RAM y CPU de las instancias de WhatsApp.
