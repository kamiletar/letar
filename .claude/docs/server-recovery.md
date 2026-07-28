# Восстановление сервера после компрометации

Инструкция применима к Ubuntu 24.04 + Docker окружению. Одновременно служит чеклистом
текущего восстановления и шаблоном для будущих инцидентов.

---

## Быстрый статус (s1.letar.best, 2026-02-25)

**Инцидент:** криптомайнер `/tmp/docker-daemon`, 200% CPU, 38 дней работы. Каталог `/home/deploy/letar` удалён атакующим.

| Этап                                                     | Статус |
| -------------------------------------------------------- | ------ |
| Обнаружен вектор атаки                                   | ✅     |
| Бэкап БД (Resilio Sync, backups/ до 21 фев)              | ✅     |
| Бэкап NPM конфигов (`npm-backup-20260224.tar.gz`)        | ✅     |
| Ubuntu 24.04 переустановлен через панель хостинга        | ✅     |
| SSH ключ добавлен в root (через paramiko)                | ✅     |
| `known_hosts` обновлён локально                          | ✅     |
| Создан пользователь deploy, добавлен SSH ключ            | ✅     |
| Отключить вход по паролю                                 | ⬜     |
| Установить fail2ban                                      | ⬜     |
| Установить Docker                                        | ⬜     |
| Установить Resilio Sync (бэкапы БД, .env.docker)         | ⬜     |
| Клонировать репо в `/home/deploy/letar`                  | ⬜     |
| Восстановить `.env.docker` из `C:\BackupSync\lena\s1\`   | ⬜     |
| Поднять Nginx Proxy Manager                              | ⬜     |
| Восстановить конфиги NPM из `npm-backup-20260224.tar.gz` | ⬜     |
| Задеплоить все приложения s1                             | ⬜     |
| Проверить работу всех сайтов                             | ⬜     |

---

## Часть 1: Обнаружение взлома

### Признаки компрометации

- Один процесс потребляет 100–200% CPU (видно в `top`)
- Исполняемый файл процесса находится в `/tmp/` или `/dev/shm/`
- В `/etc/cron.d/` появились незнакомые файлы
- Процесс перезапускается после `kill` (persistence через cron или systemd)
- Каталоги с данными (`/home/deploy/`) удалены или изменены

### Диагностические команды

```bash
# 1. Смотреть CPU — имена с >100% CPU подозрительны
top

# 2. Где находится бинарник (если "(deleted)" — уже удалён с диска)
ls -la /proc/$(pidof <имя-процесса>)/exe

# 3. Что есть в /tmp
ls -la /tmp/
ls -la /dev/shm/

# 4. Проверить cron текущего пользователя
crontab -l

# 5. Проверить системные cron задачи
ls /etc/cron.d/
cat /etc/cron.d/<подозрительный-файл>

# 6. Проверить все пользовательские crontabs
for user in $(cut -f1 -d: /etc/passwd); do echo "=== $user ==="; crontab -u $user -l 2>/dev/null; done

# 7. Проверить автозапуск systemd
systemctl list-units --type=service --state=running | grep -v "\.service"

# 8. Проверить входящие соединения (куда ходит майнер)
ss -tulnp
netstat -tulnp
```

### Если процесс возвращается после kill

```bash
# Найти и удалить cron задачу сначала
ls /etc/cron.d/
rm /etc/cron.d/<вредоносный-файл>

# Затем убить процесс
kill -9 $(pidof <имя>)

# Удалить бинарник
rm /tmp/<вредоносный-файл>

