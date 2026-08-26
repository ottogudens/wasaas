# Patch: Correcciones críticas de seguridad — wasaas

Archivo: `wasaas-fix-critico-01-websocket-superadmin.patch`

## Qué contiene

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `apps/bot-engine/src/server/websocket.ts` | El WebSocket ahora exige `?apiKey=<INTERNAL_API_KEY>` para conectar y ya no filtra por tenant cuando falta `tenantId` (eliminada la fuga cross-tenant). |
| 2 | `apps/api/src/main.ts` | Elimina el fallback hardcodeado de credenciales de Super Admin (`GuD3Ns@#`). Sin `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` en el entorno, el seed se omite en vez de crear una cuenta con password conocido. |
| 3 | `apps/api/src/check-env.ts` | `SUPER_ADMIN_EMAIL` y `SUPER_ADMIN_PASSWORD` pasan a ser obligatorias — la API no arranca sin ellas. |
| 4 | `apps/api/.env.example` | Documentación actualizada: sin valores de ejemplo reales, con instrucción de generación segura. |
| 5 | `DESPLIEGUE_RAILWAY.md` | Elimina la guía de `NEXT_PUBLIC_WS_URL` (habría expuesto la API key interna en el navegador) y reemplaza el ejemplo de `INTERNAL_API_KEY` débil por instrucción de generación segura. |
| 6 | `MANUAL_DESPLIEGUE_RAILWAY.md` | Mismas correcciones que el punto anterior + corrige el puerto WebSocket documentado (`3006`, que no existe en el código — el WS comparte el puerto HTTP `3005`). |

**Validado:** el patch fue generado sobre el estado actual de `main` y se confirmó que aplica limpio (`git apply --check`) sobre un clon nuevo del repositorio. `apps/api` y `apps/bot-engine` fueron typecheckeados (`tsc --noEmit`) sin errores tras los cambios.

---

## ⚠️ Antes de aplicar — rompe compatibilidad

1. **Cualquier despliegue de `api` sin `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` en Railway dejará de arrancar.** Configúralas antes de desplegar esta versión.
2. **Si el Super Admin actual fue creado con el password hardcodeado anterior (`GuD3Ns@#`), asúmelo comprometido** — estuvo en el historial de un repositorio; rotarlo es obligatorio, no opcional.
3. **Si algo fuera del repo se conecta hoy al WebSocket de `bot-engine`** (`wss://.../?tenantId=...`), dejará de poder conectarse hasta que le agregues `&apiKey=<INTERNAL_API_KEY>` a la URL. El frontend incluido en este repo no usa este WS (usa polling HTTP+JWT), así que si tu despliegue no tiene integraciones externas propias contra ese socket, no hay nada más que tocar.

---

## Menú de aplicación

### Opción A — Aplicar directo en tu clon local (recomendado)

```bash
# 1. Ubícate en la raíz de tu clon del repo, rama limpia y actualizada
cd /ruta/a/tu/wasaas
git checkout main
git pull origin main

# 2. Copia el archivo .patch a la raíz del repo (o indica su ruta completa abajo)

# 3. Verifica que aplique limpio antes de tocar nada
git apply --check wasaas-fix-critico-01-websocket-superadmin.patch

# 4. Aplícalo
git apply wasaas-fix-critico-01-websocket-superadmin.patch

# 5. Revisa el diff resultante
git diff

# 6. Crea una rama, commitea y sube
git checkout -b fix/websocket-auth-y-superadmin-hardcoded
git add -A
git commit -m "fix(security): autenticar WebSocket de bot-engine y eliminar credenciales hardcodeadas de Super Admin"
git push origin fix/websocket-auth-y-superadmin-hardcoded

# 7. Abre el Pull Request hacia main desde GitHub
```

### Opción B — Aplicar con `patch` (si `git apply` falla por algún motivo)

```bash
cd /ruta/a/tu/wasaas
patch -p1 < wasaas-fix-critico-01-websocket-superadmin.patch
```

### Opción C — Revisar antes de aplicar (dry-run + inspección archivo por archivo)

```bash
# Ver qué archivos toca y cuántas líneas, sin tocar nada
git apply --stat wasaas-fix-critico-01-websocket-superadmin.patch

# Simular la aplicación sin escribir nada
git apply --check wasaas-fix-critico-01-websocket-superadmin.patch
```

---

## Después de aplicar — checklist de despliegue

- [ ] Generar valores nuevos y únicos para `SUPER_ADMIN_PASSWORD` (ej. `openssl rand -base64 18`) e `INTERNAL_API_KEY` (ej. `openssl rand -hex 32`), si aún usas los de ejemplo antiguos.
- [ ] Configurar `SUPER_ADMIN_EMAIL` y `SUPER_ADMIN_PASSWORD` en Railway → servicio `api` → Variables.
- [ ] Confirmar que `INTERNAL_API_KEY` sea **idéntica** entre el servicio `api` y el servicio `bot-engine`.
- [ ] Eliminar cualquier variable `NEXT_PUBLIC_WS_URL` que hubieras configurado en el servicio `web`.
- [ ] Desplegar `bot-engine` primero (o simultáneo), luego `api`, luego `web`.
- [ ] Verificar en logs de `api` al arrancar: `✅ [API] Validación de variables de entorno: OK` y `✅ [SEED-AUTO] Super Admin ...` (no el warning de "se omite el seed").
- [ ] Probar login del Super Admin con las credenciales nuevas.
- [ ] Probar el flujo de vinculación de WhatsApp (QR) de un bot para confirmar que el `bot:qr` sigue llegando correctamente al dashboard vía polling.
- [ ] (Opcional, recomendado) Rotar `INTERNAL_API_KEY` también si el valor anterior circuló en algún canal inseguro (Slack, email, etc.), ya que ahora también protege el WebSocket.

---

## Pendientes no incluidos en este patch

Estos hallazgos de la auditoría siguen abiertos y no forman parte de este patch:

- CORS completamente abierto (`origin: true` + `credentials: true`) en `apps/api/src/main.ts` y `apps/bot-engine/src/server/routes.ts`.
- Tokens de MercadoPago almacenados en texto plano en base de datos.
- Webhook de MercadoPago sin verificación de firma HMAC.
- JWT del dashboard almacenado en `localStorage` (vulnerable a robo vía XSS).
- Comparación de API key interna sin `timingSafeEqual` en `bots.controller.ts` / `ai.controller.ts` (sí se corrigió en el WebSocket).
- Lista de `tenantModels` mantenida a mano en `prisma-tenant.extension.ts` en vez de derivada dinámicamente del schema.
