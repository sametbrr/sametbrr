FROM node:24.22.1-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Optional notification service: build with --target patates-worker.
# Mount the same persistent /app/data directory in both services.
FROM base AS patates-worker
ENV NODE_ENV=production PATATES_DB_PATH=/app/data/patates.sqlite
COPY --from=deps /app/node_modules ./node_modules
COPY src/lib/patates/database.mjs src/lib/patates/scheduler.mjs ./src/lib/patates/
COPY scripts/patates/worker.mjs ./scripts/patates/worker.mjs
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs && mkdir -p /app/data && chown nextjs:nodejs /app/data
USER nextjs
CMD ["node", "scripts/patates/worker.mjs"]

FROM node:24.22.1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PATATES_DB_PATH=/app/data/patates.sqlite
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs && mkdir -p /app/data && chown nextjs:nodejs /app/data
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
