FROM node:20-alpine

# Instalamos openssl necesario para Prisma Client en Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Copiar package.json raíz y de los workspaces necesarios
COPY package*.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/

# Instalar dependencias a nivel raíz (reconoce workspaces)
RUN npm install --legacy-peer-deps

# Copiar código fuente
COPY apps/api/ ./apps/api/
COPY packages/database/ ./packages/database/

WORKDIR /app/apps/api

# Generar Prisma Client y compilar NestJS
RUN npx prisma generate
RUN npx tsc -p tsconfig.json

EXPOSE 3001

CMD ["node", "dist/main.js"]
