# Структура репозитория

## Публичный letar + приватные submodules

Основной репо `kamiletar/letar` — **публичный**. Несколько приложений и их зависимости вынесены в **приватные submodules**.

```
letar/ (public)
├── apps/
│   ├── aboi/                  → submodule (private: letar-private-aboi)
│   ├── aboi-e2e/              → submodule (private: letar-private-aboi-e2e)
│   ├── driving-school/        → submodule (private: letar-private-driving-school)
│   ├── driving-school-e2e/    → submodule (private)
│   ├── premium-rosstil/       → submodule (private)
│   ├── premium-rosstil-e2e/   → submodule (private)
│   ├── imot/                  → submodule (private)
│   ├── imot-e2e/              → submodule (private)
│   └── (остальные публичные: animatrona, dashboard, kami, и т.д.)
└── libs/
    ├── driving-school-db/     → submodule (private: letar-private-driving-school-db)
    └── (остальные публичные: forms, ui, auth, и т.д.)
```

**Приватных submodule всего 9** — по одному на каждый Nx-проект (Вариант A: 1 submodule = 1 Nx project).

## Клонирование

**С приватными submodules** (если есть доступ):
```bash
git clone --recurse-submodules git@github.com:kamiletar/letar.git
```

**Только публичная часть:**
```bash
git clone git@github.com:kamiletar/letar.git
# submodule папки будут пустыми
```

**Обновить submodule после клонирования:**
```bash
git submodule update --init --recursive
```

## Работа с submodule

### Изменение кода в submodule

```bash
cd apps/driving-school          # внутри submodule
git checkout main               # submodule по умолчанию в detached HEAD
git pull origin main            # получить последние изменения
# ... меняешь код ...
git add . && git commit -m "..."
git push origin main            # пуш в приватный репо

cd ../..                        # назад в letar root
git add apps/driving-school     # фиксируем новый SHA submodule
git commit -m "chore: bump driving-school submodule"
git push                        # пуш в публичный letar
```

### Обновить все submodules до последних версий

```bash
git submodule update --remote --recursive
git add .
git commit -m "chore: bump all submodules"
```

## Особенности

### .gitignore и Nx

⚠️ **НЕ добавляй пути submodule в `letar/.gitignore`** — Nx уважает .gitignore при сканировании проектов, и приватные проекты исчезнут из `nx show projects` / `nx affected`.

Submodule в Git — это **gitlink** (SHA-указатель), не директория с файлами. Git физически не закоммитит working tree submodule в родительский репо, даже если ты `git add` всю папку. Поэтому safety net в .gitignore не нужна.

### Generated файлы

Файлы в `src/generated/` некоторых приватных libs (например, `libs/driving-school-db/src/generated/prisma/`) **ДОЛЖНЫ быть закоммичены** в приватный репо (это типы Prisma). Не добавляй `src/generated/` в .gitignore приватных submodule'ов.

### .env.local / .env.docker

Эти файлы:
- НЕ tracked в letar (через корневой .gitignore)
- НЕ tracked в приватных submodule (через их .gitignore-шаблон)
- Лежат локально на диске в working tree
- Синхронизируются через `/sync-env` (см. `.claude/skills/sync-env`)

### CI/CD

GitHub Actions workflow'ы в публичном letar:
- Для публичных libs (`@letar/forms`, `@letar/form-mcp`, `@letar/zenstack-form-plugin`) — `publish-npm.yml` (триггер на тег) **не подтягивает приватные submodules** (им они не нужны).
- Для приложений, использующих приватные submodules — `actions/checkout@v4` с `submodules: recursive` и `token: ${{ secrets.PRIVATE_SUBMODULES_PAT }}`.

## Релиз-флоу (nx release)

**Локально:**
```bash
nx release          # bump, changelog, commit, tag, GitHub release
git push --follow-tags
```

CI триггерится на тег и публикует на npm. Подробности в `.claude/docs/deployment.md`.

## Миграция со старой структуры

Раньше монорепо называлось `lena`, scope `@lena/*`, релизы делались копированием исходников в отдельные публичные репо-зеркала (`kamiletar/letar-forms` и т.д.). Это устарело — теперь letar сам публичный, релизы напрямую из него.

Старые публичные зеркала (`kamiletar/letar-forms`, `kamiletar/letar-form-mcp`, `kamiletar/zenstack-form-plugin`, `kamiletar/animatrona`) можно удалить.
