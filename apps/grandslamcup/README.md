# Grand Slam Cup

Кубок Большого Слэма — первый в России командный поэтический турнир в формате poetry-clash. Живые таблицы, расписание, профили команд и поэтов, живой скоринг матчей с судейством через телефон.

## Стек

Версия — в [package.json](package.json) и топ-записи [CHANGELOG.md](CHANGELOG.md).

| Параметр    | Значение                    |
| ----------- | --------------------------- |
| **Порт**    | 3016                        |
| **Домен**   | grandslamcup.letar.best     |
| **Сервер**  | s2 (185.28.85.195)          |
| **Next.js** | 16                          |
| **React**   | 19                          |
| **UI**      | Chakra UI v3                |
| **Auth**    | Better Auth + Ключница OIDC |
| **БД**      | PostgreSQL + ZenStack       |

## Структура документации

| Файл                                   | Описание                      |
| -------------------------------------- | ----------------------------- |
| [PLAN.md](PLAN.md)                     | Техническое задание и roadmap |
| [PLAN_COMPLETED.md](PLAN_COMPLETED.md) | Выполненные задачи            |
| [PLAN_TESTING.md](PLAN_TESTING.md)     | План тестирования             |
| [CHANGELOG.md](CHANGELOG.md)           | История изменений             |

## Быстрый старт

```bash
nx dev grandslamcup            # Разработка
nx format grandslamcup         # Форматирование
nx lint grandslamcup           # oxlint → ESLint
nx typecheck:tsgo grandslamcup # Проверка типов
nx test grandslamcup           # Тесты
nx e2e grandslamcup-e2e        # E2E тесты
```

## База данных

```bash
nx zenstack:generate grandslamcup  # Генерация из schema.zmodel
nx db:push grandslamcup            # Push схемы в БД (dev)
nx db:migrate grandslamcup         # Миграция (prod)
nx db:studio grandslamcup          # GUI для БД
```

## Прогресс разработки

| Фаза                     | Статус    |
| ------------------------ | --------- |
| Фаза 1 — MVP             | Завершена |
| Фаза 2 — Расширение      | Завершена |
| Фаза 3 — КБС-Москва 2026 | Завершена |
| Фаза 4 — Улучшения       | Завершена |
| Деплой                   | Ожидает   |

## Тестирование

| Тип  | Количество | Статус    |
| ---- | ---------- | --------- |
| Unit | 0          | Ожидает   |
| E2E  | 28         | Завершено |

## Ключевые фичи

- **Живой скоринг** — экраны скорера, ведущего, судей, тренеров, проектора, зрительского голосования (WebSocket/SSE)
- **Швейцарская система + Double Elimination** — полная поддержка форматов КБС-Москва
- **Swiss Bracket** — визуализация в стиле CS2 Major (desktop + mobile)
- **City-Based Routing** — СПб и Москва на одной платформе
- **Кабинет тренера** — заявки на матч, управление составом, трансферы
- **PWA** — офлайн-поддержка, кеширование фото
- **Миграция данных** — AI-экстракция из Telegram (СПб + Москва, 142 матча, 1136 игроков)

## Методология

- **TDD:** Red → Green → Refactor
- **Коммиты:** feat/fix/refactor(grandslamcup): описание
- **Версионирование:** Semver (major.minor.patch)
- **Документация:** Обновлять при каждом изменении

---

**Последнее обновление:** 2026-04-08
