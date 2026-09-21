#!/bin/bash
# Точка входа для ограниченного SSH-ключа s1 → s2 (PLAN-INFRA-6.md §157).
#
# Подключается в ~/.ssh/authorized_keys пользователя deploy на s2 как forced-command:
#
#   restrict,port-forwarding,permitopen="127.0.0.1:*",command="/home/deploy/letar/scripts/deploy-release-entry.sh" ssh-ed25519 AAAA... s1-build->s2-release
#
# `restrict` отключает всё, что не разрешено явно (pty, agent-forwarding, X11, rc-файлы).
# `port-forwarding` + `permitopen` оставляют одну возможность — пробросить порты на loopback s2
# (туннель к Postgres приложений на время миграций и пререндера; сами БД снаружи не видны).
# `command=` делает единственным исполнимым действием этот скрипт: клиент не получает shell,
# а его «команда» (SSH_ORIGINAL_COMMAND) разбирается здесь по жёсткому белому списку.
#
# Допустимые команды:
#   dump    <app> <sha>
#   release <app> <sha>
# Всё остальное — отказ. Скрипт сам ничего не исполняет из ввода: имя и sha после валидации
# передаются аргументами в scripts/deploy-release.sh.
#
# Сессия `ssh -N -L ...` (только проброс) этот скрипт не запускает — sshd не открывает канал
# сессии, поэтому туннель работает независимо от forced-command.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

deny() {
  echo "deploy-release-entry: $*" >&2
  exit 2
}

ORIGINAL="${SSH_ORIGINAL_COMMAND:-}"
[ -n "$ORIGINAL" ] || deny "интерактивный вход запрещён; допустимо: dump|release <app> <sha>"

# Одна строка: `read` дочитывает только первую, остальное молча бы отбросилось — строгий белый
# список не должен «прощать» хвост
[[ "$ORIGINAL" != *$'\n'* && "$ORIGINAL" != *$'\r'* ]] || deny "команда должна быть одной строкой"

# Ровно три слова через одиночные пробелы; никакого подсоса метасимволов shell — read -a не
# выполняет подстановок, а каждое слово ниже проверяется регуляркой.
read -r -a WORDS <<< "$ORIGINAL"
[ "${#WORDS[@]}" -eq 3 ] || deny "ожидается: <dump|release> <app> <sha>"

CMD="${WORDS[0]}"
APP="${WORDS[1]}"
SHA="${WORDS[2]}"

case "$CMD" in
  dump | release) ;;
  *) deny "неизвестная команда: допустимо dump|release" ;;
esac
[[ "$APP" =~ ^[a-z0-9-]+$ ]] || deny "недопустимое имя приложения"
[[ "$SHA" =~ ^[0-9a-f]{7,40}$ ]] || deny "недопустимый sha"
# Существование каталога приложения проверяет deploy-release.sh уже ПОСЛЕ git pull: у приложения,
# добавленного последним коммитом, на s2 каталога до pull ещё нет.

exec "$SCRIPT_DIR/scripts/deploy-release.sh" "$CMD" "$APP" "$SHA"
