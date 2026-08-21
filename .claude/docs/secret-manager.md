# Secret Manager — SOPS + age

Инструмент управления секретами для монорепо letar. Реализован в Этапе 0.4 (2026-06-11).

## Архитектура

```
.env.docker          ← plaintext, в .gitignore, НИКОГДА не коммитить
.env.docker.enc      ← зашифрован age, коммитится в git ✅
.sops.yaml           ← публичный ключ, в git ✅
~/.age/letar-key.txt ← приватный ключ, ТОЛЬКО локально + KeePassXC
```

- **Инструмент:** [SOPS](https://github.com/getsops/sops) v3.12.2 + [age](https://github.com/FiloSottile/age) v1.3.1
- **Ключ:** один age-ключ для всего монорепо, один владелец
- **Публичный ключ:** `age1v0vhymhfxupa66zvrmqxv2yz4q0d8xxazh2m4k87tl0wk3ccmu4sftywza`
- **Приватный ключ:** хранится в `C:\Users\Kami\.age\letar-key.txt` и в KeePassXC → запись **«letar age-key»**

---

## Установка (разово, Windows)

```powershell
winget install FiloSottile.age
winget install SecretsOPerationS.SOPS
```

Проверить:

```powershell
age --version    # v1.3.1
sops --version   # 3.12.2
```

---

## Ключ: восстановление из KeePassXC

Если файл `~/.age/letar-key.txt` потерян — восстановить из KeePassXC:

```powershell
New-Item -ItemType Directory -Force "$HOME\.age"
# Открыть KeePassXC → запись "letar age-key" → скопировать содержимое поля "Notes" или "Password"
# Вставить в файл (формат: три строки — комментарий, # public key: ..., AGE-SECRET-KEY-1...)
notepad "$HOME\.age\letar-key.txt"
icacls "$HOME\.age\letar-key.txt" /inheritance:r /grant:r "${env:USERNAME}:F"
```

Убедиться что ключ работает:

```powershell
$env:SOPS_AGE_KEY_FILE = "$HOME\.age\letar-key.txt"
sops --decrypt apps/auth-hub/.env.docker.enc | Select-Object -First 3
# Должно вывести первые строки файла без ошибок
```

---

## Постоянная настройка переменной окружения (Windows)

Чтобы не писать `$env:SOPS_AGE_KEY_FILE = ...` каждый раз:

```powershell
[System.Environment]::SetEnvironmentVariable(
  "SOPS_AGE_KEY_FILE",
  "$HOME\.age\letar-key.txt",
  "User"
)
# Перезапустить терминал — переменная подхватится автоматически
```

Проверить:

```powershell
echo $env:SOPS_AGE_KEY_FILE
# C:\Users\Kami\.age\letar-key.txt
```

---

## Повседневная работа с секретами

### Просмотр зашифрованного файла

```powershell
sops --decrypt apps/auth-hub/.env.docker.enc
```

### Редактирование

SOPS открывает файл в `$EDITOR`, расшифровывает, после сохранения — шифрует обратно:

```powershell
$env:EDITOR = "code --wait"   # VS Code (если не задан глобально)
sops apps/auth-hub/.env.docker.enc
```

На Windows также работает через notepad++, но нужен `--wait`:

```powershell
$env:EDITOR = "notepad"
sops apps/auth-hub/.env.docker.enc
```

### Шифрование нового приложения

```powershell
sops --encrypt --output apps/<app>/.env.docker.enc apps/<app>/.env.docker
git add apps/<app>/.env.docker.enc
git commit -m "feat(<app>): добавить зашифрованный .env.docker.enc"
```

### Добавление новой переменной в уже зашифрованный файл

```powershell
# 1. Расшифровать → отредактировать plaintext → перешифровать
sops --decrypt apps/<app>/.env.docker.enc > apps/<app>/.env.docker.tmp
# Отредактировать .env.docker.tmp
sops --encrypt --output apps/<app>/.env.docker.enc apps/<app>/.env.docker.tmp
Remove-Item apps/<app>/.env.docker.tmp
git add apps/<app>/.env.docker.enc
```

Или через `sops edit` (см. выше).

### ⛔ `/sync-env` больше не используется

Раньше `.env.docker` возили на серверы по SSH (`scripts/sync-env-docker.sh`, команда `/sync-env`).
**С переходом на SOPS этот путь мёртв** — не запускай его.

Источник истины теперь один: **`.env.docker.enc` в git**. Плейнтекстовый `.env.docker` на
сервере — производный артефакт: `deploy-affected.sh` вызывает `decrypt_sops_env()` на каждом
прогоне, расшифровывает `.enc` поверх него и ставит `chmod 600`. Всё, что положили туда руками,
затрётся при следующем деплое.

Поэтому правильный цикл изменения секрета — **правка `.enc` и коммит**, а доставку делает деплой:

```powershell
sops apps/<app>/.env.docker.enc     # открывает расшифрованный файл в $EDITOR
git add apps/<app>/.env.docker.enc
git commit -m "chore(<app>): обновить секрет X"
# дальше — обычный deploy-request к deploy-agent-dev
```

⚠️ **Симптом, который сбивает с толку:** если посмотреть на сервере плейнтекстовый `.env.docker`
и не найти там переменную, это **не значит**, что её нет в системе — скорее всего checkout
приложения просто отстаёт от коммита, где её добавили, и деплой всё починит сам. Проверять надо
`.enc` в актуальном `main`, а не файл на сервере. Прецедент (2026-07-29): деплой Ключницы был
остановлен из-за «отсутствующего» `OIDC_APREL8008_SECRET`, который на самом деле лежал в git
с момента регистрации клиента.

⚠️ **Никогда не «чини» недостающий секрет генерацией нового.** Секреты OIDC-клиентов — общая
пара между Ключницей и приложением; новый секрет на одной стороне ломает вход. Сначала проверь,
нет ли значения в `.enc` другой стороны.

---

## Подготовка сервера (разово, s1 и s2)

### 1. Установить sops и age на сервере

```bash
# sops
curl -LO https://github.com/getsops/sops/releases/download/v3.12.2/sops-v3.12.2.linux.amd64
chmod +x sops-v3.12.2.linux.amd64
sudo mv sops-v3.12.2.linux.amd64 /usr/local/bin/sops

# age
curl -LO https://github.com/FiloSottile/age/releases/download/v1.3.1/age-v1.3.1-linux-amd64.tar.gz
tar xf age-v1.3.1-linux-amd64.tar.gz
sudo mv age/age age/age-keygen /usr/local/bin/
rm -rf age age-v1.3.1-linux-amd64.tar.gz

# Проверить
sops --version && age --version
```

### 2. Создать папку и положить ключ

```bash
mkdir -p /home/deploy/.age
chmod 700 /home/deploy/.age

# Открыть KeePassXC → "letar age-key" → скопировать приватный ключ
nano /home/deploy/.age/letar-key.txt
# Вставить три строки:
#   # created: ...
#   # public key: age1v0vhymhfxupa66zvrmqxv2yz4q0d8xxazh2m4k87tl0wk3ccmu4sftywza
#   AGE-SECRET-KEY-1...

chmod 600 /home/deploy/.age/letar-key.txt
chown deploy:deploy /home/deploy/.age/letar-key.txt
```

### 3. Задать SOPS_AGE_KEY_FILE в окружении deploy

```bash
echo 'export SOPS_AGE_KEY_FILE=/home/deploy/.age/letar-key.txt' >> /home/deploy/.bashrc
source /home/deploy/.bashrc

# Проверить
echo $SOPS_AGE_KEY_FILE
sops --decrypt /home/deploy/letar/apps/auth-hub/.env.docker.enc | head -3
```

### 4. Как deploy-affected.sh использует ключ

`deploy-affected.sh` вызывает функцию `decrypt_sops_env()` в начале деплоя каждого приложения:

- Если `apps/<app>/.env.docker.enc` существует → расшифровать в `apps/<app>/.env.docker`
- Если `SOPS_AGE_KEY_FILE` не задан → деплой падает с понятным сообщением
- Если `.env.docker.enc` нет → ничего не делается (backward compat)

---

## Подключение нового приложения

Тираж завершён — специального «догоняющего» прогона больше не нужно, шифруется только новое
приложение при первом деплое:

```powershell
$env:SOPS_AGE_KEY_FILE = "$HOME\.age\letar-key.txt"
sops --encrypt --output apps/<app>/.env.docker.enc apps/<app>/.env.docker
git add apps/<app>/.env.docker.enc
git commit -m "feat(<app>): зашифрованный .env.docker.enc"
```

Дальше `.env.docker` живёт только локально (он в `.gitignore`), а на сервер попадает
расшифровкой из `.enc` при деплое.

**Про pre-commit хук.** `scripts/hooks/pre-commit-sops.sh` авто-перешифровывает `.env.docker` →
`.enc` перед коммитом, но он **не установлен по умолчанию** — ставится вручную после клонирования
(см. `CLAUDE.md` § «Git hooks»). Не рассчитывай, что он есть у всех: правку `.enc` всё равно
проверяй глазами перед `git commit`.

---

## Статус

**Тираж завершён.** Все **23** приложения с `.env.docker` имеют `.enc` в git; приложений на
plaintext-only не осталось. Актуальный список — одной командой:

```bash
for d in apps/*/; do [ -f "$d/.env.docker" ] && { [ -f "$d/.env.docker.enc" ] || echo "БЕЗ .enc: $d"; }; done
```

Пустой вывод = все зашифрованы.

> Прежняя таблица «auth-hub ✅ / остальные ⏳» удалена: она отражала состояние пилота
> (Этап 0.4) и с тех пор врала. Ручные таблицы такого рода протухают — держим проверку командой.
> **s1 в подготовке серверов ниже — исторический раздел:** сервер выведен из эксплуатации
> 2026-06-20, ключ актуален только на s2 (прод) и s3 (staging).

---

## Ротация ключа

Если приватный ключ скомпрометирован — нужна ротация:

```powershell
# 1. Сгенерировать новый ключ
age-keygen -o "$HOME\.age\letar-key-new.txt"
# Записать новый публичный ключ

# 2. Обновить .sops.yaml — заменить публичный ключ

# 3. Перешифровать все .enc файлы новым ключом
$env:SOPS_AGE_KEY_FILE = "$HOME\.age\letar-key.txt"  # старый — для расшифровки
Get-ChildItem -Recurse -Filter ".env.docker.enc" | ForEach-Object {
  $dir = $_.DirectoryName
  $plain = Join-Path $dir ".env.docker.tmp"
  sops --decrypt $_.FullName > $plain
  $env:SOPS_AGE_KEY_FILE = "$HOME\.age\letar-key-new.txt"  # новый — для шифровки
  sops --encrypt --output $_.FullName $plain
  $env:SOPS_AGE_KEY_FILE = "$HOME\.age\letar-key.txt"
  Remove-Item $plain
}

# 4. Сохранить новый ключ в KeePassXC, обновить на серверах
# 5. Удалить старый ключ
```

---

## .gitignore

```gitignore
.env.*
!**/.env.example
!**/.env.docker.example
!**/.env.staging.example
!**/.env.docker.enc    # ← зашифрованные файлы ОТСЛЕЖИВАЮТСЯ в git
```
