---
paths: apps/animatrona/**/*
---

# Animatrona — Работа с SQLite базой данных

## ⛔ ЗАПРЕЩЕНО

**НЕ используй `sqlite3` CLI напрямую:**

```bash
# ❌ НЕПРАВИЛЬНО — sqlite3 может не быть установлен, проблемы с путями Windows
sqlite3 "C:/Users/Kami/AppData/Roaming/@letar/animatrona/data/app.db" "SELECT ..."
```

## ✅ Правильные способы

### 1. Prisma Studio (рекомендуется для просмотра данных)

```bash
# Открывает веб-интерфейс для просмотра и редактирования данных
nx db:studio animatrona
```

### 2. Через IPC в renderer (для кода)

```typescript
// В renderer процессе — используй Prisma через IPC
const anime = await window.electronAPI.db.anime.findMany()
```

### 3. Прямой запрос через better-sqlite3 в main (для отладки)

```typescript
// В main процессе
import Database from 'better-sqlite3'
import { getDbPath } from './services/db/db-path'

const db = new Database(getDbPath())
const result = db.prepare('SELECT id, name FROM Anime').all()
```

### 4. Логи приложения

Для отладки смотри логи Animatrona — они содержат информацию о состоянии БД, ошибках импорта и т.д.

## Расположение файлов БД

| Окружение  | Путь                                                                 |
| ---------- | -------------------------------------------------------------------- |
| Dev        | `apps/animatrona/prisma/data/app.db`                                 |
| Production | `%APPDATA%/@letar/animatrona/data/app.db` (Windows)                   |
|            | `~/Library/Application Support/@letar/animatrona/data/app.db` (macOS) |

## Если нужно проверить данные в БД

1. **Попроси пользователя** открыть Prisma Studio: `nx db:studio animatrona`
2. **Или попроси скриншот** из приложения
3. **Или попроси экспортировать** данные через UI приложения

Не пытайся напрямую обращаться к файлу БД через CLI — это ненадёжно и платформозависимо.
