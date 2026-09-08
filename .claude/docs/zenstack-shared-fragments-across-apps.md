# Переиспользование частей `schema.zmodel` между приложениями

Как разделить общие куски схемы БД между несколькими приложениями монорепо, не копипастя их.
Механизм существует давно (`libs/zenstack-fragments`, Better Auth), но был описан у́же, чем
работает на самом деле. Проверено эмпирически 2026-09-08 на zenstack CLI 3.9.3 (прямой вызов
бинарника, минуя Nx) — все утверждения ниже подтверждены прогоном, а не выведены из документации.

Не путать с [zenstack-multifile-schema-circular-imports](/.claude/docs/zenstack-multifile-schema-circular-imports.md)
— тот док про разбиение схемы **одного** приложения на доменные файлы. Здесь — про переход
границы приложения, в `libs/`.

## Два разных способа, выбор зависит от relation'ов

### Способ 1: `type`-миксин (когда у модели есть свои relation'ы в каждом приложении)

```zmodel
// libs/<lib>/src/<fragment>.zmodel
enum RemotePinStatus { LOCAL_ONLY  PINNED_REMOTE }

type PinStatusFields {
  id     String          @id @default(cuid())
  cid    String          @unique
  status RemotePinStatus @default(LOCAL_ONLY)

  @@index([status])
  @@allow('all', true)
}
```

```zmodel
// apps/<app>/schema.zmodel — import ПЕРВОЙ строкой, до datasource/generator/plugin
import "../../libs/<lib>/src/<fragment>"

model PinStatus with PinStatusFields {
  note String?          // своё поле поверх миксина
  @@index([note])       // свой индекс — складывается с индексом миксина
}
```

**Что реально можно положить в `type`-миксин** (шире, чем утверждал README `zenstack-fragments`
до 2026-09-08 — он говорил «только поля»):

| Кладётся в миксин                                              | Проверено                          |
| -------------------------------------------------------------- | ---------------------------------- |
| поля с атрибутами (`@id`, `@unique`, `@default`, `@updatedAt`) | ✅                                 |
| `@@index`                                                      | ✅ складывается с индексами модели |
| `@@allow` / `@@deny`                                           | ✅ доезжают в `schema.ts`          |
| `enum` (рядом в том же файле фрагмента)                        | ✅ попадает в `schema.prisma`      |
| несколько миксинов сразу — `model X with A, B`                 | ✅                                 |

⛔ **Relation на модель приложения в миксин положить нельзя.** `type` не резолвит имена моделей
потребителя:

```
frag.zmodel:4:13 - Could not resolve reference to TypeDeclaration named 'Tracker'.
```

Поэтому relation'ы дописываются в самой модели поверх миксина — именно из-за этого Better Auth
фрагмент не выносит `User` и не объявляет `user User @relation(...)` внутри `AccountFields`.

⛔ **Переопределить поле миксина нельзя** — даже чтобы добавить атрибут:

```
schema.zmodel:8:3 - Duplicated declaration name "value"
```

Приложению, которому нужен другой набор атрибутов на поле, миксин не подходит вовсе (так
`mandala` в своё время не мигрировалась на общий Better Auth фрагмент).

### Способ 2: «остров» из целых моделей (когда модели связаны только между собой)

Если группа моделей ссылается **только друг на друга** и во всех приложениях-потребителях нужна
целиком — её можно вынести целыми `model`-блоками, вместе с relation'ами между ними:

```zmodel
// libs/<lib>/src/<fragment>.zmodel
model Tracker {
  id       String @id @default(cuid())
  url      String @unique
  releases CachedRelease[]        // relation ВНУТРИ фрагмента — работает
  @@allow('all', true)
}

model CachedRelease {
  id        String  @id @default(cuid())
  cid       String  @unique
  trackerId String
  tracker   Tracker @relation(fields: [trackerId], references: [id], onDelete: Cascade)
  @@allow('all', true)
}
```

Потребитель просто импортирует файл — обе модели появляются в его `schema.prisma`. ✅ Проверено.

Ограничение способа: как только **одному** приложению нужна дополнительная relation на свою
модель (у `animatrona.Tracker` это `importedContent FederatedContent[]`, которого у плеера нет),
остров перестаёт подходить — переходи на способ 1.

## ⚠️ Ловушка: `@letar/zenstack-form-plugin` молча теряет поля миксина

