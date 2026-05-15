# Правила Git

## Формат коммитов

```
<type>(<scope>): <description>

[optional body]
```

### Типы

| Тип        | Описание                            |
| ---------- | ----------------------------------- |
| `feat`     | Новая функциональность              |
| `fix`      | Исправление бага                    |
| `refactor` | Рефакторинг без изменения поведения |
| `docs`     | Документация                        |
| `test`     | Тесты                               |
| `chore`    | Обслуживание (deps, config)         |
| `style`    | Форматирование кода                 |
| `perf`     | Оптимизация производительности      |

### Scope

- `premium-rosstil`, `imot`, `dashboard` — приложения
- `ui`, `form-components`, `label-printer-core` — библиотеки
- `deps` — зависимости
- `config` — конфигурация

## Ветки

```
main                    # Production
├── feature/<name>      # Новые фичи
├── fix/<name>          # Баг-фиксы
├── refactor/<name>     # Рефакторинг
└── chore/<name>        # Обслуживание
```

## Правила

- Коммиты на русском или английском (единообразно в проекте)
- Один коммит = одно логическое изменение
- Не коммитить `.env`, `node_modules`, `dist`
- Делать коммит сразу после готовых изменений
- Перед push: lint + typecheck + test

## Работа в монорепозитории с другими агентами

⚠️ **КРИТИЧНО:** В этом репозитории могут одновременно работать несколько агентов над разными проектами.

**ЗАПРЕЩЕНО:**

- `git reset HEAD` — сбросит изменения других агентов
- `git reset --hard` — потеряет изменения других агентов
- `git checkout -- .` — откатит изменения других агентов
- `git stash` без явной необходимости — спрячет чужие изменения

**ПРАВИЛЬНЫЙ ПОДХОД:**

```bash
# ✅ Добавляй только свои файлы
git add apps/my-app/

# ✅ Коммить только свои изменения
git commit -m "feat(my-app): описание"

# ❌ НЕ делай reset если видишь чужие файлы в staging
# ❌ НЕ делай git add . в монорепо
```

**Если видишь чужие файлы в `git status`:**

1. Игнорируй их — это работа других агентов
2. Добавляй только свои файлы через `git add apps/<твой-проект>/`
3. Коммить только свои изменения

**Если MCP Agent Mail запущен:**

- Перед редактированием `libs/**` — проверь резервации через `file_reservation_paths`
- Зарезервируй свои файлы при старте сессии

## Работа с приватными submodule

Приватные приложения (aboi, driving-school, premium-rosstil, imot + их e2e и driving-school-db) — это **git submodules**, указывающие на репо `kamiletar/letar-private-*`. Подробнее: [repo-structure](/.claude/docs/repo-structure.md).

### Изменение кода в submodule

```bash
cd apps/driving-school          # внутри submodule
git checkout main               # submodule по умолчанию в detached HEAD
git pull origin main
# ... меняешь код ...
git add . && git commit -m "feat(driving-school): описание"
git push origin main            # пуш в приватный репо

cd ../..                        # назад в letar
git add apps/driving-school     # фиксируем новый SHA submodule
git commit -m "chore: bump driving-school submodule"
git push                        # пуш в публичный letar
```

### Что НЕ делать

- ❌ **НЕ редактируй файлы submodule без `git checkout main`** — изменения попадут в detached HEAD и потеряются при следующем `git submodule update`.
- ❌ **НЕ добавляй пути submodule в корневой `.gitignore`** — Nx уважает gitignore при сканировании проектов и приватные проекты исчезнут из `nx show projects` / `nx affected`. Submodule в Git хранится как gitlink (SHA), физически working tree не закоммитится в родительский репо без `.gitignore` страховки.
- ❌ **НЕ добавляй `src/generated/` в .gitignore submodule** если эта папка раньше была tracked (например, `libs/driving-school-db/src/generated/prisma/` — это типы Prisma, должны быть в репо).

### Обновить все submodules до последних коммитов

```bash
git submodule update --remote --recursive
git add .
git commit -m "chore: bump all submodules"
```
