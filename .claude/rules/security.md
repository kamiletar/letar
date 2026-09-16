# Правила безопасности

> ⚠️ **Файл намеренно без `paths:` — он должен грузиться всегда.** Path-scoped правила Claude Code
> инжектит при **чтении** подходящего файла и **не** инжектит при `Write`
> ([claude-code#23478](https://github.com/anthropics/claude-code/issues/23478)) — то есть ровно в
> момент создания нового API-роута или server action правило было бы недоступно. Не «чини» это
> добавлением `paths:`. До 2026-08-10 здесь стоял невалидный YAML-список путей, который всё равно
> ни с чем не матчился.
>
> Здесь — только проектные требования. Общие практики (экранирование в JSX вместо
> `dangerouslySetInnerHTML`, ORM вместо сырого SQL) подразумеваются и не перечисляются.

## Валидация входных данных

```typescript
// ✅ Всегда .strip() — удаляет поля, которых нет в схеме
const Schema = z.object({
  name: z.string().min(2).max(100),
  email: z.email(),
}).strip()

const parsed = Schema.safeParse(input)
if (!parsed.success) {
  return { error: parsed.error.flatten() }
}
```

## Access control — политики в схеме, не в коде

```zmodel
model Post {
  id       String @id @default(cuid())
  author   User   @relation(fields: [authorId], references: [id])
  authorId String

  @@allow('read', true)
  @@allow('create', auth() != null)
  @@allow('update', auth() == author)
  @@allow('delete', auth() == author || auth().role == 'ADMIN')
}
```

```typescript
// ZenStack v3 — enhanced-клиент с сессией, а не сырой prisma
import { auth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

export async function getDb() {
  const session = await auth()
  return getEnhancedPrisma(session?.user)
}
```

⚠️ Три ловушки политик, каждая ломается тихо и не ловится typecheck:

- field-level `@allow` **добавляет** право, а не сужает — сужение только через `@deny`
  ([разбор](/.claude/docs/zenstack-field-level-allow-does-not-narrow.md));
- список ролей в `requireRole` шире `@@allow` модели — роль проходит гейт и падает на записи
  ([разбор](/.claude/docs/role-gate-vs-model-policy-drift.md));
- политика по relation не видит FK, переставленный в том же `update()`
  ([разбор](/.claude/docs/zenstack-relation-traversal-fk-repoint-bypass.md)).

## ⚠️ Генерация паролей и токенов

**НИКОГДА не придумывай пароли сам** — даже «временные», даже для dev. Придуманные вручную
(`letar2026`, `changeme`, `admin123`) предсказуемы и ложатся под словарную атаку. Это касается
паролей к NPM, БД, admin-панелям, API-ключей, SMTP, любых учёток.

```bash
openssl rand -base64 32                                  # везде доступен
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

⚠️ **Токен, который попадёт в query-параметр URL** (`DEV_SESSION_TOKEN` и аналоги), генерируй в
base64url-алфавите: `+` из обычного base64 декодируется как пробел по правилам
`application/x-www-form-urlencoded` ещё до сравнения на сервере
([разбор](/.claude/docs/dev-session-token-plus-char-query-corruption.md)).

```bash
openssl rand -base64 32 | tr '+/' '-_'                   # без + и / в алфавите
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Secrets

Секреты — только в env-файлах, никогда в коде (`const API_KEY = 'sk-...'`). Какой файл для чего,
как класть новую переменную на прод и почему `NODE_ENV` не отличает прод от staging —
[env-files.md](/.claude/rules/env-files.md).

## Чеклист

- [ ] Валидация всех входных данных (Zod + `.strip()`)
- [ ] Access control через ZenStack policies, enhanced-клиент, а не сырой `prisma`
- [ ] Нет `dangerouslySetInnerHTML` с пользовательским вводом (нужен HTML — `DOMPurify.sanitize`)
- [ ] Защита роутов через proxy или `auth()` + проверка роли
- [ ] Secrets только в env-файлах, пароли/токены — из генератора
- [ ] Загрузка файлов: не `path.join`+`startsWith`
      ([почему](/.claude/docs/upload-path-traversal.md))
- [ ] Персональные данные — по [personal-data](/.claude/docs/personal-data.md) (152-ФЗ, РКН, cookie)
