#!/usr/bin/env bash
# check-submodule-push-state.sh — проверяет, что SHA каждого submodule, записанный в коммите
# letar, реально существует на origin ЭТОГО submodule.
#
# Зачем: коммит в letar фиксирует submodule указателем на SHA (gitlink). Если сам коммит
# submodule не запушен, а bump SHA в letar — запушен, то любой клон, который тянет letar,
# не может выкачать submodule:
#
#   fatal: remote error: upload-pack: not our ref <sha>
#
# На сервере это происходит внутри `git submodule update --recursive` в deploy-affected.sh —
# то есть ДО выбора приложения. Встаёт очередь деплоев целиком, включая приложения, к которым
# виновный submodule отношения не имеет. За 2026-08-27…28 инцидент повторился минимум пять раз
# (сообщения 822/845/847 deploy-agent-dev + два разбора вручную ночью 28-го).
#
# Правило «сначала push submodule, потом bump SHA в letar» записано в .claude/rules/git.md, но
# держится только на дисциплине: bump часто делает одна сессия, а коммит внутри submodule
# принадлежит другой, которая его ещё не запушила. Этот скрипт — технический барьер вместо
# дисциплины; на push его вешает scripts/hooks/pre-push-submodule-check.sh.
#
# Использование:
#   bash scripts/check-submodule-push-state.sh             # проверить HEAD
#   bash scripts/check-submodule-push-state.sh origin/main # проверить произвольный коммит
#
# Код возврата 1, если хоть один SHA не найден на origin — это gate, а не отчёт
# (как scripts/check-patched-deps.mjs, в отличие от scripts/check-peer-deps.mjs).
#
# ── Почему проверка двухступенчатая (замер 2026-08-28, 14 submodule) ──────────────────────
#   * локальный `git for-each-ref --contains` по всем 14 submodule — 2.0 c, без сети;
#   * сетевой `git ls-remote origin` / `git fetch origin` — 2.4 c НА КАЖДЫЙ submodule,
#     то есть ~34 c, если гнать их подряд по всем.
# Поэтому сначала идёт быстрый локальный проход, и только подозрительные submodule
# до-проверяются сетью — причём все разом, параллельными `git fetch` (разные репозитории,
# гонки между ними нет). Здоровое дерево стоит 2 секунды и не ходит в сеть вообще; сеть
# включается ровно там, где иначе можно было бы поднять ложную тревогу на устаревшем
# remote-tracking ref.
#
# ⚠️ `git ls-remote` как единственный источник правды не годится: он показывает только вершины
# веток, а искомый SHA обычно предок вершины. Отсюда `fetch` + `--contains`, а не сравнение с
# выводом ls-remote.
#
# Чего проверка НЕ ловит: если кто-то сделал force-push в submodule и снёс коммит, который
# наш remote-tracking ref всё ещё содержит, — быстрый проход скажет «ок». Это осознанный
# размен: force-push и так запрещён правилами (.claude/rules/git.md).

set -uo pipefail

REV="${1:-HEAD}"

TOPLEVEL="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "не git-репозиторий — нечего проверять" >&2
  exit 0
}
cd "$TOPLEVEL" || exit 1

if [[ ! -f .gitmodules ]]; then
  echo "submodule в этом репозитории нет — проверять нечего"
  exit 0
fi

if ! git rev-parse --verify --quiet "$REV^{commit}" >/dev/null; then
  echo "⛔ не удалось разрешить коммит '$REV'" >&2
  exit 1
fi

# Что записано в уже запушенном origin/main — чтобы отличить «этот push вносит новый SHA»
# от «SHA уже лежит в origin/main и ломает деплой прямо сейчас». Разные строки в отчёте:
# второе — не вина того, кто сейчас пушит, но чинится тем же действием.
ORIGIN_REF=""
for candidate in origin/main origin/master; do
  if git rev-parse --verify --quiet "$candidate" >/dev/null; then
    ORIGIN_REF="$candidate"
    break
  fi
done

# Список submodule берём из ДЕРЕВА проверяемого коммита, а не из .gitmodules: важен именно
# записанный gitlink (mode 160000), а .gitmodules может отставать или содержать путь, которого
# в этом коммите ещё/уже нет. Один `ls-tree -r` вместо вызова на каждый путь — на Windows
# запуск процесса стоит ~0.2 c, и 14 лишних вызовов заметны в pre-push хуке.
mapfile -t GITLINKS < <(git ls-tree -r "$REV" | awk '$1 == "160000" { print $3 "\t" substr($0, index($0, "\t") + 1) }')

# Записан ли SHA в какой-нибудь ветке origin ЭТОГО submodule.
# Специально refs/remotes/origin/, а не `git branch -r`: у submodule может быть добавлен
# второй remote (форк, зеркало), и коммит, лежащий только там, не считается запушенным.
contained_on_origin() {
  local sm_path="$1" sha="$2"
  local found
  found="$(git -C "$sm_path" for-each-ref --contains "$sha" --format='%(refname:short)' refs/remotes/origin/ 2>/dev/null)"
  [[ -n "$found" ]]
}

