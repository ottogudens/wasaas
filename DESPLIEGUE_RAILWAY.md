# Guía de Despliegue en Railway (Paso a Paso)

Este documento detalla las instrucciones exactas para realizar el despliegue de la arquitectura en **Railway** desde tu cuenta.

---

## 1. Crear el Proyecto en Railway

1. Ingresa a tu panel de [Railway](https://railway.app/).
2. Haz clic en **New Project** -> **Deploy from GitHub repo**.
3. Selecciona tu repositorio: `ottogudens/wasaas`.

---

## 2. Aprovisionar Bases de Datos

### A. Base de Datos PostgreSQL (con `pgvector`)
1. En el dashboard del proyecto en Railway, haz clic en **+ New** -> **Database** -> **Add PostgreSQL**.
2. Una vez creada la instancia de PostgreSQL, entra en la pestaña **Connect** y copia la variable `DATABASE_URL`.
3. Ve a la pestaña **Data** o conéctate con psql y ejecuta:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### B. Instancia de Redis Engine
1. Haz clic en **+ New** -> **Database** -> **Add Redis**.
2. Copia la variable `REDIS_URL`.

---

## 3. Configurar y Desplegar Microservicios

### Servicio 1: API Central (`apps/api`)
- **Root Directory**: `apps/api`
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Variables de Entorno**:
  - `DATABASE_URL`: `${Postgres.DATABASE_URL}`
  - `REDIS_URL`: `${Redis.REDIS_URL}`
  - `OPENAI_API_KEY`: Tu API key de OpenAI (`sk-...`)
  - `MERCADOPAGO_ACCESS_TOKEN`: Tu Access Token de MercadoPago
  - `JWT_SECRET`: Una clave secreta para firmar tokens JWT — genera una aleatoria y única, ej. `openssl rand -hex 32`. NUNCA reutilices un valor de ejemplo de esta guía.
  - `INTERNAL_API_KEY`: Clave compartida entre `api` y `bot-engine` — genera una aleatoria y única, ej. `openssl rand -hex 32` (Debe coincidir exactamente con la del bot-engine)
  - `BOT_ENGINE_URL`: URL pública de tu servicio bot-engine (ej. `https://whatsapp-service-production.up.railway.app`)
  - `FRONTEND_URL`: URL pública de tu frontend (ej. `https://mibot.skale.cl`)

### Servicio 2: Bot Engine Worker (`apps/bot-engine`)
- **Root Directory**: `apps/bot-engine`
- **Build Command**: `npm run build`
- **Start Command**: `npm run dev`
- **Railway Volume (Persistencia)**:
  - En la pestaña **Settings** -> **Volumes**, añade un nuevo Volumen montado en la ruta: `/app/apps/bot-engine/sessions`
- **Variables de Entorno**:
  - `INTERNAL_API_KEY`: La misma clave aleatoria generada para el servicio API (ver arriba) — deben coincidir exactamente en ambos servicios.
  - `API_URL`: URL pública de tu NestJS API Central (ej. `https://api-production.up.railway.app`)
  - `SESSIONS_DIR`: `/app/apps/bot-engine/sessions`

### Servicio 3: Admin Web Dashboard (`apps/web`)
- **Root Directory**: `apps/web`
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Networking**: En **Settings** -> **Networking**, haz clic en **Generate Domain** para obtener la URL pública de la aplicación.
- **Variables de Entorno**:
  - `NEXT_PUBLIC_API_URL`: URL pública de tu NestJS API Central (ej. `https://api-production.up.railway.app`)
  - `NEXT_PUBLIC_BOT_ENGINE_URL`: URL pública de tu bot-engine (ej. `https://whatsapp-service-production.up.railway.app`)

  > ⚠️ **No configures `NEXT_PUBLIC_WS_URL`.** El WebSocket del bot-engine (QR, pairing code, mensajes en vivo) es un canal **interno** protegido con `INTERNAL_API_KEY`. Cualquier variable `NEXT_PUBLIC_*` se incluye en el bundle JS y queda visible en el navegador de cualquier usuario — exponer esa key ahí anularía por completo su autenticación. El dashboard actual obtiene el estado de conexión y los mensajes por *polling* HTTP autenticado con JWT (`GET /bots/:id`, `GET /bots/:id/conversations`), no por WebSocket directo. Si en el futuro se necesita push en tiempo real hacia el navegador, debe implementarse a través de la API central (que sí valida JWT por usuario), nunca conectando el frontend directo al bot-engine.
