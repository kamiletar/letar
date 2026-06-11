---
alwaysApply: true
---

# Правила для .env файлов

## .env (локальная разработка)

⛔ **В `.env` файлах пиши ТОЛЬКО порт** (`PORT=XXXX`). Ничего больше.

Все остальные переменные (секреты, OAuth, DB credentials) — в `.env.local` или `.env.docker`.

**Причина:** `.env` коммитится в git. Любые секреты, даже dev-only, не должны туда попадать.

## .env.docker (продакшен)

- НЕ коммитить — синхронизация через `/sync-env`
- Содержит реальные секреты для Docker production

## .env.docker.enc (зашифрованный, SOPS + age)

- **Коммитить** — зашифрованная копия `.env.docker`, безопасна в git
- Создаётся: `sops --encrypt --output apps/<app>/.env.docker.enc apps/<app>/.env.docker`
- Редактируется: `sops apps/<app>/.env.docker.enc` (открывает в $EDITOR)
- После `/sync-env` обновить `.enc`: `sops --encrypt --output apps/<app>/.env.docker.enc apps/<app>/.env.docker`
- Требует `SOPS_AGE_KEY_FILE=$HOME\.age\letar-key.txt` (ключ из KeePassXC)
- Подробнее: [secret-manager.md](/.claude/docs/secret-manager.md)

## .env.local (локальная разработка)

- НЕ коммитить
- Содержит секреты для локальной разработки
- Переопределяет `.env`
