FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
COPY apps/admin/package.json ./apps/admin/
COPY apps/mobile/package.json ./apps/mobile/

# Install all dependencies (needs workspaces)
RUN npm ci --include=dev

# Copy source
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

# Generate Prisma client + build
RUN npx prisma generate --schema=apps/server/prisma/schema.prisma
RUN npm run build --workspace=apps/server

# Start — baseline existing migration (already in DB via db push), deploy new ones, boot
CMD ["sh", "-c", "npx prisma migrate resolve --applied 20260311000000_add_push_token --schema=apps/server/prisma/schema.prisma 2>&1 || true && npx prisma migrate deploy --schema=apps/server/prisma/schema.prisma && node apps/server/dist/apps/server/src/index.js"]
