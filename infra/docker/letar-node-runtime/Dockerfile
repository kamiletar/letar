# Общий runner-стейдж для Next.js standalone-приложений монорепо (PLAN-INFRA-4.md §129).
# Собирает в один образ то, что раньше дублировалось построчно в 20 из 22 Dockerfile.production:
# node:24-alpine + zoneinfo (для TZ без `apk add tzdata`, см.
# .claude/docs/docker-prune-cold-layer-network-flake.md) + пользователи nodejs/nextjs (uid/gid 1001).
#
# Приложение наследует его строкой `FROM letar-node-runtime:24 AS runner` вместо повторения
# этого блока — остальная часть Dockerfile.production (COPY standalone/static/public, EXPOSE,
# CMD) не меняется.
FROM node:24-slim AS tz

FROM node:24-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=tz /usr/share/zoneinfo /usr/share/zoneinfo
ENV TZ=Europe/Moscow

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
