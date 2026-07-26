FROM node:20-alpine

WORKDIR /app

# Copiar configuración de dependencias y .npmrc
COPY package.json .npmrc ./
RUN npm install --legacy-peer-deps

# Copiar el resto del código del servicio
COPY . .

# Generar cliente de Prisma y compilar la aplicación
RUN npm run build || npx tsc

EXPOSE 3001

CMD ["node", "dist/main.js"]
