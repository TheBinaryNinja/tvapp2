# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# docker/app.Dockerfile — TVApp2 "app stack" image (iflip721/tvapp2-app-stack)
#
# Three-stage build:
#   1) spa-build    — Vue 3 + Vite SPA  → /spa/dist        (root package.json)
#   2) server-build — Express API (tsc) → /server/dist     (server/package.json)
#   3) runtime      — prod-only Node; serves API + built SPA on :3000
#
# Runtime layout (must match server/src/index.ts publicDir and sources/paths.ts SEED_SOURCES_DIR):
#   /app/dist/        compiled server  (dist/index.js, dist/sources/paths.js)
#   /app/public/      built SPA        (resolve(<dist>,'..','public')              => /app/public)
#   /app/seed-data/   source bundles   (resolve(<dist>,'..','..','seed-data','sources'))
#   /app/package.json server pkg (type:module) + node_modules (express, mongoose only)
#
# Node pin: 22.11.0 LTS "Jod" on alpine 3.20 — keep in lockstep with CLAUDE.md.
# -----------------------------------------------------------------------------
ARG NODE_IMAGE=node:22.11.0-alpine3.20

# ---- Stage 1: build the SPA (root package) ----------------------------------
FROM ${NODE_IMAGE} AS spa-build
WORKDIR /spa
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.node.json vite.config.ts index.html ./
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build                       # vue-tsc -b && vite build -> /spa/dist

# ---- Stage 2: build the server (server package) -----------------------------
FROM ${NODE_IMAGE} AS server-build
WORKDIR /server
COPY server/package.json server/package-lock.json ./
RUN npm ci                              # devDeps (typescript) needed to compile
COPY server/tsconfig.json ./
COPY server/src/ ./src/
RUN npm run build                       # tsc -p .  -> /server/dist

# ---- Stage 3: runtime -------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    TVAPP2_CONFIG=/etc/tvapp2/config.json
WORKDIR /app

# tini = correct PID 1 (forwards SIGTERM/SIGINT to the graceful-shutdown handler in index.ts).
RUN apk add --no-cache tini

# Prod-only server deps (express, mongoose).
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled server + built SPA + committed seed bundles.
COPY --from=server-build /server/dist  ./dist
COPY --from=spa-build    /spa/dist     ./public
COPY server/seed-data                  ./seed-data

USER node
EXPOSE 3000

# Liveness: HTTP server up (body also reports mongo connected/disconnected).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
