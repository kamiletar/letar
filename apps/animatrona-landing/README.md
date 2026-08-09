# Animatrona Landing

Лендинг для десктопного приложения Animatrona.

## Документация

| Файл                                   | Описание                             |
| -------------------------------------- | ------------------------------------ |
| [README.md](README.md)                 | Обзор проекта, установка, команды    |
| [PLAN.md](PLAN.md)                     | Текущие задачи, TODO, roadmap        |
| [PLAN_COMPLETED.md](PLAN_COMPLETED.md) | Завершённые фичи по версиям          |
| [PLAN_TESTING.md](PLAN_TESTING.md)     | План и статистика тестирования       |
| [CHANGELOG.md](CHANGELOG.md)           | История изменений (Keep a Changelog) |

## Описание

Лендинг-страница для продвижения и загрузки Electron приложения Animatrona — инструмента для транскодирования и просмотра аниме с поддержкой IPFS.

## Функциональность

- Hero секция с информацией о приложении
- Features секция с описанием возможностей
- Downloads секция со ссылками на релизы (интеграция с GitHub API)
- FAQ секция с часто задаваемыми вопросами
- Tech Stack секция с используемыми технологиями
- Responsive дизайн с mobile menu
- Анимации (Framer Motion): typing effect, animated counters, stagger animations
- Автоопределение платформы пользователя (Windows/macOS/Linux)
- Accessibility: skip link, контрастный текст

## Технологии

| Компонент | Технология     |
| --------- | -------------- |
| Фреймворк | Next.js 16     |
| UI        | Chakra UI v3   |
| Анимации  | Framer Motion  |
| Иконки    | Font Awesome 6 |

## Команды

```bash
# Разработка
nx dev animatrona-landing

# Сборка
nx build animatrona-landing

# Линтинг
nx lint animatrona-landing

# Проверка типов
nx typecheck:tsgo animatrona-landing
```

## Деплой

```bash
# Docker production build
docker-compose -f apps/animatrona-landing/docker-compose.production.yml up -d
```

## Связанные проекты

- [@letar/animatrona](../animatrona/README.md) — Desktop приложение

---

**Последнее обновление:** 2026-01-10
