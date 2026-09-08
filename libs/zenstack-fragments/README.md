# @letar/zenstack-fragments

Общие ZenStack zmodel-фрагменты — куски схемы БД, переиспользуемые несколькими приложениями
монорепо. Каждый файл в `src/` — независимый фрагмент под свою предметную область.

⚠️ Это **не обычная TS-библиотека** — код в `src/index.ts` пуст (заглушка для соответствия
конвенции `new-lib`). Реальное содержимое — `.zmodel`-файлы с ZenStack `type`-миксинами,
подключаемые напрямую через `import` в `schema.zmodel` приложения (файловый путь, а не
модульная система TypeScript/`@letar/*`-алиасы).

## Что внутри

`src/better-auth.zmodel` — три `type`-миксина с общими полями:

- `AccountFields` — Better Auth привязки OAuth/credentials-аккаунтов
- `SessionFields` — Better Auth сессии
- `VerificationFields` — Better Auth токены верификации email/сброса пароля

`src/animatrona.zmodel` — общие модели линейки Animatrona (`animatrona` — Mega,
`animatrona-ipfs-player` — Standard):

- `TrackerFields` — источник раздач: идентификация и описание. Trust-система федерации,
  `publicKeyPem` и relation на `FederatedContent` сюда **не** входят — они есть только у
  `animatrona`, дописываются в её модели поверх миксина.

⚠️ В отличие от Better Auth, этот фрагмент **несёт и политику** (`@@allow('all', true)`): весь
desktop-стек Animatrona работает без аутентификации, политика одинакова во всей линейке.

## Общее правило для любого фрагмента: миксин — это пересечение

Поле, попавшее в `type`-миксин, получают **все** потребители. Убрать его у одного или
переопределить с другим атрибутом нельзя — `Duplicated declaration name`. Поэтому во фрагмент
идёт только пересечение потребностей, а специфика дописывается каждым приложением поверх.
Механизм, границы и ловушки (включая то, что Nx не видит связи фрагмент→приложение) —
[zenstack-shared-fragments-across-apps](/.claude/docs/zenstack-shared-fragments-across-apps.md).

## Почему только поля, а не целые модели

Исследование 2026-07-30 (15 приложений с Account/Session/Verification): наборы полей
идентичны почти everywhere (расхождения только в форматировании/комментариях/порядке полей —
косметика). Но `@@allow`/`@@deny`-политики **осознанно разные** в каждом приложении — они
зависят от структуры ролей конкретной модели `User` (`auth().role`, `auth().roles` как массив,
`'ADMIN' in auth().roles`, `auth() == user`, полный `@@deny('all', true)` для приложений, где
Better Auth работает только через raw Prisma в обход enhanced-клиента, и т.д.). Вынести политику
в общий фрагмент значило бы либо навязать одну политику всем 15 приложениям (ломает часть из
них), либо городить параметризацию, которую ZenStack `type`-миксины не поддерживают.

Поэтому вынесены **только поля** — `@@allow`/`@@deny`/`@@unique`/`@@index` остаются в
`schema.zmodel` каждого приложения, на самой модели. `User`-модель тоже НЕ выносится — она
везде своя (разные роли, разные бизнес-поля); миксины не объявляют `relation` на `User`,
приложение добавляет её само поверх миксина.

⚠️ **«Только поля» здесь — продуктовое решение конкретно для Better Auth, а не техническое
ограничение `type`-миксинов.** Проверено 2026-09-08 (zenstack 3.9.3): миксин прекрасно несёт и
`@@index`, и `@@allow`/`@@deny`, и `enum` рядом в том же файле фрагмента. Не переноси
формулировку выше на новые фрагменты как запрет — для приложений с однородной политикой
(например desktop-стек `animatrona`, где везде `@@allow('all', true)`) политику выносить можно
и нужно. Что действительно нельзя: relation на модель приложения и переопределение поля миксина.
Полный разбор с проверенными границами, а также **ловушка потери полей миксина
`@letar/zenstack-form-plugin`** —
[zenstack-shared-fragments-across-apps](/.claude/docs/zenstack-shared-fragments-across-apps.md).

Несколько приложений добавляют к стандартному набору свои поля (например `dashboard.Verification`
держит `type String @default("EMAIL_VERIFICATION")`, `mandala.Verification` — PIN-аутентификацию).
Это нормально: миксин просто задаёт базовый набор, модель может дописывать поля рядом — но **не
переопределять** поле из миксина с другим атрибутом (например добавить `@unique` к полю `value`,
уже объявленному в `VerificationFields` без него) — это конфликт дублирования поля. Такие
приложения (например `mandala`) на этот фрагмент не мигрировались.

### ConsentLog — почему НЕ вынесен

`ConsentLog` (лог согласий 152-ФЗ) проверен в 8+ приложениях и раскалывается на **два разных
шаблона**, а не на один общий:

1. «Стандартный» (aboi, time, animatrona-tracker, domwellbes, archetest, kami) —
   `acceptedAnalytics`/`acceptedMarketing` с `@default(false)`.
2. «Строгий» (auth-hub, driving-school) — те же поля, но **без default** (обязательны при
   создании — форма обязана передать явный выбор), плюс `@@map("consentLog")`.

Это осознанное архитектурное решение двух разных приложений, а не дрейф копипасты — второй
вариант жёстче для 152-ФЗ-комплаенса. `dsperevod.ConsentLog` — вообще другая модель (привязана
к конкретной заявке/форме, не к пользователю). Форсировать унификацию здесь означало бы либо
сломать одну из двух групп, либо вынести миксин с двумя вариантами default — что тут же
возвращает вопрос "какой вариант вынести" без выигрыша в дедупликации. Решение: не выносить,
оставить как консистентный паттерн для копипасты (шаблон уже единообразен внутри каждой из двух
групп).

## Использование

```zmodel
// apps/<app>/schema.zmodel — import ДОЛЖЕН стоять первой строкой файла
import "../../libs/zenstack-fragments/src/better-auth"

datasource db { ... }
// ... остальные datasource/generator/plugin блоки

model Account with AccountFields {
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, accountId])
  @@index([userId])
  @@deny('all', true) // политика — своя для каждого приложения
}

model Session with SessionFields {
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
  @@deny('all', true)
}

model Verification with VerificationFields {
  @@index([identifier])
  @@deny('all', true)
}
```

После правки: `nx zenstack:generate <app>` → сверить `git diff apps/<app>/src/generated/schema.prisma`
на отсутствие дрейфа (поля должны остаться теми же) → `nx typecheck:tsgo <app>`.

**Мигрированные приложения (пилот, 2026-07-30):** `aprel8008`, `archetest`, `dashboard`.

**Не мигрированы** (не тронуты умышленно, чтобы не форсировать риск на проде без нужды):
остальные 12 приложений из первоначального списка (`aboi`, `studio`, `dsperevod`,
`animatrona-tracker`, `time`, `mandala`, `kami`, `driving-school`, `auth-hub`, `svoichuzhie`,
`grandslamcup`, `domwellbes`). Миграция безопасна (проверено на 3 разных стилях политик), но
требует того же ритуала (`zenstack:generate` + сверка diff + typecheck) на каждом — делать по
мере необходимости, не пачкой.

## Команды

```bash
nx typecheck:tsgo zenstack-fragments
nx lint zenstack-fragments
```
