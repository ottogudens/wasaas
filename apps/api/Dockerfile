FROM node:20-alpine

WORKDIR /app

COPY package.json .npmrc ./
RUN npm install --legacy-peer-deps

COPY . .

# Generar cliente Prisma localmente dentro del contenedor
RUN npx prisma generate

RUN npx tsc || npm run build

EXPOSE 3001

# Ejecutar migración de DB al iniciar el contenedor y luego lanzar NestJS
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main.js"]
