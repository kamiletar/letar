#!/usr/bin/env bash
# pre-push-submodule-check.sh — блокирует push letar, если хоть один записанный в
# отправляемом коммите SHA submodule ещё не существует на origin этого submodule.
#
# Зачем: пуш bump'а SHA без пуша самого коммита submodule ломает НЕ приложение-виновника,
# а весь деплой сразу — `git submodule update --recursive` в deploy-affected.sh падает с
# `fatal: remote error: upload-pack: not our ref <sha>` до выбора приложения, и очередь
# деплоев встаёт целиком. За 2026-08-27…28 инцидент повторился минимум пять раз, каждый раз
# на новом SHA. Правило «сначала push submodule, потом bump» есть в .claude/rules/git.md, но
# держится на дисциплине: bump обычно делает не та сессия, которая закоммитила в submodule.
#
# Аварийный обход (push нужен срочно, последствия понятны):
#   GIT_ALLOW_UNPUSHED_SUBMODULES=1 git push
# Флаг не отключает проверку — он превращает блокировку в предупреждение, чтобы тот, кто
# снял барьер, всё равно увидел список того, что нужно дослать (тот же приём, что у
# GIT_ALLOW_MULTI_SCOPE_COMMIT в pre-commit-scope-guard.sh).
#
# Проверяются gitlink'и ВСЕХ коммитов отправляемого диапазона (push-check-01), не только конечного.
#
# ⚠️ Это НЕ то же самое, что штатный `git push --recurse-submodules=check`. Тот проверяет
# только submodule, ИЗМЕНЁННЫЕ в отправляемых ревизиях, и сверяется с локальными
# remote-tracking ветками, которые могут быть устаревшими. Здесь проверяются ВСЕ gitlink'и
# отправляемого коммита (в том числе отставший SHA, который кто-то запушил раньше и который
# ломает деплой прямо сейчас), а подозрительные до-проверяются реальным `git fetch`.
#
# Установка: scripts/hooks/install.sh

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# git запускает хук из корня рабочего дерева, но не будем на это полагаться.
TOPLEVEL="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
[[ -f "$TOPLEVEL/.gitmodules" ]] || exit 0

# Рабочая копия скрипта приоритетнее — правки в scripts/ применяются без переустановки хуков.
# Копия рядом с хуком (её кладёт install.sh) — фолбэк для чекаутов без каталога scripts/.
CHECKER=""
for candidate in "$TOPLEVEL/scripts/check-submodule-push-state.sh" "$DIR/_check-submodule-push-state.sh"; do
  if [[ -f "$candidate" ]]; then
    CHECKER="$candidate"
    break
  fi
done

if [[ -z "$CHECKER" ]]; then
  echo "⚠️  pre-push: check-submodule-push-state.sh не найден — проверка submodule пропущена" >&2
  echo "    (переустановить: bash scripts/hooks/install.sh)" >&2
  exit 0
fi

# stdin pre-push: <local ref> <local oid> <remote ref> <remote oid> по строке на каждую
# отправляемую ветку. Пустой stdin (push без ссылок, `--dry-run` без изменений) — нечего делать.
# Для каждой ветки собираем диапазон коммитов, а не один конечный коммит: промежуточный
# коммит мог записать gitlink на SHA, которого нет на origin (инцидент 2026-10-01: конечные
# SHA были на месте, а `git fetch --recurse-submodules` на сервере достал промежуточные).
ranges=()
while read -r _local_ref local_oid _remote_ref remote_oid; do
  [[ -z "${local_oid:-}" ]] && continue
  # Удаление ветки (`git push --delete`) — local oid из одних нулей, дерева нет.
  [[ "$local_oid" =~ ^0+$ ]] && continue
  if [[ -z "${remote_oid:-}" || "$remote_oid" =~ ^0+$ ]]; then
    # Новая ветка на remote: всё, чего ещё нет ни в одной ветке origin.
    range="$local_oid --not --remotes=origin"
  else
    range="$remote_oid..$local_oid"
  fi
  # Дедуп: несколько refs часто указывают на один диапазон.
  for seen in ${ranges[@]+"${ranges[@]}"}; do
    [[ "$seen" == "$range" ]] && continue 2
  done
  ranges+=("$range")
done

[[ ${#ranges[@]} -eq 0 ]] && exit 0

status=0
for range in "${ranges[@]}"; do
  bash "$CHECKER" --range "$range" || status=1
done

[[ $status -eq 0 ]] && exit 0

if [[ "${GIT_ALLOW_UNPUSHED_SUBMODULES:-0}" == "1" ]]; then
  echo "⚠️  ФЛАГ GIT_ALLOW_UNPUSHED_SUBMODULES снят — push уходит с неотправленными submodule (см. выше)." >&2
  echo "    Пока их не дошлёшь, деплой ЛЮБОГО приложения на сервере будет падать." >&2
  exit 0
fi

echo "" >&2
echo "⛔ push заблокирован pre-push хуком (scripts/hooks/pre-push-submodule-check.sh)." >&2
echo "   Запушь submodule командами выше и повтори push letar." >&2
echo "" >&2
echo "   Если push нужен срочно и последствия понятны:" >&2
echo "     GIT_ALLOW_UNPUSHED_SUBMODULES=1 git push" >&2
exit 1
