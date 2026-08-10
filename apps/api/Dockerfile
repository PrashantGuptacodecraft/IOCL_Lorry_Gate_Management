FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/database/package.json packages/database/package.json
RUN if [ -f package-lock.json ]; then npm ci --ignore-scripts; else npm install --ignore-scripts; fi

FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run db:generate
RUN npm run build -w @iocl/shared && npm run build -w @iocl/api

# Dedicated migration image keeps the Prisma CLI out of the API runtime image.
FROM builder AS migrator
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 migration
USER migration
CMD ["./node_modules/.bin/prisma", "migrate", "deploy", "--schema", "packages/database/prisma/schema.prisma"]

FROM builder AS production-deps
RUN npm prune --omit=dev --ignore-scripts

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 api
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
USER api
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
