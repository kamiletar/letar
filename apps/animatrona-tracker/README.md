# Animatrona Tracker

Веб-платформа для каталога аниме, видеоплеера из IPFS и модерации контента. Полноценная замена Electron-библиотеки для обычных пользователей через браузер.

## Документация

| Файл                                   | Описание                             |
| -------------------------------------- | ------------------------------------ |
| [README.md](README.md)                 | Обзор проекта, установка, команды    |
| [PLAN.md](PLAN.md)                     | Текущие задачи, TODO, roadmap        |
| [PLAN_COMPLETED.md](PLAN_COMPLETED.md) | Завершённые фичи по версиям          |
| [PLAN_TESTING.md](PLAN_TESTING.md)     | План и статистика тестирования       |
| [CHANGELOG.md](CHANGELOG.md)           | История изменений (Keep a Changelog) |

## Возможности

- Каталог аниме с фильтрами (жанр, год, поиск), сортировкой и пагинацией
- Видеоплеер (Shaka + SubtitlesOctopus) с аудио/субтитрами из IPFS
- Прогресс просмотра в БД + "Продолжить просмотр"
- Облачная библиотека (синхронизация с Desktop)
- Франшизы (граф React Flow + список + таймлайн)
- Комментарии к аниме (с ответами)
- Рекомендации "Похожие аниме" по жанрам
- Hover preview скриншотов на карточках эпизодов
- Лидерборд загрузчиков (uploaderScore + ранги)
- RSS фиды для новых релизов и по жанрам
- Shikimori синхронизация (OAuth + импорт оценок)
- Модерация с батч-операциями, diff треков, аудит-логом
- Пиннинг на IPFS серверах (pin-queue + Kubo RPC) с автоочисткой старых CID
- OAuth аутентификация (Google, Yandex, VK)

## Технологический стек

- **Next.js 16.1** — App Router, Server Components
- **React 19** — Latest features
- **Chakra UI v3** — UI компоненты
- **ZenStack 3.4** — ORM + Access Control
- **PostgreSQL 16** — База данных
- **Better Auth** — Аутентификация (OAuth)
- **Redis** — Кэширование (лидерборд, профили, жанры)
- **Shaka Player + SubtitlesOctopus** — Видеоплеер

## Разработка

```bash
# Запуск dev сервера
nx dev animatrona-tracker

# Открыть http://localhost:3009
```

### Переменные окружения

```bash
cp apps/animatrona-tracker/.env.example apps/animatrona-tracker/.env
```

### База данных

```bash
nx zenstack:generate animatrona-tracker
nx db:push animatrona-tracker        # dev
nx db:migrate animatrona-tracker     # production
nx db:seed animatrona-tracker
nx db:studio animatrona-tracker
```

## Деплой

```bash
# Production
./deploy-affected.sh --app animatrona-tracker

# Или вручную
nx build animatrona-tracker
```

Домен: `animatrona-tracker.letar.best` (сервер s1)

## Конфигурация

| Параметр        | Значение                      |
| --------------- | ----------------------------- |
| Порт dev        | 3009                          |
| Порт production | 3010                          |
| Порт PostgreSQL | 5439                          |
| Домен           | animatrona-tracker.letar.best |
| IPFS Gateway    | gateway.letar.best            |

---

**Последнее обновление:** 2026-03-19
