# syntax=docker/dockerfile:1

FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm install --global npm@11.6.2 \
    && npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_TNLA_API_BASE=/api
ARG NEXT_PUBLIC_TNLASTATION_VERSION
ENV NEXT_PUBLIC_TNLA_API_BASE=$NEXT_PUBLIC_TNLA_API_BASE
ENV NEXT_PUBLIC_TNLASTATION_VERSION=$NEXT_PUBLIC_TNLASTATION_VERSION
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# standalone 出力は public/ を含めないので、静的アセット (クロムの背景画像など) を明示的に運ぶ。
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
