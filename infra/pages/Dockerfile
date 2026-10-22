# Сервис страниц: зависимостей времени выполнения нет (Bun.serve и node:*), поэтому bun install не нужен.
# Тесты запускаются снаружи образа: `cd infra/pages && bun test` (часть тестов читает .claude/mcp/).
FROM oven/bun:1-alpine AS runtime
WORKDIR /app
COPY src/ ./src/
COPY tsconfig.json ./
ENV NODE_ENV=production
EXPOSE 3200
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3200/healthz || exit 1
CMD ["bun", "run", "src/server.ts"]
