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
  - `PORT`: `3001`

### Servicio 2: Bot Engine Worker (`apps/bot-engine`)
- **Root Directory**: `apps/bot-engine`
- **Build Command**: `npm run build`
- **Start Command**: `npm run dev`
- **Railway Volume (Persistencia)**:
  - En la pestaña **Settings** -> **Volumes**, añade un nuevo Volumen montado en la ruta: `/app/apps/bot-engine/sessions` (para mantener las sesiones de WhatsApp activas tras reinicios).
- **Variables de Entorno**:
  - `BOT_ENGINE_PORT`: `3005`
  - `WS_PORT`: `3006`
  - `INTERNAL_API_KEY`: `skale-saas-secret-key`

### Servicio 3: Admin Web Dashboard (`apps/web`)
- **Root Directory**: `apps/web`
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Networking**: En **Settings** -> **Networking**, haz clic en **Generate Domain** para obtener la URL pública de la aplicación.
