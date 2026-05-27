# ─── Builder Stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache openssl

# Copy package files first for layer caching
COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

# Copy Prisma schema and config, generate client
COPY prisma/ ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy application source
COPY . .

# Build Next.js application
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Runner Stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install runtime dependencies
RUN apk add --no-cache openssl

# Copy built assets from builder (using --chown to set permissions)
COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/next.config.ts ./
COPY --chown=nextjs:nodejs --from=builder /app/package.json ./package.json
COPY --chown=nextjs:nodejs --from=builder /app/.next ./.next
COPY --chown=nextjs:nodejs --from=builder /app/prisma ./prisma
COPY --chown=nextjs:nodejs --from=builder /app/src/generated ./src/generated
COPY --chown=nextjs:nodejs --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["npm", "run", "start"]
