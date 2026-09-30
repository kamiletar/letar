---
name: zenstack-helper
description: |
  Схема БД на ZenStack v3: правка schema.zmodel, relations, политики @@allow/@@deny и полевые @allow/@deny,
  @meta("form.*") для форм, custom procedures, миграции. Загружай ДО первой правки *.zmodel и когда
  политика отказывает на записи, поле relation тихо приходит null, падает zenstack:generate или TS2321.
paths:
  - "**/*.zmodel"
---

# ZenStack Helper

Помощник по ZenStack schema.zmodel (v3.3.0+). Используй при работе с моделями БД, @meta("form.\*", value) директивами (основной синтаксис с Фазы 3 zenstack-form-plugin v3.0.0; legacy @form.\* — deprecated), access control policies (model-level @@allow/@@deny и field-level @allow/@deny), отношениями между моделями, custom procedures.

## Когда использовать

- Редактирование `schema.zmodel`
- Добавление @meta("form.\*", value) директив для генерации форм
- Настройка access control policies:
  - Model-level: `@@allow`/`@@deny`
  - Field-level: `@allow`/`@deny` (v3.3.0+)
- Работа с отношениями между моделями
- Custom Procedures для бизнес-логики (v3.3.0+)
- Миграции базы данных

## Воркфлоу

1. **Редактируй** `apps/<app>/schema.zmodel` (источник истины)
2. **Генерируй** `nx zenstack:generate <app>`
3. **Применяй** — `nx db:push <app>` только на локальной dev-базе, `nx db:migrate <app>`
   создаёт migration file (обязателен для production; полный воркфлоу и запреты —
   [rules/database.md](/.claude/rules/database.md))

## Критичные правила

- **НИКОГДА** не редактируй `src/generated/schema.prisma` напрямую
- **ВСЕГДА** редактируй `schema.zmodel` вместо этого
- `zenstack:generate` автоматически запускает `prisma generate`

## Reference файлы

- `reference/form-directives.md` — @meta("form.\*", value) директивы (@letar/zenstack-form-plugin, v3.0.0+)
- `reference/access-policies.md` — @@allow/@@deny (model) + @allow/@deny (field) паттерны
- `reference/custom-procedures.md` — Custom Procedures для бизнес-логики (v3.3.0+)
- `reference/zenstack-better-auth.md` — интеграция с Better Auth Organizations (мультитенантность)
- `reference/relations.md` — паттерны связей
- `reference/generated-files.md` — структура src/generated/form-schemas/
- `reference/zenstack-v3-orm.md` — особенности ZenStack v3 ORM (включая exists API)
- `reference/advanced-modeling.md` — Mixin, Typed JSON, View, Multi-file, Polymorphism
- `reference/computed-fields.md` — вычисляемые поля на уровне БД
- `reference/tanstack-query.md` — TanStack Query хуки + zenstack-trpc

## Важно

- Используется собственный плагин `@letar/zenstack-form-plugin`, НЕ `@core/zod`
- Генерируется только `form-schemas/`, папки `zod/` нет
- При пересборке плагина: `nx build zenstack-form-plugin --skip-nx-cache`

## Чеклист перед коммитом схемы

- [ ] Model-level `@@allow` настроены; сужение прав — только `@deny` (полевой `@allow` права **добавляет**)
- [ ] Роли в `requireRole` не шире `@@allow` модели; политика по relation учитывает переставленный FK —
      три ловушки: [security.md](/.claude/rules/security.md)
- [ ] Relations и индексы на часто фильтруемых полях; нет N+1 (`include`/`select`)
- [ ] `@meta("form.*", value)` для полей форм
- [ ] `nx zenstack:generate <app>`, для прода — файл миграции (`nx db:migrate <app>`)
- [ ] Zod-схемы входа — с `.strip()`
