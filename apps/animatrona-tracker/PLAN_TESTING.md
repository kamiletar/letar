# План тестирования — Animatrona Tracker

## Статистика

| Тип         | Количество | Статус      |
| ----------- | ---------- | ----------- |
| Unit        | 0          | Планируется |
| Integration | 1          | В процессе  |
| E2E         | 10         | ✅ Готово   |

## Запуск тестов

```bash
# Unit/Integration тесты
nx test animatrona-tracker

# E2E тесты
nx e2e animatrona-tracker-e2e

# Линтинг
nx lint animatrona-tracker

# Проверка типов
nx typecheck:tsgo animatrona-tracker
```

## План по фазам

### Фаза 1: Unit тесты

- [ ] IPFS CID валидация
- [ ] API Key генерация/валидация
- [ ] Фильтры каталога

### Фаза 2: Integration тесты

- [x] API публикации аниме — гонка `POST /api/anime` по `directoryCid` (2026-08-21),
      [route.spec.ts](/apps/animatrona-tracker/src/app/api/anime/route.spec.ts)
- [ ] API получения списка
- [ ] Access control policies

### Фаза 3: E2E тесты ✅ (базовый сьют, 2026-07-18)

`apps/animatrona-tracker-e2e` — Playwright, chromium, 10 тестов без БД-мутаций:

- [x] Главная страница — hero-секция
- [x] Каталог аниме — публичная загрузка, счётчик "Найдено"
- [x] Каталог — 404 для несуществующего аниме
- [x] Sign-in/Sign-up — формы видны, OAuth-кнопки
- [x] RSS-фид `/api/rss/feed.xml` отдаёт валидный XML
- [x] `/leaderboard`, `/profile` редиректят неавторизованных на `/sign-in`
- [x] Поиск в каталоге — debounce 400мс обновляет `?q=` в URL
- [x] Поиск — "Ничего не найдено" для несуществующего запроса
- [x] Сортировка каталога — переключение обновляет `?sort=`
- [x] `/admin` — редирект неавторизованных; для ADMIN (dev-session) — дашборд, список пользователей, вкладка "Пин-серверы"

**Авторизация в тестах:** `createDevSessionRoute` из `@letar/auth/server` (конвенция монорепо, см.
`.claude/docs/e2e-testing.md` — grandslamcup/auth-hub). Новый роут `src/app/api/auth/dev-session/route.ts`.
Требует `ALLOW_DEV_SESSION=true` + `DEV_SESSION_TOKEN` **только** в `.env.staging`/окружении e2e-раннера,
никогда в `.env.docker` (см. `.claude/rules/env-files.md`).

- [ ] Создание API ключа
- [ ] Модерация контента (approve/reject) — требует БД-мутаций, вне скоупа базового сьюта

## Особенности тестирования

### IPFS интеграция

Для тестирования IPFS-зависимого функционала:

- Mock IPFS Gateway для unit тестов
- Локальный IPFS node для integration тестов

### OAuth

- Mock Better Auth для unit/integration
- storageState для E2E (авторизованные сценарии)

---

**Последнее обновление:** 2026-03-19
