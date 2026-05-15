---
name: zenstack-helper
description: |
  Помощник по ZenStack schema.zmodel (v3.3.0+). Используй при:
  - Редактировании моделей БД (schema.zmodel)
  - Добавлении @form.* директив для генерации форм
  - Настройке access control policies (@@allow/@@deny на уровне модели, @allow/@deny на уровне поля)
  - Работе с отношениями между моделями
  - Custom Procedures для кастомной логики
  - Миграциях базы данных
---

# ZenStack Helper

Помощник по ZenStack schema.zmodel (v3.3.0+). Используй при работе с моделями БД, @form.\* директивами, access control policies (model-level @@allow/@@deny и field-level @allow/@deny), отношениями между моделями, custom procedures.

## Когда использовать

- Редактирование `schema.zmodel`
- Добавление @form.\* директив для генерации форм
- Настройка access control policies:
  - Model-level: `@@allow`/`@@deny`
  - Field-level: `@allow`/`@deny` (v3.3.0+)
- Работа с отношениями между моделями
- Custom Procedures для бизнес-логики (v3.3.0+)
- Миграции базы данных

## Воркфлоу

1. **Редактируй** `apps/<app>/schema.zmodel` (источник истины)
2. **Генерируй** `nx zenstack:generate <app>`
3. **Применяй** `nx db:push <app>` (dev) или `nx db:migrate <app>` (prod)

## Критичные правила

- **НИКОГДА** не редактируй `src/generated/schema.prisma` напрямую
- **ВСЕГДА** редактируй `schema.zmodel` вместо этого
- `zenstack:generate` автоматически запускает `prisma generate`

## Reference файлы

- `reference/form-directives.md` — @form.\* директивы (@letar/zenstack-form-plugin)
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
