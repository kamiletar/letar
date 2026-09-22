#!/usr/bin/env bash
# pre-commit-semgrep.sh — статический анализ безопасности по застейдженным файлам.
#
# Ставится вместе со scope-guard и sops через scripts/hooks/install.sh.
#
# Почему git-хук, а не PostToolUse-хук Claude Code:
#   - работает для любого агента и для человека, не зависит от того, какой инструмент правил файл;
#   - срабатывает один раз перед коммитом, а не на каждую правку (semgrep стартует ~3–5 сек,
#     на каждом Write это было бы невыносимо);
#   - барьер стоит там же, где остальные — в одном месте, а не размазан по настройкам.
#
# Что проверяет:
#   - .semgrep/letar-rules.yml — свои правила (SQL-инъекция через $queryRawUnsafe,
#     dangerouslySetInnerHTML, ALLOW_DEV_SESSION в прод-конфиге). Работают офлайн.
#   - p/secrets — реестровый набор на захардкоженные ключи. Требует сети.
#
# ⚠️ Раньше здесь было написано, что при недоступности сети проверка «деградирует до
# локальных правил». Это неверно и было проверено эмпирически (2026-09-03): если хотя бы
# один --config не резолвится, semgrep не сканирует НИ ОДНОГО файла вообще (paths.scanned
# пуст), а не откатывается на локальный конфиг. Отсюда и политика ниже.
#
# ⚠️ Сканируется содержимое ИНДЕКСА, а не рабочего дерева. Из индекса раньше брался только список
# имён, а semgrep читал файлы с диска: при `MM` (часть хунков застейджена, часть в рабочем дереве)
# проверялась не та версия, что уйдёт в коммит — уязвимость в застейдженном хунке проходила бы, если
# на диске её уже нет. Теперь индексные версии выгружаются `git checkout-index` во временный
# каталог с теми же относительными путями, и semgrep запускается оттуда (см.
# .claude/docs/git-multi-agent-incidents.md § «Дополнение 2026-09-22»).
#
# ERROR блокирует коммит, WARNING печатается. Сам semgrep не отработал (сеть, fatal error,
# unparseable YAML) — тоже блокирует, а не пропускает молча: анализ безопасности, который
# не смог ответить, не должен читаться как «проверено и чисто»
# (.claude/docs/verification-pitfalls.md). Обход в обоих случаях — SKIP_SEMGREP=1 git commit.

set -uo pipefail

if [[ "${SKIP_SEMGREP:-}" == "1" ]]; then
  echo "⏭️  semgrep пропущен (SKIP_SEMGREP=1)"
  exit 0
fi

# uvx может не стоять у другого агента/на другой машине — это не повод ломать ему коммит
if ! command -v uvx >/dev/null 2>&1; then
  echo "⏭️  semgrep пропущен: uvx не найден (поставь uv, если нужен анализ безопасности)"
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
RULES="$REPO_ROOT/.semgrep/letar-rules.yml"

# По умолчанию свои правила есть только в корневом letar. Отдельный submodule может завести
# свой .semgrep/letar-rules.yml для правил, специфичных для его приватной бизнес-логики —
# этот же скрипт (копируется в submodule через install.sh --all-submodules) резолвит путь от
# своего git rev-parse --show-toplevel, поэтому имя файла совпадает с корневым намеренно и
# подхватывается автоматически, без единой правки самого скрипта. Образец — apps/domwellbes
# (см. .claude/docs/semgrep-per-submodule-rules-pattern.md). Своего файла в submodule нет —
# работают только реестровые наборы (p/secrets); молча пропускать нельзя, поэтому сообщаем.
CONFIGS=()
[[ -f "$RULES" ]] && CONFIGS+=(--config "$RULES")
CONFIGS+=(--config "p/secrets")

# -z вместо голого --name-only: при core.quotepath=true (дефолт) не-ASCII пути выводятся в
# кавычках с восьмеричными escape-последовательностями, `[[ -f ]]` ниже такой "путь" не находит,
# и файл молча выпадает из security-скана (тот же баг — pre-commit-scope-guard.sh, воспроизведён
# 2026-09-16 в apps/domwellbes). grep-фильтр по расширению применяем к NUL-разделённому потоку.
mapfile -d '' FILES < <(git diff --cached --name-only -z --diff-filter=ACM \
  | grep -Ezi '\.(ts|tsx|js|jsx|mjs|cjs)$|\.env\.docker$|\.env\.production$' || true)

