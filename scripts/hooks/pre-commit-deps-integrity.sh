#!/usr/bin/env bash
# pre-commit-deps-integrity.sh — проверяет целостность зависимостей, но ТОЛЬКО
# когда коммит их вправду задевает.
#
# Зачем на коммит-пути, а не только в CI: `patchedDependencies` прибит к точной
# версии пакета, а сама зависимость стоит по caret-диапазону. Любой bump их
# разводит, и bun 1.3.14 при этом МОЛЧИТ — код 0, ни строки предупреждения,
# файл патча на диске, ключ в package.json на месте (PLAN-INFRA-4.md §118).
# Единственный след — блок `patchedDependencies` тихо пропадает из bun.lock, и в
# диффе lock-файла на тысячи строк его никто не замечает. Цена пропуска —
# возврат бага гидратации во все ~30 приложений сразу, без единой ошибки сборки,
# lint или typecheck (.claude/docs/chakra-css-memo-prop-order-hydration.md).
# CI это тоже ловит, но уже ПОСЛЕ коммита; расхождение возникает ровно в момент
# bump'а, поэтому дешевле сказать об этом сразу.
#
# Тот же класс, вторая его половина: НАМЕРЕННЫЕ точные пины версий
# (scripts/intentional-pins.json). Комментарий в JSON невозможен, поэтому пин,
# поставленный как фикс бага, ничем не отличается от отставшей версии — и
# обычный `/infra:deps-update` снимает его заодно. Так пин
# @tanstack/react-devtools@0.10.5 прожил неделю и был снят коммитом
# `9a65abe7 deps update`, вернув падение прод-сборки во все приложения —
# потребители @letar/query-provider (PLAN-INFRA-4.md §112 и §142). Момент снятия
# пина — это ровно коммит с package.json, то есть этот хук.
#
# ⚠️ Почему набор узкий. Это ПЯТЫЙ хук на коммит-пути (scope-guard, semgrep,
# dprint-check, sops — уже там), и утяжелять его дальше — осознанное решение
# владельца, а не «раз проверка есть, пусть запускается». Поэтому здесь:
#   * только самые быстрые проверки (~0.7 с суммарно);
#   * и только если в staged-наборе есть bun.lock или package.json.
# Обычный коммит по коду не платит ничего — хук выходит на первой же проверке.
# Медленные проверки (electron-drift 4.7 с, lib-subpath-paths 6.8 с) живут в CI
# и в ручном `bun scripts/check-all.mjs`.
#
# Обход для заведомо ломающего коммита (например промежуточный шаг миграции
# патча на новую версию):
#   GIT_SKIP_DEPS_INTEGRITY=1 git commit ...

set -uo pipefail

if [[ -n "${GIT_SKIP_DEPS_INTEGRITY:-}" ]]; then
  echo "ℹ️  проверка целостности зависимостей пропущена (GIT_SKIP_DEPS_INTEGRITY)" >&2
  exit 0
fi

# Только staged-файлы: непроиндексированная правка bun.lock в коммит не едет и
# блокировать его не должна.
staged="$(git diff --cached --name-only --diff-filter=ACMR)"

# Сдвиг указателя submodule (gitlink, режим 160000) — тоже повод: bump версии внутри
# submodule не может обновить корневой bun.lock, и это самый тихий источник дрейфа.
gitlink_staged="$(git diff --cached --raw | grep -cE '^:[0-9]+ 160000 ' || true)"

if ! grep -qE '(^|/)(bun\.lock|package\.json)$' <<< "$staged" && [[ "$gitlink_staged" -eq 0 ]]; then
  exit 0
fi

