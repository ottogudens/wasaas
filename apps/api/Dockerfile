FROM node:20-alpine

# Instalamos openssl necesario para Prisma Client en Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Copiar solo los archivos de la API
COPY apps/api/package.json apps/api/.npmrc* ./
RUN npm install --legacy-peer-deps

COPY apps/api/ .

RUN npx prisma generate

RUN npx tsc -p tsconfig.json

EXPOSE 3001

CMD ["node", "dist/main.js"]
