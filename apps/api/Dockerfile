FROM node:20-alpine

WORKDIR /app

COPY package.json .npmrc ./
RUN npm install --legacy-peer-deps

COPY . .

RUN npx tsc || npm run build

EXPOSE 3001

CMD ["node", "dist/main.js"]
