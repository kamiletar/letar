# Secret Manager — SOPS + age

Инструмент управления секретами для монорепо letar. Решение принято в Этапе 0.4 (2026-06-05).

## Архитектура

- **Инструмент:** [SOPS](https://github.com/getsops/sops) v3.12.2 + [age](https://github.com/FiloSottile/age) v1.3.1
- **Схема:** `.env.docker` шифруется → `.env.docker.enc` коммитится в git
- **Ключ:** приватный age-ключ хранится в KeePassXC (никогда не в git)
- **Конфиг:** `.sops.yaml` в корне репо задаёт публичный ключ для шифрования

## Установка (Windows)

```powershell
winget install FiloSottile.age
winget install SecretsOPerationS.SOPS
```

## Генерация ключа (разово)

```powershell
New-Item -ItemType Directory -Force "$HOME\.age"
age-keygen -o "$HOME\.age\letar-key.txt"
# Сохранить содержимое letar-key.txt в KeePassXC → запись "letar age-key"
```

## Конфиг .sops.yaml

Файл в корне репо. `path_regex` покрывает оба имени (при шифровании и расшифровке):

```yaml
creation_rules:
  - path_regex: \.env\.docker(\.enc)?$
    age: age1v0vhymhfxupa66zvrmqxv2yz4q0d8xxazh2m4k87tl0wk3ccmu4sftywza
```

## Шифрование нового приложения

```powershell
$env:SOPS_AGE_KEY_FILE = "$HOME\.age\letar-key.txt"
sops --encrypt --output apps/<app>/.env.docker.enc apps/<app>/.env.docker
git add apps/<app>/.env.docker.enc
```

## Редактирование зашифрованного файла

```powershell
$env:SOPS_AGE_KEY_FILE = "$HOME\.age\letar-key.txt"
sops apps/<app>/.env.docker.enc   # откроет в $EDITOR
```

## Расшифровка вручную

```powershell
$env:SOPS_AGE_KEY_FILE = "$HOME\.age\letar-key.txt"
sops --decrypt apps/<app>/.env.docker.enc
```

## Деплой на сервере

`deploy-affected.sh` автоматически расшифровывает `.env.docker.enc` → `.env.docker` если задана переменная `SOPS_AGE_KEY_FILE`.

### Подготовка сервера s2 (разово)

```bash
# 1. Установить sops и age на сервере
curl -LO https://github.com/getsops/sops/releases/download/v3.12.2/sops-v3.12.2.linux.amd64
chmod +x sops-v3.12.2.linux.amd64 && sudo mv sops-v3.12.2.linux.amd64 /usr/local/bin/sops

curl -LO https://github.com/FiloSottile/age/releases/download/v1.3.1/age-v1.3.1-linux-amd64.tar.gz
tar xf age-v1.3.1-linux-amd64.tar.gz && sudo mv age/age age/age-keygen /usr/local/bin/

# 2. Создать папку ключа
mkdir -p /home/deploy/.age
chmod 700 /home/deploy/.age

# 3. Скопировать приватный ключ из KeePassXC на сервер
# Вставить содержимое AGE-SECRET-KEY-1... в файл:
nano /home/deploy/.age/letar-key.txt
chmod 600 /home/deploy/.age/letar-key.txt
chown deploy:deploy /home/deploy/.age/letar-key.txt

# 4. Добавить в ~/.bashrc пользователя deploy
echo 'export SOPS_AGE_KEY_FILE=/home/deploy/.age/letar-key.txt' >> /home/deploy/.bashrc
```

## Статус пилота

| Приложение   | .env.docker.enc | Подготовлено                |
| ------------ | --------------- | --------------------------- |
| **auth-hub** | ✅ в git        | ✅ пилот Этап 0.4           |
| остальные    | ⏳ планово      | после настройки ключа на s2 |

## Тираж на остальные приложения

После того как ключ установлен на s2 и деплой auth-hub проверен — зашифровать остальные `.env.docker`:

```powershell
$env:SOPS_AGE_KEY_FILE = "$HOME\.age\letar-key.txt"
$apps = @("kami", "dashboard", "driving-school", "archetest", "grandslamcup", "animatrona-tracker", "aboi", "dsperevod", "premium-rosstil", "imot")
foreach ($app in $apps) {
  $src = "apps/$app/.env.docker"
  $dst = "apps/$app/.env.docker.enc"
  if (Test-Path $src) {
    sops --encrypt --output $dst $src
    git add $dst
    Write-Host "✅ $app"
  }
}
```

## .gitignore

```gitignore
.env.*
!**/.env.example
!**/.env.docker.example
!**/.env.staging.example
!**/.env.docker.enc   # ← зашифрованные файлы ОТСЛЕЖИВАЮТСЯ в git
```
