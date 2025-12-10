FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
    if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN \
    if [ -f yarn.lock ]; then yarn run build; \
    elif [ -f package-lock.json ]; then npm run build; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

# Create data directory and set permissions (ensure it exists for volume mount points)
RUN mkdir -p /app/data && chown -R node:node /app/data

# Use existing 'node' user (UID 1000) to align with standard host users (like 'pi')
# This prevents permission issues with bind mounts
USER node

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown node:node .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Install Prisma CLI for migrations in runner
# We need this because 'prisma' is a dev dependency, effectively pruned in production image
# But we need it for 'migrate deploy'
COPY --from=deps /app/node_modules ./node_modules
# Actually, copying all node_modules from deps (which includes dev deps) is huge. 
# Better to just install prisma globally or locally in runner if needed, OR relies on the fact that if we copy from deps we get everything.
# The 'builder' stage copies from 'deps', builds, and then 'runner' copies standalone.
# Standalone does NOT include dev dependencies (like prisma CLI).

# Let's install prisma specifically in runner or copy from deps if acceptable size.
# A lighter way is to install just the CLI in runner.
RUN npm install prisma --save-dev

# Fix permissions so node user can run prisma (which might download engines or write logs)
RUN chown -R node:node /app/node_modules

COPY prisma ./prisma
COPY start.sh ./
USER root
RUN chmod +x start.sh && chown node:node start.sh
USER node

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["./start.sh"]
