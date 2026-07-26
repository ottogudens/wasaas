FROM node:20-alpine

WORKDIR /app

# Copiar paquetes y .npmrc con legacy-peer-deps
COPY package.json .npmrc ./
RUN npm install --legacy-peer-deps

# Copiar el resto del código
COPY . .

# Compilar TypeScript a JavaScript
RUN npm run build || npx tsc

EXPOSE 3005 3006

CMD ["node", "dist/index.js"]
