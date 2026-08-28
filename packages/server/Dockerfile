# ── Base ──────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# Chromium for Puppeteer (PDF export, src/utils/pdf.ts) - Alpine's own
# chromium package instead of Puppeteer's bundled download, which doesn't
# run reliably on Alpine's musl libc.
RUN apk add --no-cache chromium nss freetype freetype-dev harfbuzz \
  ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package.json package-lock.json ./
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci

# ── Development ───────────────────────────────────
FROM base AS dev
COPY . .
WORKDIR /app/packages/server
CMD ["npm", "run", "dev"]

# ── Build ──────────────────────────────────────────
FROM base AS build
COPY . .
RUN npm run build -w packages/shared && npm run build -w packages/server

# ── Production ─────────────────────────────────────
FROM node:20-alpine AS prod
WORKDIR /app
RUN apk add --no-cache chromium nss freetype freetype-dev harfbuzz \
  ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=build /app/packages/server/dist ./dist
COPY --from=build /app/packages/server/assets ./assets
COPY --from=build /app/packages/server/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/packages/server/drizzle ./drizzle
COPY --from=build /app/packages/server/package.json ./package.json
# npm workspaces symlinks @sicot/shared inside node_modules to ../../packages/shared -
# that target doesn't exist in this stage, so replace the (now-dangling) symlink
# with the real built output before it's required at runtime.
COPY --from=build /app/node_modules ./node_modules
RUN rm -rf ./node_modules/@sicot/shared
COPY --from=build /app/packages/shared/dist ./node_modules/@sicot/shared/dist
COPY --from=build /app/packages/shared/package.json ./node_modules/@sicot/shared/package.json

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
