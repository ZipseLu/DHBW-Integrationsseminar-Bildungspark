# =============================================================================
# Multi-Stage Dockerfile fuer das Vue-Frontend
#   Stage "dev"  – Vite-Dev-Server mit Hot Reload
#   Stage "prod" – gebautes dist/ + Nginx
# =============================================================================

# -----------------------------------------------------------------------------
# Abhaengigkeiten
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# -----------------------------------------------------------------------------
# Build
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Vite liest Variablen mit demPraefix VITE_ beim Build – NICHT zur Laufzeit.
ARG VITE_API_URL=""
ARG VITE_ALLOWED_HOSTS="false"
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ALLOWED_HOSTS=$VITE_ALLOWED_HOSTS

RUN npm run build

# -----------------------------------------------------------------------------
# Development
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS dev
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# -----------------------------------------------------------------------------
# Produktion: Nginx
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
# 'localhost' NICHT verwenden: busybox-wget loest zuerst auf ::1 (IPv6) auf,
# Nginx lauscht hier aber nur auf IPv4 -> "Connection refused".
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
