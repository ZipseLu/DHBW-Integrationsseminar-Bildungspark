# =============================================================================
# Multi-Stage Dockerfile fuer das Backend
#   Stage "dev"  – Hot Reload (Standard in docker-compose.yml)
#   Stage "prod" – minimaler Produktions-Image mit node-user
# =============================================================================

# -----------------------------------------------------------------------------
# Abhaengigkeiten
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# -----------------------------------------------------------------------------
# Development: hier MIT devDependencies (vitest, supertest)
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS deps-dev
WORKDIR /app
COPY package*.json ./
RUN npm ci

# -----------------------------------------------------------------------------
# Development
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS dev
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=development
COPY --from=deps-dev --chown=node:node /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# -----------------------------------------------------------------------------
# Produktion
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS prod
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

# Upload-Verzeichnis anlegen und dem node-user geben
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

# Nicht als root laufen
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "src/index.js"]
