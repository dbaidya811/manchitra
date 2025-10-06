# Multi-stage Dockerfile for Next.js (Node 20)
# Uses a simple runtime (next start) to avoid requiring standalone output changes

FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# Optional: openssl is commonly required by auth libs (e.g., NextAuth)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
  && rm -rf /var/lib/apt/lists/*

# 1) Dependencies layer
FROM base AS deps
# Copy lockfiles if present for deterministic installs
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
# Support npm/yarn/pnpm; cache npm dir to speed up repeated builds
RUN --mount=type=cache,target=/root/.npm \
  if [ -f package-lock.json ]; then \
    npm ci; \
  elif [ -f yarn.lock ]; then \
    corepack enable && yarn install --frozen-lockfile; \
  elif [ -f pnpm-lock.yaml ]; then \
    corepack enable && pnpm install --frozen-lockfile; \
  else \
    npm install; \
  fi

# 2) Builder layer
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build Next.js app
RUN npm run build

# 3) Runner layer
FROM base AS runner
ENV NEXT_TELEMETRY_DISABLED=1
# Create non-root user
RUN useradd -m nextjs
USER nextjs

# Copy only the necessary runtime artifacts
COPY --chown=nextjs:nextjs --from=builder /app/package.json ./
COPY --chown=nextjs:nextjs --from=builder /app/next.config.* ./
COPY --chown=nextjs:nextjs --from=builder /app/public ./public
COPY --chown=nextjs:nextjs --from=builder /app/.next ./.next
COPY --chown=nextjs:nextjs --from=deps /app/node_modules ./node_modules

# If you serve on a different port, change this and the start command accordingly
EXPOSE 3000

# Default command starts the Next.js server
CMD ["npm", "run", "start"]
