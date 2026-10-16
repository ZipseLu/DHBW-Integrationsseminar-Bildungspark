# =============================================================================
# Playwright-Testcontainer.
#
# Das offizielle Image bringt die BROWSER mit, aber nicht das npm-Paket
# @playwright/test. Ohne dieses Dockerfile fehlt im Container das
# node_modules und `playwright test` laeuft ins Leere.
#
# WICHTIG: Die Image-Version MUSS mit der Version in package.json
#          ("@playwright/test") uebereinstimmen – sonst sucht der Client
#          nach einem Browser-Binary, das es in diesem Image nicht gibt.
#          Beide Stellen beim Upgrade gemeinsam anpassen.
# =============================================================================
FROM mcr.microsoft.com/playwright:v1.49.1-noble

WORKDIR /e2e

ENV CI=true
ENV PLAYWRIGHT_BASE_URL=http://frontend:5173
ENV PLAYWRIGHT_API_URL=http://backend:3000

# `npm ci` installiert exakt die Version aus dem Lockfile
COPY package*.json ./
RUN npm ci

COPY . .
