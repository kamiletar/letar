#!/bin/bash
# Готовит хостовые bind-mount каталоги сервиса `app` к записи рантайм-пользователем образа.
#
# Зачем: Next.js-образы монорепо бегут от `nextjs` (uid 1001, gid 65533), а каталоги загрузок
# (`./uploads`, `./private-uploads`, `./print-sources`…) на хосте заводит `deploy` (uid 1000) —
# или, если каталога нет, сам `docker compose` создаёт его от root. В обоих случаях контейнеру
# достаются права `other` (r-x) и любая запись падает EACCES. Разбор —
# .claude/docs/docker-bind-mount-uid-gid-mismatch.md.
#
# Что делает для каждого относительного bind-mount (`- ./X:/путь`, без `:ro`) сервиса `app`:
#   1. `mkdir -p` от текущего пользователя (deploy) — чтобы каталог не создал compose от root;
#   2. во временном контейнере из ТОГО ЖЕ образа приложения, но от root: всё, что не принадлежит
#      рантайм-пользователю образа, переводит на `<uid>:<gid deploy>` + `ug+rwX`. Образ уже
#      локальный — ничего не тянем из сети (alpine с Docker Hub на s1/s3 доступен не всегда);
#   3. проверяет запись вторым контейнером уже от пользователя образа по умолчанию — ровно так,
#      как будет писать приложение.
#
# Через контейнер, а не `sudo chown`: деплой бежит от deploy без root, а доступ к docker у него есть.
# Сервисы кроме `app` (db, redis) не трогаем: у postgres свой uid, чужой chown сломал бы БД.
#
# Использование: ensure-writable-mounts.sh <каталог приложения> <compose-файл> <образ>
# Код выхода: 0 — всё пишется (или нечего готовить), 1 — хотя бы один каталог не пишется.

set -uo pipefail

APP_DIR="${1:?каталог приложения}"
COMPOSE_FILE="${2:?compose-файл}"
IMAGE="${3:?образ}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

compose_path="${APP_DIR}/${COMPOSE_FILE}"
[ -f "$compose_path" ] || { echo -e "${RED}❌ Нет ${compose_path}${NC}"; exit 1; }

# Относительные bind-mount сервиса app. Сервис определяется по top-level ключу с отступом ровно
# 2 пробела — тот же якорь, что в pre-migrate dump (иначе матчится вложенный `depends_on.app`).
# Комментарии отбрасываются; `:ro` пропускается — туда контейнер не пишет.
mapfile -t MOUNTS < <(
  awk '
    /^[[:space:]]*#/ { next }
    /^  [A-Za-z0-9_-]+:[[:space:]]*$/ { svc = $1; sub(/:$/, "", svc); next }
    svc == "app" {
      # Кавычки снимаем ДО сравнения: `- "./x:/y"` — тоже валидная запись
      line = $0
      gsub(/["\047]/, "", line)
      if (line !~ /^[[:space:]]*-[[:space:]]*\.\/[^:]+:[^:]+/) next
      sub(/^[[:space:]]*-[[:space:]]*/, "", line)
      sub(/[[:space:]]+#.*$/, "", line)
      n = split(line, parts, ":")
      if (n >= 3 && parts[3] ~ /(^|,)ro(,|$)/) next
      print parts[1]
    }
  ' "$compose_path"
)

if [ "${#MOUNTS[@]}" -eq 0 ]; then
  exit 0
fi

if ! docker image inspect "$IMAGE" > /dev/null 2>&1; then
  echo -e "${RED}❌ Образ ${IMAGE} не найден локально — не могу выставить права на bind-mount${NC}"
  exit 1
fi

# Пользователь, от которого бежит образ. Пусто/root — образ пишет куда угодно, готовить нечего
# (так у dashboard: USER закомментирован).
image_user=$(docker image inspect -f '{{.Config.User}}' "$IMAGE" 2> /dev/null || echo "")
image_user="${image_user%%:*}"
if [ -z "$image_user" ] || [ "$image_user" = "root" ] || [ "$image_user" = "0" ]; then
  exit 0
fi

# gid хостового deploy — чтобы бэкапы и обслуживание по SSH сохранили доступ к файлам.
# Для записи из контейнера важен только uid.
host_gid=$(id -g)

rc=0
for rel in "${MOUNTS[@]}"; do
  rel="${rel#./}"
  host_dir="$(cd "$APP_DIR" && pwd)/${rel}"
  mkdir -p "$host_dir" || { echo -e "${RED}❌ mkdir ${host_dir} не удался${NC}"; rc=1; continue; }

  # uid резолвится внутри образа по имени пользователя — не зашиваем 1001 в скрипт.
  # `! -user` — трогаем только чужие файлы: полный chown -R по тысячам картинок на каждом
  # деплое не нужен, а find без совпадений почти бесплатен.
  fixed=$(docker run --rm --user 0:0 --entrypoint sh --network none \
    -v "${host_dir}:/mnt/target" "$IMAGE" -c '
      uid=$(id -u "$1") || exit 2
      find /mnt/target ! -user "$uid" -print | wc -l
      find /mnt/target ! -user "$uid" -exec chown "$uid:$2" {} + -exec chmod ug+rwX {} +
    ' sh "$image_user" "$host_gid" 2>&1)
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Не удалось выставить владельца ${host_dir}: ${fixed}${NC}"
    rc=1
    continue
  fi
  fixed=$(printf '%s' "$fixed" | tail -1 | tr -d '[:space:]')
  if [ "${fixed:-0}" != "0" ]; then
    echo -e "${YELLOW}🔧 ${rel}: исправлен владелец, объектов: ${fixed} → ${image_user}:${host_gid}${NC}"
  fi

  # Живая проверка от пользователя образа по умолчанию — как будет писать приложение
  if docker run --rm --entrypoint sh --network none -v "${host_dir}:/mnt/target" "$IMAGE" \
    -c 'f=/mnt/target/.write-probe-$$ && touch "$f" && rm "$f"' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ${rel}: запись от ${image_user} работает${NC}"
  else
    echo -e "${RED}❌ ${rel}: ${image_user} не может писать в ${host_dir} даже после chown${NC}"
    rc=1
  fi
done

exit $rc