# Если доступ к /tmp заблокирован — перемонтировать
mount -o remount,noexec /tmp
```

> **Совет:** Если вирус слишком агрессивный — не тратить время на зачистку,
> сразу делать бэкап данных и переустанавливать ОС.

---

## Часть 2: Резервное копирование

### Что брать с сервера перед переустановкой

| Данные                      | Путь                                            | Приоритет |
| --------------------------- | ----------------------------------------------- | --------- |
| `.env.docker` файлы         | `/home/deploy/letar/apps/*/`                    | Критично  |
| Nginx Proxy Manager конфиги | `/home/deploy/letar/infra/nginx-proxy-manager/` | Критично  |
| Дампы PostgreSQL БД         | Создать через `pg_dump`                         | Критично  |
| SSL сертификаты NPM         | Через NPM backup                                | Важно     |

### Бэкап Nginx Proxy Manager

```bash
# На сервере — создать архив конфигов NPM
cd /home/deploy/letar/infra/nginx-proxy-manager
tar -czf ~/npm-backup-$(date +%Y%m%d).tar.gz data/

# На локальной машине — скачать архив
scp deploy@s1.letar.best:~/npm-backup-*.tar.gz C:\BackupSync\lena\s1\
```

### Бэкап PostgreSQL

```bash
# На сервере — дамп всех БД
for port in 5432 5433 5434 5437; do
  pg_dump -h localhost -p $port -U postgres postgres > ~/db-backup-$port-$(date +%Y%m%d).sql
done

# Скачать на локальную машину
scp deploy@s1.letar.best:~/db-backup-*.sql C:\BackupSync\lena\s1\backups\
```

### Проверка локальных бэкапов (Resilio Sync)

Бэкапы автоматически синхронизируются через Resilio Sync в `C:\BackupSync\lena\s1\`:

```
C:\BackupSync\lena\s1\
├── backups\          # Дампы БД (автобэкап)
├── .env.docker       # Переменные окружения (автосинхронизация)
└── npm-backup-*.tar.gz  # Ручные бэкапы NPM
```

---

## Часть 3: Переустановка Ubuntu

### Через панель хостинга

1. Войти в панель управления хостинга
2. Выбрать сервер → **Rebuild** / **Reinstall**
3. Выбрать **Ubuntu 24.04 LTS**
4. Дождаться завершения (5–15 минут)

### Обновить known_hosts на локальной машине

После переустановки ОС меняется SSH fingerprint:

```bash
# Удалить старый fingerprint
ssh-keygen -R s1.letar.best

# При первом подключении — принять новый fingerprint
ssh root@s1.letar.best
```

### Добавить SSH ключ (если sshpass недоступен)

Если на локальной машине нет `sshpass`, использовать Python с paramiko:

```python
# add-ssh-key.py
import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('s1.letar.best', username='root', password='<пароль-из-панели>')

# Прочитать публичный ключ
with open('C:/Users/Kami/.ssh/id_ed25519.pub') as f:
    pub_key = f.read().strip()

# Добавить ключ
client.exec_command(f'mkdir -p ~/.ssh && echo "{pub_key}" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys')
client.close()
print("SSH ключ добавлен")
```

```bash
pip install paramiko
python add-ssh-key.py
```

---

## Часть 4: Базовая настройка сервера

### Подключиться по SSH

```bash
ssh root@s1.letar.best
```

### Отключить вход по паролю

```bash
# Ubuntu 24.04 использует отдельный файл конфигурации
cat /etc/ssh/sshd_config.d/50-cloud-init.conf

# Отключить аутентификацию по паролю
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config.d/50-cloud-init.conf

# Запретить вход root по паролю (ключи оставить разрешёнными)
echo "PermitRootLogin prohibit-password" >> /etc/ssh/sshd_config.d/50-cloud-init.conf

# Перезапустить SSH
systemctl restart sshd
```

### Создать пользователя deploy

```bash
# Создать пользователя
useradd -m -s /bin/bash deploy
usermod -aG sudo deploy

# Добавить SSH ключ
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### Установить fail2ban

```bash
apt update
apt install -y fail2ban

# Включить защиту SSH (настройки по умолчанию достаточны)
systemctl enable fail2ban
systemctl start fail2ban

# Проверить статус
fail2ban-client status sshd
```

### Установить Docker

```bash
# Официальный скрипт установки
curl -fsSL https://get.docker.com | sh

# Добавить пользователя deploy в группу docker
usermod -aG docker deploy

# Включить автозапуск
systemctl enable docker
systemctl start docker

# Проверить
docker --version
docker compose version
```

> После `usermod -aG docker deploy` нужно перелогиниться для применения групп.

---

## Часть 5: Восстановление приложений

### Переключиться на пользователя deploy

```bash
su - deploy
# или подключиться заново: ssh deploy@s1.letar.best
```

### Установить Resilio Sync

```bash
# Добавить репозиторий и установить
curl -fsSL https://linux-packages.resilio.com/resilio-sync/key.asc | sudo gpg --dearmor -o /usr/share/keyrings/resilio-sync.gpg
echo "deb [signed-by=/usr/share/keyrings/resilio-sync.gpg] http://linux-packages.resilio.com/resilio-sync/deb resilio-sync non-free" | sudo tee /etc/apt/sources.list.d/resilio-sync.list
sudo apt update && sudo apt install -y resilio-sync

# Запустить от имени пользователя deploy
sudo systemctl enable resilio-sync@deploy
sudo systemctl start resilio-sync@deploy
```

После установки открыть веб-интерфейс `http://s1.letar.best:8888` и добавить папки синхронизации
из существующих ключей Resilio (ключи хранятся в панели на другом устройстве).

### Клонировать репозиторий

```bash
mkdir -p /home/deploy/letar
cd /home/deploy/letar
git clone git@github.com:<org>/lena.git .

# Установить зависимости
curl -fsSL https://bun.sh/install | bash
bun install
```

### Восстановить .env.docker из бэкапа

Файлы `.env.docker` хранятся в `C:\BackupSync\lena\s1\` и синхронизируются через Resilio Sync.

После того как Resilio Sync синхронизирует папку, скопировать файлы:

```bash
# На локальной машине — отправить файлы на сервер
scp C:\BackupSync\lena\s1\.env.docker deploy@s1.letar.best:/home/deploy/letar/

# Или подождать автосинхронизации Resilio, затем скопировать вручную
cp ~/sync/lena-s1/.env.docker /home/deploy/letar/
```

### Запустить Nginx Proxy Manager

NPM должен быть первым — он обеспечивает SSL и роутинг для всех приложений:

```bash
cd /home/deploy/letar/infra/nginx-proxy-manager
docker compose up -d

# Проверить запуск
docker compose ps
docker compose logs -f
```

### Восстановить конфигурацию NPM из бэкапа

```bash
# Остановить NPM
docker compose down

# Распаковать бэкап
tar -xzf ~/npm-backup-20260224.tar.gz -C /home/deploy/letar/infra/nginx-proxy-manager/

# Запустить снова
docker compose up -d
```

Если бэкап хранится локально — сначала загрузить на сервер:

```bash
scp C:\BackupSync\lena\s1\npm-backup-20260224.tar.gz deploy@s1.letar.best:~/
```

### Задеплоить приложения s1

Порядок деплоя важен — NPM уже запущен первым:

```bash
cd /home/deploy/letar

# 2. Аналитика
./deploy-affected.sh --app umami

# 3. Основные приложения
./deploy-affected.sh --app premium-rosstil
./deploy-affected.sh --app imot
```

### Восстановление БД из бэкапов

Если БД пустые после деплоя (миграции создали схему, но данных нет):

```bash
# Скопировать дампы на сервер
scp C:\BackupSync\lena\s1\backups\db-backup-5432-*.sql deploy@s1.letar.best:~/

# Восстановить (пример для premium-rosstil на порту 5432)
docker exec -i premium-rosstil-db psql -U postgres postgres < ~/db-backup-5432-20260221.sql
```

### Проверка работы сайтов

```bash
# Проверить статус контейнеров
docker ps

# Проверить доступность сайтов
curl -I https://premium-rosstil.ru
curl -I https://imot.ru
curl -I https://mandala.ru
```

---

## Справочник: Приложения s1

| Приложение          | Порт        | БД порт | Домен                  |
| ------------------- | ----------- | ------- | ---------------------- |
| nginx-proxy-manager | 80, 443, 81 | —       | (прокси для всех)      |
| premium-rosstil     | 3000        | 5432    | _(коммерческий домен)_ |
| imot                | 3001        | 5433    | _(коммерческий домен)_ |

> **s2.letar.best** (основной сервер): dashboard, driving-school, mandala, kami, pravda, animatrona-landing, animatrona-tracker, umami, auth-hub, archetest, time, grandslamcup и др.

---

## Профилактика: что настроить после восстановления

- [ ] **fail2ban** — защита от брутфорса SSH
- [ ] **Отключить вход по паролю** — только SSH ключи
- [ ] **Автобэкап БД** — скрипт в cron, синхронизация через Resilio
- [ ] **Мониторинг CPU** — настроить алерты при >80% нагрузке
- [ ] **Регулярные обновления** — `apt upgrade` еженедельно
- [ ] **Resilio Sync** — убедиться что `.env.docker` и `backups/` синхронизируются
