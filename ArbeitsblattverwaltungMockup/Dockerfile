# =============================================================================
# Multi-Stage Dockerfile fuer das Vite-Frontend
#
#   Stage "dev"  -> Vite Dev-Server mit Hot Reload (Standard in docker-compose)
#   Stage "prod" -> gebautes dist/ + Nginx
# =============================================================================

# -----------------------------------------------------------------------------
# Dependencies (einmalig gebaut, in beiden Stages wiederverwendet)
# -----------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.3 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 1: Development
# -----------------------------------------------------------------------------
FROM node:22-alpine AS dev
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.3 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 8443
CMD ["pnpm", "dev"]

# -----------------------------------------------------------------------------
# Stage 2: Production Build
# -----------------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.3 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG VITE_API_URL=http://localhost:3001/api
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm build

# -----------------------------------------------------------------------------
# Stage 3: Nginx
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost/ >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
