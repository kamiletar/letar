#!/usr/bin/env bash
# pre-push-lock-versions-check.sh — блокирует push ветки main, если в отправляемом коммите
# версии workspace в bun.lock не совпадают с package.json по ЗАПИСАННОМУ состоянию
# (package.json submodule — по SHA gitlink'а этого же коммита).
#
# Зачем: `bun install --frozen-lockfile` на сервере падает при любом расхождении, и встают
# деплои ВСЕХ приложений (.claude/docs/bun-lock-drift-unpushed-commits-blocks-all-deploys.md).
# 2026-10-06: letar ушёл на origin с новым SHA submodule и СТАРОЙ версией в bun.lock — коммит
# lock молча не состоялся, цепочка команд дошла до push; ~2 минуты origin/main был несогласован.
# pre-commit такое не ловит по построению (lock и bump едут РАЗНЫМИ коммитами и только
# предупреждают), поэтому последний рубеж — push.
#
# Проверяется ВЕРШИНА пушимого коммита, а не каждый коммит диапазона: промежуточное состояние
# законно расходится (bump и lock — раздельные коммиты, scope-guard режет их вместе), а на
# origin важен итог. Только `refs/heads/main`: деплой идёт с него, а рабочие ветки не должны
# упираться в чужие расхождения.
#
# Аварийный обход (последствия понятны):
#   GIT_ALLOW_LOCK_VERSION_DRIFT=1 git push
# Флаг превращает блокировку в предупреждение со списком расхождений (тот же приём, что у
# GIT_ALLOW_UNPUSHED_SUBMODULES в pre-push-submodule-check.sh).
#
# stdin — строки pre-push: <local ref> <local oid> <remote ref> <remote oid>.
# Установка: scripts/hooks/install.sh

set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TOPLEVEL="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
# Внутри submodule корневого bun.lock нет — проверять нечего.
[[ -f "$TOPLEVEL/bun.lock" && -f "$TOPLEVEL/.gitmodules" ]] || exit 0

# Рабочая копия скрипта приоритетнее (правки применяются без переустановки хуков);
# копия рядом с хуком (её кладёт install.sh) — фолбэк.
CHECKER=""
for candidate in "$TOPLEVEL/scripts/check-lock-workspace-versions.mjs" "$DIR/_check-lock-workspace-versions.mjs"; do
  if [[ -f "$candidate" ]]; then
    CHECKER="$candidate"
    break
  fi
done

if [[ -z "$CHECKER" ]]; then
  echo "⚠️  pre-push: check-lock-workspace-versions.mjs не найден — сверка bun.lock пропущена" >&2
  echo "    (переустановить: bash scripts/hooks/install.sh)" >&2
  exit 0
fi

if ! command -v bun > /dev/null 2>&1; then
  echo "⚠️  pre-push: bun не найден в PATH — сверка bun.lock пропущена." >&2
  echo "    Прогони вручную: bun scripts/check-lock-workspace-versions.mjs --ref=HEAD" >&2
  exit 0
fi

status=0
while read -r _local_ref local_oid remote_ref _remote_oid; do
  [[ -z "${local_oid:-}" ]] && continue
  [[ "$local_oid" =~ ^0+$ ]] && continue
  [[ "${remote_ref:-}" == "refs/heads/main" ]] || continue

  out="$(LOCK_CHECK_REPO_ROOT="$TOPLEVEL" bun "$CHECKER" "--ref=$local_oid" 2>&1)"
  rc=$?
  # Вслух и при успехе, если покрытие неполное: тихий зелёный читался бы как «проверено».
  if [[ $rc -ne 0 || "$out" == *"неполное покрытие"* ]]; then
    echo "$out" >&2
  fi
  if [[ $rc -eq 1 ]]; then
    status=1
  elif [[ $rc -ne 0 ]]; then
    echo "⚠️  pre-push: сверка bun.lock не смогла прочитать состояние (код $rc) — push не блокирую, проверь вручную." >&2
  fi
done

[[ $status -eq 0 ]] && exit 0

if [[ "${GIT_ALLOW_LOCK_VERSION_DRIFT:-0}" == "1" ]]; then
  echo "⚠️  ФЛАГ GIT_ALLOW_LOCK_VERSION_DRIFT снят — push уходит с расходящимся bun.lock (см. выше)." >&2
  echo "    Пока lock не поправлен, деплой ЛЮБОГО приложения на сервере будет падать." >&2
  exit 0
fi

echo "" >&2
echo "⛔ push заблокирован pre-push хуком (scripts/hooks/pre-push-lock-versions-check.sh)." >&2
echo "   Поправь bun.lock (bun install --lockfile-only — только в чистом дереве), закоммить" >&2
echo "   отдельным коммитом и повтори push." >&2
echo "" >&2
echo "   Если push нужен срочно и последствия понятны:" >&2
echo "     GIT_ALLOW_LOCK_VERSION_DRIFT=1 git push" >&2
exit 1
