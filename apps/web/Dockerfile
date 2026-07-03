# Dibangun dengan build context = ROOT monorepo (bukan apps/web) karena
# workspace butuh akses ke packages/shared. Jalankan:
#   docker build -f apps/web/Dockerfile -t bpom-web .   (dari root repo)
FROM node:22-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /repo
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --filter @bpom/web...

FROM base AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules
COPY packages/shared packages/shared
COPY apps/web apps/web
COPY package.json pnpm-workspace.yaml ./
ENV NEXT_PUBLIC_API_URL=http://localhost:8000/api
RUN pnpm --filter @bpom/web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/web/public ./public
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