# Согласованность версий workspace в bun.lock с package.json
# (scripts/check-lock-workspace-versions.mjs). Отдельно от блока ниже, потому что
# политика другая:
#   * коммит САМОГО bun.lock с расхождением — блокируем: ровно тут lock и правят,
#     и ровно здесь в него попадает чужой WIP или половина обновления
#     (2026-09-21: рабочий lock нёс libs/deploy-mcp 0.4.1 при package.json 0.5.0);
#   * коммит package.json или указателя submodule — только предупреждаем. Lock и
#     package.json едут РАЗНЫМИ коммитами (scope-guard режет bun.lock + apps/<x>
#     как multi-scope), поэтому в момент bump'а расхождение неизбежно и
#     блокировать его нельзя — но забыть про lock после него нельзя тоже.
# Цена пропуска — встают деплои ВСЕХ приложений сразу
# (.claude/docs/bun-lock-drift-unpushed-commits-blocks-all-deploys.md).
lock_versions_check() {
  local root="$1" lock_staged="$2"
  [[ -f "$root/scripts/check-lock-workspace-versions.mjs" ]] || return 0
  local out
  if out="$(bun "$root/scripts/check-lock-workspace-versions.mjs" 2>&1)"; then
    return 0
  fi
  echo "$out" >&2
  if [[ "$lock_staged" -eq 1 ]]; then
    cat >&2 <<'MSG'

❌ Коммит остановлен: bun.lock, который ты коммитишь, расходится с package.json.
Обход (осознанный промежуточный шаг): GIT_SKIP_DEPS_INTEGRITY=1 git commit ...
MSG
    return 1
  fi
  cat >&2 <<'MSG'

⚠️  Не блокирую (lock коммитится отдельным коммитом), но НЕ забудь: после этого
    коммита нужен коммит bun.lock — иначе `--frozen-lockfile` на сервере
    остановит деплой ВСЕХ приложений. Если версия выросла в submodule — сначала
    запушь submodule, потом lock (bash scripts/check-submodule-push-state.sh).
MSG
  return 0
}

lock_staged=0
grep -qE '(^|/)bun\.lock$' <<< "$staged" && lock_staged=1

# Проверки читают bun.lock и node_modules КОРНЯ монорепо. Внутри submodule
# (собственный .git, куда install.sh ставит те же хуки) ни того, ни другого нет —
# зависимости там общие, из корня. Полный набор запускать нечего, но и молча
# «проходить» нельзя: сюда мы попадаем только когда package.json ВСЁ-ТАКИ
# застейджен, и тихий успех в этом месте читался бы как «проверено и чисто»
# (.claude/docs/verification-pitfalls.md). Поэтому говорим вслух. А расхождение
# версий с корневым bun.lock — именно тот случай, ради которого сюда стоит зайти:
# bump версии внутри submodule не может обновить lock, который лежит в корне letar.
super_root="$(git rev-parse --show-superproject-working-tree 2>/dev/null)"
if [[ -n "$super_root" ]]; then
  echo "ℹ️  package.json внутри submodule — целостность зависимостей проверяется" >&2
  echo "    в корне монорепо: bun scripts/check-all.mjs --group=deps" >&2
  if command -v bun > /dev/null 2>&1; then
    lock_versions_check "$super_root" 0
  fi
  exit 0
fi

repo_root="$(git rev-parse --show-toplevel)"

if ! command -v bun > /dev/null 2>&1; then
  echo "⚠️  bun не найден в PATH — проверка целостности зависимостей пропущена." >&2
  echo "    Прогони вручную перед push: bun scripts/check-all.mjs --group=deps" >&2
  exit 0
fi

# Указатель submodule без lock/package.json: остальным проверкам тут нечего делать.
if [[ "$lock_staged" -eq 0 ]] && ! grep -qE '(^|/)package\.json$' <<< "$staged"; then
  lock_versions_check "$repo_root" 0
  exit 0
fi

echo "🔍 в коммите есть bun.lock/package.json — проверяю целостность зависимостей…" >&2

if ! bun "$repo_root/scripts/check-all.mjs" --only=patched-deps,peer-deps,intentional-pins; then
  cat >&2 <<'MSG'

❌ Коммит остановлен: gate-проверка целостности зависимостей не прошла.

Что делать — см. вывод выше: для патчей /infra:deps-update § «Пропатченные
пакеты» (пересоздание через `bun patch`), для пинов — поле «снимать можно,
когда» у записи в scripts/intentional-pins.json.

Если коммит ломает проверку осознанно (промежуточный шаг миграции патча):
  GIT_SKIP_DEPS_INTEGRITY=1 git commit ...
MSG
  exit 1
fi

lock_versions_check "$repo_root" "$lock_staged" || exit 1

exit 0
