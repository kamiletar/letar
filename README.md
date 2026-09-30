# Letar

Открытый монорепозиторий студии Letar: библиотеки `@letar/*`, инструменты и открытые приложения.
Приватные проекты подключены как git submodules и в открытой копии недоступны.

[English](README.en.md) · [Сайт автора](https://kami.letar.best) · Лицензия MIT

## Главное

**Формы из схемы данных.** Описываешь модель в ZenStack, а формы, валидация Zod v4 и подсказки
собираются сами.

| Пакет                                                                                      | Что это                                        |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| [`@letar/forms`](https://www.npmjs.com/package/@letar/forms) ([исходники](libs/forms/))    | Формы на TanStack Form + Chakra UI v3          |
| [`@letar/zenstack-form-plugin`](https://www.npmjs.com/package/@letar/zenstack-form-plugin) | Плагин ZenStack: схемы форм из `schema.zmodel` |
| [`@letar/form-mcp`](https://www.npmjs.com/package/@letar/form-mcp)                         | MCP-сервер для работы с формами из ИИ-агентов  |

> Идёт подготовка к массовой публикации остальных библиотек (сначала как beta). Список пакетов
> ниже обновится, когда они появятся на npm.

## Что ещё лежит в `libs/`

В репозитории около 80 библиотек. Часть из них станет пакетами, часть останется внутренней:
UI-компоненты (`ui`, `undo-toast`), фоновые задачи (`jobs`), согласия и cookie (`consent`),
SSE, идемпотентность, валидация загрузок, SEO-помощники и другое. Смотри каталог [libs/](libs/).

## Открытые приложения

| Приложение                                 | Описание                               |
| ------------------------------------------ | -------------------------------------- |
| [form-docs](apps/form-docs/)               | Документация `@letar/forms` (Fumadocs) |
| [form-example](apps/form-example/)         | Витрина `@letar/forms`                 |
| [form-develop-app](apps/form-develop-app/) | Песочница для разработки форм          |
| [pravda](apps/pravda/)                     | Законодательство РФ (статический сайт) |
| [letar-landing](apps/letar-landing/)       | Лендинг студии                         |
| [animatrona](apps/animatrona/)             | Десктоп-приложение для видео           |
| [synth](apps/synth/)                       | Синтезатор                             |

## Быстрый старт

```bash
git clone --recurse-submodules git@github.com:kamiletar/letar.git
cd letar
bun install
bash scripts/hooks/install.sh   # git hooks, один раз

nx dev form-example             # dev-сервер
nx lint form-example
nx typecheck:tsgo form-example
nx test form-example
```

Приватные submodules у посторонних не выкачаются, это нормально: открытая часть собирается без них.
Форматирование: `nx run-many -t format --projects=<проекты>` (не голая `nx format`).

## Стек

Node 24 · Nx · Next.js (App Router) · React 19 · Chakra UI v3 · PostgreSQL + Prisma + ZenStack ·
TanStack Form · Zod v4 · Vitest · Playwright · oxlint + ESLint · dprint · Bun

## Как устроен репозиторий

```
letar/
├── apps/    # приложения (часть — приватные submodules)
├── libs/    # библиотеки @letar/*
├── infra/   # конфигурация серверов и прокси
├── scripts/ # проверки целостности, git hooks
└── .claude/ # инструкции и документация для ИИ-агентов
```

## Работа с ИИ-агентами

Репозиторий ведётся вместе с Claude Code. Правила, ловушки и решения записаны в
[CLAUDE.md](CLAUDE.md) и [.claude/docs/](.claude/docs/). Их полезно читать и людям: это
накопленная память проекта.
