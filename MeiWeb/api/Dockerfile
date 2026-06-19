FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 apiuser

COPY --from=deps /app/node_modules ./node_modules
COPY . .

USER apiuser

EXPOSE 4000

CMD ["node", "src/server.js"]
