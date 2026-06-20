FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
COPY tsconfig.json ./
# API по умолчанию; worker запускается через command override в docker-compose
CMD ["bun", "run", "src/server.ts"]
