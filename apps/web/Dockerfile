FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY .npmrc* ./
RUN npm install --legacy-peer-deps
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_BOT_ENGINE_URL
ARG NEXT_PUBLIC_INTERNAL_API_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_BOT_ENGINE_URL=$NEXT_PUBLIC_BOT_ENGINE_URL
ENV NEXT_PUBLIC_INTERNAL_API_KEY=$NEXT_PUBLIC_INTERNAL_API_KEY

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npx", "next", "start", "-p", "3000"]
