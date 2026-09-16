FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1-alpine AS runtime
# ffmpeg из Alpine; нужные воркеру фильтры и декодеры проверяются сразу после установки
COPY check-ffmpeg.sh /usr/local/bin/check-ffmpeg.sh
RUN apk add --no-cache ffmpeg && sh /usr/local/bin/check-ffmpeg.sh
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
COPY tsconfig.json ./
# API по умолчанию; worker запускается через command override в docker-compose
CMD ["bun", "run", "src/server.ts"]

# Регрессия транскода на том же ffmpeg, что в проде. В деплой не входит — compose собирает
# стадию runtime. Запуск: docker build --target test infra/media-server
FROM runtime AS test
COPY test/ ./test/
RUN bun test
