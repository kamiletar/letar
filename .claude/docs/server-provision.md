# Provision нового сервера

Чеклист для настройки свежего VPS под инфраструктуру letar (Ubuntu 24+).

## 1. Исходные данные

После покупки сервера получаем: IP, root-пароль. DNS-записи:

- `A` → IP сервера
- `AAAA` → IPv6 (узнать: `ip addr show | grep 'inet6.*global'`)
- `*.s3 CNAME s3.letar.best` — wildcard для поддоменов

## 2. Hardening (выполнить первым делом)

### 2.1 Добавить SSH-ключ

```bash
mkdir -p /root/.ssh && chmod 700 /root/.ssh
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIN1Bj6jwpqknJAadr+9WhM32oEsKJQ1raqtmSrxnr5cm kami@DESKTOP-V6S51B8' \
  >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

Проверить вход по ключу до отключения пароля.

### 2.2 Обновить пакеты + установить базовые утилиты

```bash
apt-get update -q
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -q
DEBIAN_FRONTEND=noninteractive apt-get install -y -q fail2ban curl wget unzip ufw
```

### 2.3 Настроить fail2ban

```bash
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime  = 24h
findtime = 10m
maxretry = 5
backend  = systemd

[sshd]
enabled = true
port    = ssh
EOF

systemctl restart fail2ban
fail2ban-client status sshd  # проверка
```

### 2.4 Отключить авторизацию паролем

```bash
sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sshd -t && systemctl reload ssh
```

## 3. Установка инструментов разработки

### Node.js 24

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs
node --version  # должно быть v24.x
```

### Bun (глобально)

```bash
apt-get install -y unzip  # зависимость
curl -fsSL https://bun.sh/install | bash
ln -sf /root/.bun/bin/bun /usr/local/bin/bun
bun --version
```

### Nx (глобально через bun)

```bash
bun install -g nx
ln -sf /root/.bun/bin/nx /usr/local/bin/nx
nx --version  # Global: vX.X.X
```

### Docker

```bash
curl -fsSL https://get.docker.com | sh
docker --version        # Docker Engine - Community
docker compose version  # Docker Compose plugin
```

Официальный скрипт сам добавляет репозиторий, ставит `docker-ce`, `docker-compose-plugin`, `docker-buildx-plugin` и запускает демон.

### SOPS + age (шифрование секретов)

```bash
# age (из apt)
apt-get install -y age

# sops (бинарник с GitHub Releases)
curl -fsSL https://github.com/getsops/sops/releases/download/v3.9.4/sops-v3.9.4.linux.amd64 \
  -o /usr/local/bin/sops && chmod +x /usr/local/bin/sops
sops --version

# скопировать age-ключ с локальной машины:
# scp ~/.age/letar-key.txt root@<IP>:/root/.age/letar-key.txt
mkdir -p /root/.age && chmod 700 /root/.age
chmod 600 /root/.age/letar-key.txt

# прописать в .bashrc
echo 'export SOPS_AGE_KEY_FILE=/root/.age/letar-key.txt' >> /root/.bashrc

# проверка — должен вывести публичный ключ age1v0vhym...
age-keygen -y /root/.age/letar-key.txt
```

## 4. Provision-план s3 (§15.6 PLAN.md)

После hardening и инструментов — по порядку:

1. **Docker** ✅ — установлен выше
2. **age-ключ (SOPS)** ✅ — установлен выше
3. **Redis** — порты 6379 (медиа) и 6380 (e2e)
4. **PostgreSQL** — инстанс для E2E-БД + `provision-e2e-db.sh`
5. **Resilio Sync** — добавить пир, принять инвайт
6. **Kubo IPFS** — `ipfs init --profile=server`, chunk 1 МБ
7. **Медиа-сервер** — `docker compose up infra/media-server/`
8. **E2E-ранер** — Playwright browsers, проверить `nx e2e driving-school-e2e`
9. **Nginx Proxy Manager** — домены `media.letar.best`, `ipfs.letar.best`
10. **Мониторинг** — добавить в dashboard-agent (uptime + disk `/data`)
11. **Cron E2E** — `0 2 * * * cd /home/deploy/letar && nx run-many --target=e2e --parallel=3`

## 5. Итоговые секреты (добавить в `.env.docker.enc`)

```
MEDIA_API_KEY_SVOICHUZHIE=...
MEDIA_API_KEY_KAMI=...
TELEGRAM_E2E_BOT_TOKEN=...
TELEGRAM_E2E_CHAT_ID=...
IPFS_API_TOKEN=...          # опц., для внешних pinning services
```

## Связанные доки

- [deployment.md](deployment.md) — Docker, docker-compose, deploy-affected.sh
- [secret-manager.md](secret-manager.md) — SOPS + age, шифрование .env.docker
- [backup-architecture.md](backup-architecture.md) — Resilio, бэкапы
- [server-recovery.md](server-recovery.md) — восстановление при аварии
