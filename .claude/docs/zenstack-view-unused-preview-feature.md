# ZenStack `view` — не используется в монорепо, preview-фича на заметку

На 2026-09-04 ни в одном `schema.zmodel` монорепо нет ни одной декларации `view` —
проверено рекурсивным грепом по `**/*.zmodel` (публичные приложения + приватные submodule).
Все модели описаны как обычные Prisma-таблицы через `model`. Этот файл — не разбор бага, а
заметка «есть такая возможность», чтобы агент знал о ней раньше, чем впервые понадобится
агрегация/отчёт без прав записи.

## Что это

`view` — конструкция ZenStack v3 для описания SQL VIEW прямо в ZModel, синтаксически почти
идентична `model`:

```zmodel
view UserInfo {
    id        Int
    email     String @unique
    postCount Int
}
```

Отличие от `model` — во view нельзя объявлять `@id`/`@@id`/`@@index` (у SQL VIEW нет
первичного ключа и индексов). Access-policy (`@@allow`/`@@deny`) объявляются так же, как у
модели.

⚠️ **Preview-фича** (официальная документация ZenStack прямо это отмечает) — синтаксис может
измениться в будущих релизах без соблюдения обычной семантики semver.

## Миграции — ZenStack их не создаёт

Движок миграций ZenStack **не поддерживает** `view` — CREATE VIEW/DROP VIEW в generated
migration не попадает. Ответственность на разработчике: либо создавать/менять view вручную в
БД, либо генерировать пустую миграцию флагом `--create-only` и дописывать DDL самому
([database.md](/.claude/docs/database.md) — общий воркфлоу `zenstack:generate`/`db:migrate`
этого репозитория).

## Когда это может пригодиться в наших приложениях

Кандидат — любая read-only агрегация, которую сейчас собирают вручную через `$queryRaw`/
кастомный select в server action: дашборд-отчёты, сводные таблицы (счётчики, суммы за период),
данные для аналитики. `view` даёт то же самое, но с типизацией через сгенерированный клиент и
access-policy на уровне ZenStack, а не голым SQL в обход ORM-слоя (см. запрет на сырой SQL —
[security.md](/.claude/rules/security.md)).

Не путать с соседней preview-фичей ZenStack v3 — [custom procedures](/.claude/skills/zenstack-helper/reference/custom-procedures.md):
`view` — это read-only проекция данных (SELECT), `custom-proc` — произвольная TS-логика
(включая мутации), вызываемая как процедура. Для агрегации без записи — `view`; для кастомной
бизнес-операции — `custom-proc`.

## Источник

Официальная документация: [zenstack.dev/docs/modeling/view](https://zenstack.dev/docs/modeling/view).