**Модель, собранная через `with`-миксин, получает form-схему только из полей, объявленных в самой
модели.** Все поля из миксина — включая их `@meta("form.*")` — пропадают. Генерация завершается
успешно (exit 0), ни warning'а, ни пустого файла: `<Model>.form.ts` создаётся и выглядит
правдоподобно, просто он неполный.

Контрольный опыт (2026-09-08), одни и те же 4 поля:

| Как объявлено                                         | `TrackerCreateFormSchema` содержит   |
| ----------------------------------------------------- | ------------------------------------ |
| напрямую в `model`                                    | `url`, `name`, `state`, `note` — всё |
| `model Tracker with TrackerFields` (3 поля в миксине) | **только `note`**                    |

`enum`-файлы при этом генерируются нормально — плагин фрагмент видит, он просто не разворачивает
`with` при сборке списка полей.

**Почему баг не всплыл раньше:** все три приложения, уже сидящие на `@letar/zenstack-fragments`
(`aprel8008`, `archetest`, `dashboard`), form-плагин вообще не подключают — у них нет блока
`plugin formSchema` в `schema.zmodel`. Баг латентный и вылезает только там, где миксины
встречаются с генерацией форм — то есть в стеке `animatrona` (у неё form-плагин подключён).

**Следствие для выбора способа:** модель, по которой строятся формы через `@letar/forms`, через
`type`-миксин выносить нельзя, пока баг не исправлен — только способ 2 (целые модели) либо
копипаста.

## ⚠️ Ловушка: Nx не знает про эту зависимость

Фрагмент подключается **файловым путём**, а не TS-алиасом — поэтому граф Nx связи не видит:

- ни одно приложение-потребитель не объявляет `@letar/zenstack-fragments` в
  `implicitDependencies` (проверено на `aprel8008`/`archetest`/`dashboard`/`domwellbes`);
- у таргета `zenstack:generate` в `inputs` перечислен только `{projectRoot}/schema.zmodel` —
  ни доменные файлы `schema/`, ни фрагмент из `libs/` туда не входят.

Практически: **правка общего фрагмента не помечает потребителей как affected**, и `nx affected`
их не перегенерирует. Регенерацию каждого потребителя после правки фрагмента нужно запускать
руками:

```bash
nx zenstack:generate <app>
```

Спасает от порчи артефактов только то, что у большинства приложений `zenstack:generate` объявлен
с `cache: false` — прогон всегда настоящий. Но узнать, что прогон **нужен**, Nx не поможет.

## Порядок работы при правке общего фрагмента

Общий фрагмент — это N приложений с **раздельными БД и раздельными историями миграций**.
Изменение поля во фрагменте = изменение схемы у каждого потребителя, каждому нужна своя миграция.

1. Правишь `libs/<lib>/src/<fragment>.zmodel`
2. Для **каждого** потребителя (список — грепом по `import`, Nx не подскажет):
   `nx zenstack:generate <app>` → `git diff apps/<app>/src/generated/schema.prisma` — сверить, что
   изменилось ровно ожидаемое → миграция (`nx db:migrate <app>`, для локальных SQLite — `db:push`)
3. `nx typecheck:tsgo <app>` на каждом

Прецедент цены пропуска шага 2: `better-auth` 1.7 потребовал поле `issuer` в `Account` — фрагмент
поправили, но применение миграции на проде у каждого приложения — отдельная работа, см.
[better-auth-1.7-account-issuer-field](/.claude/docs/better-auth-1.7-account-issuer-field.md).

## Общие правила, унаследованные от multi-file схем

- `import` — **до** `datasource`/`generator`/`plugin`, иначе `Expecting token of type 'EOF'`
- путь без расширения `.zmodel`
- **импорты не транзитивны**: файл, упоминающий объявление по имени, импортирует его источник
  напрямую (прецедент — `apps/domwellbes/schema/auth.zmodel` пришлось заставить импортировать
  фрагмент Better Auth, хотя корневой `schema.zmodel` его уже импортировал)
- `@@allow`/`@@deny` требуют подключённого `plugin policy` **в схеме потребителя** — иначе ошибка
  `Could not resolve reference to Attribute named '@@allow'` указывает на строку **фрагмента**,
  хотя причина в схеме приложения

## Где это уже используется

| Фрагмент                                                                                                | Потребители                                         | Способ      |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------- |
| `libs/zenstack-fragments/src/better-auth.zmodel` (`AccountFields`/`SessionFields`/`VerificationFields`) | `aprel8008`, `archetest`, `dashboard`, `domwellbes` | 1 (миксины) |
