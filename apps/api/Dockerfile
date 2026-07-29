FROM node:20-alpine

# Instalamos openssl necesario para Prisma Client en Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# The context is apps/api/, so we copy files directly
COPY package.json .npmrc* ./

# Instalar dependencias
RUN npm install --legacy-peer-deps

# Copiar el código fuente
COPY . .

# Generar Prisma Client
RUN npx prisma generate

# Compilar NestJS
RUN npx tsc -p tsconfig.json

EXPOSE 3001

CMD ["node", "dist/main.js"]
