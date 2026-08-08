#!/usr/bin/env bash
# Default-deny в цепочке DOCKER-USER (IPv4, FORWARD) и, опционально, в INPUT (IPv6).
#
# Почему это существует отдельно от ufw — .claude/docs/firewall.md, раздел
# «Почему ufw бесполезен против Docker-портов». Коротко: Docker публикует порты через DNAT
# в PREROUTING/FORWARD, куда правила ufw (живущие в INPUT) никогда не попадают. DOCKER-USER —
# единственное место в FORWARD, которое Docker гарантированно просматривает раньше своих
# ACCEPT-правил и не перетирает при рестарте демона.
#
# IPv6 — отдельная история (см. тот же док, раздел «IPv6»): без "ip6tables": true в
# /etc/docker/daemon.json Docker не создаёт DNAT для v6, порт слушает docker-proxy на самом
# хосте, и трафик идёт в INPUT, а не в FORWARD. Поэтому на серверах, где v6 не закрыт иначе
# (например ufw с -P INPUT DROP, как на mail-сервере), нужен и блок INPUT.
#
# Конфигурация — не в этом файле. Скрипт читает переменные окружения:
#   EXT_IFACE_OVERRIDE — интерфейс, если автоопределение (ip route get 8.8.8.8) не годится
#   TCP_PORTS           — CSV портов, разрешённых снаружи по TCP (обязательно, порт КОНТЕЙНЕРА,
#                          не хостовый — см. .claude/docs/firewall.md про DNAT-переписывание)
#   UDP_PORTS           — CSV портов по UDP (можно пусто)
#   ENABLE_IPV6_INPUT    — "1", чтобы также применить default-deny в ip6tables INPUT.
#                          НЕ включать на сервере, где IPv6 INPUT уже закрыт другим механизмом
#                          (mail-сервер — ufw с -P INPUT DROP) — школьная ошибка задвоить и
#                          потерять доступ, если один из двух наборов правил разъедется.
#   HOST_DENY_TCP_PORTS  — CSV портов, для которых нужен явный DROP в IPv4 INPUT (не DOCKER-USER).
#                          Нужны сервисам с network_mode: host — их трафик минует FORWARD/DNAT
#                          Docker'а вообще, поэтому default-deny в DOCKER-USER их не видит и не
#                          закрывает (прецедент: ipfsstor4:42080 на s3, PLAN-INFRA.md §57).
#                          Это НЕ allow-list — список того, что нужно точечно заблокировать.
#
# Обычный способ передать переменные — systemd EnvironmentFile (см. docker-user-firewall.service
# и ports.<server>.env рядом). Ручной запуск: `TCP_PORTS=80,443 UDP_PORTS=53 ./docker-user-firewall.sh`.
#
# Идемпотентен: флеш перед добавлением, повторный запуск не плодит дубли правил.

set -euo pipefail

: "${TCP_PORTS:?TCP_PORTS не задан — какие TCP-порты разрешены снаружи?}"
UDP_PORTS="${UDP_PORTS:-}"
ENABLE_IPV6_INPUT="${ENABLE_IPV6_INPUT:-0}"

HOST_DENY_TCP_PORTS="${HOST_DENY_TCP_PORTS:-}"

EXT_IFACE="${EXT_IFACE_OVERRIDE:-$(ip route get 8.8.8.8 | sed -n 's/.* dev \([^ ]*\).*/\1/p')}"
if [ -z "$EXT_IFACE" ]; then
  echo "docker-user-firewall: не удалось определить внешний интерфейс" >&2
  exit 1
fi

echo "docker-user-firewall: интерфейс=$EXT_IFACE tcp=$TCP_PORTS udp=${UDP_PORTS:-<нет>} ipv6_input=$ENABLE_IPV6_INPUT host_deny=${HOST_DENY_TCP_PORTS:-<нет>}"

# --- IPv4: DOCKER-USER (FORWARD) ---
iptables -F DOCKER-USER
iptables -A DOCKER-USER -i "$EXT_IFACE" -m conntrack --ctstate RELATED,ESTABLISHED -j RETURN
iptables -A DOCKER-USER -i "$EXT_IFACE" -p tcp -m multiport --dports "$TCP_PORTS" -j RETURN
if [ -n "$UDP_PORTS" ]; then
  iptables -A DOCKER-USER -i "$EXT_IFACE" -p udp -m multiport --dports "$UDP_PORTS" -j RETURN
fi
iptables -A DOCKER-USER -i "$EXT_IFACE" -j DROP

# --- IPv6: INPUT — только если явно включено этой конфигурацией ---
if [ "$ENABLE_IPV6_INPUT" = "1" ]; then
  ip6tables -F INPUT
  ip6tables -A INPUT -i "$EXT_IFACE" -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
  # NDP + Path MTU Discovery — не «пинг для удобства», без этого IPv6-связность деградирует
  # не сразу и трудновоспроизводимо (.claude/docs/firewall.md, раздел IPv6).
  ip6tables -A INPUT -i "$EXT_IFACE" -p ipv6-icmp -j ACCEPT
  # SSH по IPv6 — забытый порт здесь отрезает доступ по AAAA-записи сразу же.
  ip6tables -A INPUT -i "$EXT_IFACE" -p tcp --dport 22 -j ACCEPT
  ip6tables -A INPUT -i "$EXT_IFACE" -p tcp -m multiport --dports "$TCP_PORTS" -j ACCEPT
  if [ -n "$UDP_PORTS" ]; then
    ip6tables -A INPUT -i "$EXT_IFACE" -p udp -m multiport --dports "$UDP_PORTS" -j ACCEPT
  fi
  ip6tables -A INPUT -i "$EXT_IFACE" -j DROP
fi

# --- Точечные DROP в IPv4 INPUT для network_mode: host сервисов (минуют DOCKER-USER) ---
if [ -n "$HOST_DENY_TCP_PORTS" ]; then
  IFS=',' read -ra _ports <<<"$HOST_DENY_TCP_PORTS"
  for p in "${_ports[@]}"; do
    iptables -D INPUT -i "$EXT_IFACE" -p tcp --dport "$p" -j DROP 2>/dev/null || true
    iptables -I INPUT -i "$EXT_IFACE" -p tcp --dport "$p" -j DROP
  done
fi
