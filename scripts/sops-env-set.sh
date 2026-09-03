#!/usr/bin/env bash
# sops-env-set.sh <app> <staging|docker> <KEY> <VALUE> — безопасно поменять/добавить одну
# переменную в apps/<app>/.env.<staging|docker>.enc, не наступая на две грабли sops:
#
#   1. `sops --encrypt` матчит .sops.yaml creation_rules ПО ПУТИ ВХОДНОГО файла, не выходного.
#      Плейнтекст-имя вида ".../.tmp" не совпадает с regex `\.env\.staging(\.enc)?$` —
#      "error loading config: no matching creation rules found" (exit 1, .enc не тронут).
#      Фикс: расшифровывать/шифровать через файл, чьё ИМЯ буквально заканчивается на
#      ".env.staging"/".env.docker" — путь до него неважен, regex не заякорен.
#   2. Часть .enc-файлов в репозитории — построчный dotenv-формат sops (`KEY=ENC[...]` на
#      каждую переменную), другая часть — JSON-обёрнутый бинарный блоб (формат по умолчанию,
#      когда sops не распознаёт расширение). Бинарный decrypt/encrypt без
#      `--input-type dotenv --output-type dotenv` падает на dotenv-файлах с
#      "Error unmarshalling input json: invalid character ... looking for beginning of value".
#      Фикс: пробовать decrypt без флагов, при этой конкретной ошибке — повторить с
#      `--input-type dotenv`, и запомнить, каким способом файл открылся, чтобы зашифровать
#      обратно тем же способом.
#
# Разбор — .claude/docs/sops-env-encrypt-input-path-matching.md
#
# Использование:
#   scripts/sops-env-set.sh <app> staging NEXT_PUBLIC_BASE_URL https://example.letar.best
#   scripts/sops-env-set.sh <app> docker DATABASE_URL postgres://...
#
# Требует SOPS_AGE_KEY_FILE в окружении (см. .claude/docs/secret-manager.md).

set -euo pipefail

APP="${1:-}"
ENV_KIND="${2:-}"
KEY="${3:-}"
VALUE="${4:-}"

if [[ -z "$APP" || -z "$ENV_KIND" || -z "$KEY" || $# -lt 4 ]]; then
  echo "Использование: $0 <app> <staging|docker> <KEY> <VALUE>" >&2
  exit 1
fi

if [[ "$ENV_KIND" != "staging" && "$ENV_KIND" != "docker" ]]; then
  echo "[sops-env-set] второй аргумент должен быть 'staging' или 'docker', получено: $ENV_KIND" >&2
  exit 1
fi

if ! command -v sops &>/dev/null; then
  echo "[sops-env-set] sops не найден в PATH" >&2
  exit 1
fi

if [[ -z "${SOPS_AGE_KEY_FILE:-}" || ! -f "${SOPS_AGE_KEY_FILE}" ]]; then
  echo "[sops-env-set] SOPS_AGE_KEY_FILE не задан или файл не найден (см. .claude/docs/secret-manager.md)" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENC_FILE="$REPO_ROOT/apps/$APP/.env.$ENV_KIND.enc"

if [[ ! -f "$ENC_FILE" ]]; then
  echo "[sops-env-set] $ENC_FILE не найден" >&2
  exit 1
fi

# Имя временного файла должно буквально заканчиваться на .env.staging/.env.docker — это
# единственное, что проверяет path_regex в .sops.yaml (грабля №1). Каталог значения не имеет,
# поэтому используем изолированный mktemp -d — рабочую копию apps/<app>/ не трогаем вообще.
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

PLAIN="$TMPDIR/.env.$ENV_KIND"
ERR_LOG="$TMPDIR/err.log"

echo "[sops-env-set] Расшифровываю $ENC_FILE"

FORMAT=""
if sops --decrypt "$ENC_FILE" >"$PLAIN" 2>"$ERR_LOG"; then
  FORMAT="binary"
elif grep -qi "invalid character" "$ERR_LOG"; then
  echo "[sops-env-set] бинарный decrypt не подошёл (dotenv-формат) — повторяю с --input-type dotenv"
  if sops --decrypt --input-type dotenv --output-type dotenv "$ENC_FILE" >"$PLAIN" 2>"$ERR_LOG"; then
    FORMAT="dotenv"
  else
    echo "[sops-env-set] decrypt провалился и в dotenv-режиме:" >&2
    cat "$ERR_LOG" >&2
    exit 1
  fi
else
  echo "[sops-env-set] decrypt провалился (не про формат dotenv/JSON):" >&2
  cat "$ERR_LOG" >&2
  exit 1
fi

echo "[sops-env-set] Формат файла: $FORMAT"

# Правим/добавляем ключ. VALUE читаем через ENVIRON, а не awk -v, чтобы awk не интерпретировал
# escape-последовательности (\n, \t и т.п.) внутри значения секрета.
KEY="$KEY" VALUE="$VALUE" awk '
  BEGIN {
    key = ENVIRON["KEY"]
    val = ENVIRON["VALUE"]
    pref = key "="
    done = 0
  }
  {
    if (substr($0, 1, length(pref)) == pref) {
      print pref val
      done = 1
    } else {
      print $0
    }
  }
  END {
    if (!done) print pref val
  }
' "$PLAIN" >"$PLAIN.new"
mv "$PLAIN.new" "$PLAIN"

echo "[sops-env-set] Шифрую обратно в $ENC_FILE"

if [[ "$FORMAT" == "dotenv" ]]; then
  sops --encrypt --input-type dotenv --output-type dotenv --output "$ENC_FILE" "$PLAIN"
else
  sops --encrypt --output "$ENC_FILE" "$PLAIN"
fi

echo "[sops-env-set] Готово. Проверяю результат..."

# Верификация: не доверяем "успешно напечатал", exit code — источник истины (сформулировано
# явно, потому что цикл-скрипт, обошедшийся без этой проверки, в этой же сессии молча не
# записал 20 файлов подряд из-за грабли №1).
VERIFY="$TMPDIR/.env.$ENV_KIND.verify"
if [[ "$FORMAT" == "dotenv" ]]; then
  sops --decrypt --input-type dotenv --output-type dotenv "$ENC_FILE" >"$VERIFY"
else
  sops --decrypt "$ENC_FILE" >"$VERIFY"
fi

RESULT_LINE="$(grep "^$KEY=" "$VERIFY" || true)"
if [[ -z "$RESULT_LINE" ]]; then
  echo "[sops-env-set] ОШИБКА: после перешифровки ключ $KEY не найден в $ENC_FILE" >&2
  exit 1
fi

echo "[sops-env-set] $RESULT_LINE"
