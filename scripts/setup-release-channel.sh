#!/bin/bash
# Разовая настройка канала s1 → s2 для сборки на s1 (PLAN-INFRA-6.md §157).
#
# Запускается ВЛАДЕЛЬЦЕМ с рабочей машины (там лежит ключ доступа к обоим серверам под deploy).
# Агентам не запускать: скрипт меняет authorized_keys на production-сервере.
#
# Что делает (каждый шаг идемпотентен — повторный запуск ничего не дублирует):
#   1. на s1 создаёт ключ ~/.ssh/s1_release_ed25519 (если его нет), без пароля — им пользуется
#      автоматика деплоя;
#   2. на s2 добавляет публичную часть в ~/.ssh/authorized_keys с ограничениями:
#        restrict                       — запрещено всё, что не разрешено явно (pty, agent, X11, rc)
#        port-forwarding                — разрешён только проброс портов...
#        permitopen="127.0.0.1:*"       — ...и только на loopback s2 (туннель к Postgres)
#        command="…/deploy-release-entry.sh" — единственное исполнимое действие: dump|release <app> <sha>
#      Shell по этому ключу получить нельзя;
#   3. на s1 прописывает ключ хоста s2 в known_hosts, взятый С САМОГО s2 (не TOFU: ssh-keyscan
#      с s1 принял бы то, что ответит сеть);
#   4. проверяет канал: туннель поднимается, а произвольная команда отвергается точкой входа.
#      Шаг 4 требует, чтобы scripts/deploy-release-entry.sh уже был в чекауте на s2
#      (запушено в origin и подтянуто `git pull`); до этого он честно сообщит, чего не хватает.
#
# Отзыв доступа: удалить строку с комментарием `s1-build-to-s2-release` из
# /home/deploy/.ssh/authorized_keys на s2 — больше ничего не нужно.
#
# Запуск:
#   bash scripts/setup-release-channel.sh            # шаги 1–4
#   bash scripts/setup-release-channel.sh --check    # только шаг 4 (ничего не меняет)

set -euo pipefail

# На Windows обязательно системный OpenSSH: Git Bash ssh плодит ssh-agent.exe (см. deployment.md)
if [ -x /c/Windows/System32/OpenSSH/ssh.exe ]; then
  SSH=(/c/Windows/System32/OpenSSH/ssh.exe -i "$HOME/.ssh/id_rsa" -o BatchMode=yes)
else
  SSH=(ssh -o BatchMode=yes)
fi
S1="deploy@s1.letar.best"
S2="deploy@s2.letar.best"
KEY_PATH=".ssh/s1_release_ed25519"
COMMENT="s1-build-to-s2-release"
ENTRY="/home/deploy/letar/scripts/deploy-release-entry.sh"
CHECK_ONLY=false
[ "${1:-}" = "--check" ] && CHECK_ONLY=true

step() { echo; echo "── $*"; }

if [ "$CHECK_ONLY" = false ]; then
  step "1/4  Ключ на s1"
  "${SSH[@]}" "$S1" "set -e; if [ ! -f ~/$KEY_PATH ]; then ssh-keygen -t ed25519 -N '' -C '$COMMENT' -f ~/$KEY_PATH >/dev/null && echo 'ключ создан'; else echo 'ключ уже есть'; fi"
  PUBKEY=$("${SSH[@]}" "$S1" "cat ~/$KEY_PATH.pub" | awk '{print $1" "$2}')
  echo "публичный ключ: ${PUBKEY:0:40}…"

  step "2/4  authorized_keys на s2 (ограниченный ключ)"
  LINE="restrict,port-forwarding,permitopen=\"127.0.0.1:*\",command=\"$ENTRY\" $PUBKEY $COMMENT"
  # Ищем по самому ключу, а не по строке целиком: параметры могли быть подправлены руками
  "${SSH[@]}" "$S2" "set -e; mkdir -p ~/.ssh; touch ~/.ssh/authorized_keys; chmod 600 ~/.ssh/authorized_keys; \
    if grep -qF '$(echo "$PUBKEY" | awk '{print $2}')' ~/.ssh/authorized_keys; then echo 'ключ уже добавлен'; \
    else printf '%s\n' '$LINE' >> ~/.ssh/authorized_keys && echo 'ключ добавлен'; fi"

  step "3/4  known_hosts на s1 (ключ хоста берём с самого s2)"
  HOSTKEY=$("${SSH[@]}" "$S2" "cat /etc/ssh/ssh_host_ed25519_key.pub" | awk '{print $1" "$2}')
  "${SSH[@]}" "$S1" "set -e; mkdir -p ~/.ssh; touch ~/.ssh/known_hosts; chmod 600 ~/.ssh/known_hosts; \
    if ssh-keygen -F s2.letar.best -f ~/.ssh/known_hosts >/dev/null; then echo 'запись s2 уже есть'; \
    else printf '%s\n' 's2.letar.best $HOSTKEY' >> ~/.ssh/known_hosts && echo 'запись добавлена'; fi"
fi

step "4/4  Проверка канала (с s1 на s2 ограниченным ключом)"
"${SSH[@]}" "$S2" "test -x $ENTRY" || {
  echo "❌ На s2 нет $ENTRY — сначала запушь коммит со scripts/deploy-release-entry.sh и сделай git pull в /home/deploy/letar на s2."
  exit 1
}
# 4а. Произвольная команда должна быть отвергнута ТОЧКОЙ ВХОДА (код 2), а не выполнена
set +e
OUT=$("${SSH[@]}" "$S1" "ssh -i ~/$KEY_PATH -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes $S2 'id' 2>&1")
RC=$?
set -e
if echo "$OUT" | grep -q 'deploy-release-entry:'; then
  echo "✅ произвольная команда отвергнута точкой входа: $(echo "$OUT" | head -1)"
else
  echo "❌ ожидался отказ deploy-release-entry, получено (rc=$RC):"
  echo "$OUT"
  exit 1
fi
# 4б. Туннель к loopback s2 поднимается (порт 22 s2 — заведомо слушает на 127.0.0.1)
"${SSH[@]}" "$S1" "set -e; S=/tmp/release-check-\$\$.sock; \
  ssh -i ~/$KEY_PATH -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes \
      -M -S \$S -N -f -L 127.0.0.1:29999:127.0.0.1:22 $S2; \
  timeout 5 bash -c '</dev/tcp/127.0.0.1/29999' && echo '✅ туннель на loopback s2 работает'; \
  ssh -S \$S -O exit $S2 >/dev/null 2>&1 || true"

echo
echo "Канал s1→s2 настроен и проверен."
