# ── INQUISITIVE AI — Backend Server ──────────────────────────────────────────
# Multi-stage build: deps → production
# Runs as non-root user. Exposes port 3002.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 inqai && \
    adduser  --system --uid 1001 --ingroup inqai inqai

COPY --from=deps /app/node_modules ./node_modules
COPY server/ ./server/
COPY package.json ./

RUN chown -R inqai:inqai /app
USER inqai

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3002/health || exit 1

ENV NODE_ENV=production
CMD ["node", "server/index.js"]
