# Form Docs

Документация для библиотеки @letar/forms на базе [Fumadocs](https://fumadocs.vercel.app/).

## Документация

| Файл                         | Описание                          |
| ---------------------------- | --------------------------------- |
| [README.md](README.md)       | Обзор проекта, установка, команды |
| [CHANGELOG.md](CHANGELOG.md) | История изменений                 |

## Запуск

```bash
nx dev form-docs  # порт 3020
```

**Продакшн:** [forms.letar.best](https://forms.letar.best)

## Структура

```
apps/form-docs/
├── src/
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx                    # Главная
│       ├── [lang]/                     # Мультиязычность
│       │   ├── (home)/page.tsx         # Landing
│       │   └── docs/[[...slug]]/page.tsx  # MDX документация
│       └── demo/                       # Интерактивные демо
│           ├── auto-fields/
│           ├── basic/
│           ├── conditional/
│           ├── date/
│           ├── fields-all/
│           ├── groups/
│           ├── multi-step/
│           ├── number/
│           ├── select/
│           ├── specialized/
│           ├── string/
│           └── validation/
├── content/                            # MDX контент
├── next.config.mjs                     # Fumadocs MDX интеграция
├── package.json
└── docker-compose.production.yml       # Деплой (порт 3020)
```

## Связанные проекты

- [/libs/forms](../../libs/forms/) — библиотека @letar/forms
- [/libs/form-mcp](../../libs/form-mcp/) — MCP сервер для AI-ассистентов (npm: @letar/form-mcp)
- [/apps/form-example](../form-example/) — showcase приложение
- [/apps/form-develop-app](../form-develop-app/) — песочница разработки

---

**Версия:** 0.1.0
**Последнее обновление:** 2026-03-31
