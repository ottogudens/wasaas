FROM node:20-alpine

WORKDIR /app

# Instalar git necesario para dependencias de NPM
RUN apk add --no-cache git

# Copiar todo el código (incluyendo dependencias locales)
COPY . .

# Instalar dependencias
RUN npm install --legacy-peer-deps

# Compilar TypeScript a JavaScript
RUN npm run build || npx tsc

EXPOSE 3005 3006

CMD ["node", "dist/index.js"]