if [[ ${#FILES[@]} -eq 0 ]]; then
  exit 0
fi

echo "🔎 semgrep: проверяю ${#FILES[@]} файл(ов)…"

OUT="$(mktemp)"
SCAN_DIR="$(mktemp -d)"
trap 'rm -f "$OUT"; rm -rf "$SCAN_DIR"' EXIT

# Индексные версии — во временный каталог с теми же относительными путями. checkout-index берёт
# именно индекс (в том числе временный GIT_INDEX_FILE при `git commit -- <путь>`, дочерний git
# наследует переменную), один процесс на все файлы; --prefix обязан оканчиваться на «/».
# Не выгрузилось — это «не знаем», а не «чисто»: блокируем, как и при сбое самого semgrep.
if ! printf '%s\0' "${FILES[@]}" | git checkout-index --prefix="$SCAN_DIR/" -z --stdin; then
  echo "⛔ не удалось выгрузить индексные версии для semgrep — коммит остановлен"
  echo "   Обход (осознанный пропуск проверки): SKIP_SEMGREP=1 git commit ..."
  exit 1
fi

# Запуск из корня выгрузки: пути в `paths:` правил (`/apps/*/main/**`, `libs/forms/**`) и в
# отчёте получаются относительными корню репозитория, как при запуске из самого репозитория.
# PYTHONUTF8=1 обязателен: на Windows semgrep читает YAML в системной cp1251 и падает
# UnicodeDecodeError на кириллице в message правил.
(cd "$SCAN_DIR" && PYTHONUTF8=1 timeout 120 uvx semgrep scan "${CONFIGS[@]}" --quiet --json --metrics=off \
  "${FILES[@]}" >"$OUT" 2>/dev/null)
SCAN_STATUS=$?

if [[ $SCAN_STATUS -ne 0 || ! -s "$OUT" ]]; then
  # semgrep не смог отработать (сеть, fatal error, сломанный конфиг) — это не «находок
  # нет», это «мы не знаем». Блокируем явно, а не пропускаем молча — иначе тихий сбой
  # реестрового конфига (p/secrets) читался бы как «проверено и чисто».
  echo "⛔ semgrep не отработал (код $SCAN_STATUS) — коммит остановлен"
  echo "   Обход (осознанный пропуск проверки): SKIP_SEMGREP=1 git commit ..."
  exit 1
fi

node -e '
const fs = require("fs")
let data
try {
  data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
} catch {
  console.error("⛔ semgrep вернул неразбираемый вывод — коммит остановлен")
  console.error("   Обход: SKIP_SEMGREP=1 git commit ...")
  process.exit(1)
}
// data.errors — нефатальные ошибки semgrep (например конфиг частично не резолвился, но
// сканирование остальных файлов прошло, exit=0). Раньше игнорировались полностью — коммит
// с таким выводом молча читался как «0 находок», хотя часть проверки не выполнилась.
const scanErrors = data.errors || []
if (scanErrors.length) {
  for (const e of scanErrors) {
    console.error(`⚠️  semgrep: ${e.type || "ошибка"} — ${(e.message || "").trim()}`)
  }
}
const results = data.results || []
const errors = results.filter((r) => r.extra.severity === "ERROR")
const warnings = results.filter((r) => r.extra.severity !== "ERROR")

const show = (list, icon) => {
  for (const r of list) {
    const rule = r.check_id.split(".").pop()
    console.error(`${icon} ${r.path.replace(/[\x5c]/g, "/")}:${r.start.line} [${rule}]`)
    console.error(`   ${(r.extra.message || "").trim().replace(/\s+/g, " ")}`)
  }
}

if (warnings.length) show(warnings, "⚠️ ")
if (errors.length) {
  show(errors, "⛔")
  console.error("")
  console.error(`Коммит заблокирован: ${errors.length} проблем(ы) уровня ERROR.`)
  console.error("Осознанный обход: SKIP_SEMGREP=1 git commit ...")
  process.exit(1)
}
if (warnings.length) console.error("")
' "$OUT"