warnings=()
suspect_paths=()
suspect_shas=()
checked=0

# ── Проход 1: локальный, без сети ────────────────────────────────────────────────────────
# В норме это один вызов git на submodule. Разбор «почему не получилось» (не инициализирован,
# SHA нет локально) стоит ещё двух вызовов, но выполняется только в редкой ветке отказа.
for link in "${GITLINKS[@]}"; do
  [[ -z "$link" ]] && continue
  sha="${link%%$'\t'*}"
  sm_path="${link#*$'\t'}"
  [[ -z "$sha" || -z "$sm_path" ]] && continue

  if contained_on_origin "$sm_path" "$sha"; then
    checked=$((checked + 1))
    continue
  fi

  if ! git -C "$sm_path" rev-parse --git-dir >/dev/null 2>&1; then
    warnings+=("$sm_path — submodule не инициализирован, проверить нечем (git submodule update --init -- $sm_path)")
    continue
  fi

  if ! git -C "$sm_path" cat-file -e "$sha^{commit}" 2>/dev/null; then
    warnings+=("$sm_path — SHA $sha не найден даже локально; выкачай его (git -C $sm_path fetch origin) и повтори проверку")
    continue
  fi

  checked=$((checked + 1))
  suspect_paths+=("$sm_path")
  suspect_shas+=("$sha")
done

# ── Проход 2: сеть, только по подозрительным, параллельно ────────────────────────────────
# Коммит мог быть запушен из другого клона — тогда локальный remote-tracking просто устарел,
# и блокировать push было бы ложной тревогой.
if [[ ${#suspect_paths[@]} -gt 0 ]]; then
  echo "🔎 ${#suspect_paths[@]} submodule не подтвердились локально — сверяюсь с origin (сеть)..." >&2
  for sm_path in "${suspect_paths[@]}"; do
    git -C "$sm_path" fetch --quiet --no-tags origin 2>/dev/null &
  done
  wait
fi

# ── Проход 3: повторная проверка подозрительных + сборка отчёта ──────────────────────────
problems=()
for i in "${!suspect_paths[@]}"; do
  sm_path="${suspect_paths[$i]}"
  sha="${suspect_shas[$i]}"

  contained_on_origin "$sm_path" "$sha" && continue

  # Подсказываем ТОЧНУЮ команду: она разная в зависимости от того, лежит ли SHA на локальной
  # ветке submodule (обычный случай — сессия закоммитила и не запушила) или он висит сам по
  # себе (detached HEAD, чужой чекаут).
  local_branches="$(git -C "$sm_path" for-each-ref --contains "$sha" --format='%(refname:short)' refs/heads/ 2>/dev/null | tr '\n' ' ')"
  if [[ " $local_branches" == *" main "* ]]; then
    fix_cmd="git -C $sm_path push origin main"
  elif [[ -n "${local_branches// /}" ]]; then
    fix_cmd="git -C $sm_path push origin ${local_branches%% *}:refs/heads/main"
  else
    fix_cmd="git -C $sm_path push origin $sha:refs/heads/main"
  fi

  origin_note=""
  if [[ -n "$ORIGIN_REF" ]]; then
    origin_entry="$(git ls-tree "$ORIGIN_REF" -- "$sm_path" 2>/dev/null | awk '{print $3}')"
    if [[ "$origin_entry" == "$sha" ]]; then
      origin_note=" [этот SHA УЖЕ в $ORIGIN_REF — деплой сломан прямо сейчас, не этим push]"
    fi
  fi

  problems+=("$sm_path|$sha|$fix_cmd|$origin_note")
done

for w in "${warnings[@]}"; do
  echo "⚠️  $w" >&2
done

if [[ ${#problems[@]} -eq 0 ]]; then
  echo "✅ submodule синхронны с origin: проверено $checked из ${#GITLINKS[@]} (коммит $(git rev-parse --short "$REV"))"
  exit 0
fi

echo "" >&2
echo "⛔ ${#problems[@]} submodule записан(ы) в letar на коммит, которого НЕТ на их origin:" >&2
echo "" >&2
for p in "${problems[@]}"; do
  IFS='|' read -r sm_path sha fix_cmd origin_note <<< "$p"
  echo "  • $sm_path → $sha$origin_note" >&2
  echo "      запушить: $fix_cmd" >&2
done
echo "" >&2
echo "Пока этого не сделано, ЛЮБОЙ деплой любого приложения падает на сервере:" >&2
echo "  fatal: remote error: upload-pack: not our ref <sha>" >&2
echo "(git submodule update --recursive в deploy-affected.sh, до выбора приложения —" >&2
echo " встаёт вся очередь деплоев, а не только виновное приложение)." >&2
echo "" >&2
echo "После push submodule ничего пересоздавать в letar не нужно — SHA уже верный." >&2
exit 1
