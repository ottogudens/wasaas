FROM node:20-alpine

# Instalamos openssl necesario para Prisma Client en Alpine
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json .npmrc ./
RUN npm install --legacy-peer-deps

COPY . .

RUN npx prisma generate

RUN npx tsc || npm run build

EXPOSE 3001

CMD ["node", "dist/main.js"]
