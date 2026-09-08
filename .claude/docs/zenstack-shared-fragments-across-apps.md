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

## ✅ Закрыто (v4.0.1, 2026-09-08): `@letar/zenstack-form-plugin` терял поля миксина

**Было:** модель, собранная через `with`-миксин, получала form-схему только из полей,
объявленных в самой модели — все поля из миксина (включая их `@meta("form.*")`) пропадали.
Генерация завершалась успешно (exit 0), ни warning'а, ни пустого файла: `<Model>.form.ts`
создавался и выглядел правдоподобно, просто был неполным.

Контрольный опыт (2026-09-08), одни и те же 4 поля:

| Как объявлено                                         | `TrackerCreateFormSchema` содержит   |
| ----------------------------------------------------- | ------------------------------------ |
| напрямую в `model`                                    | `url`, `name`, `state`, `note` — всё |
| `model Tracker with TrackerFields` (3 поля в миксине) | было **только `note`**               |

`enum`-файлы при этом генерировались нормально — плагин фрагмент видел, он просто не разворачивал
`with` при сборке списка полей.

**Почему баг не всплыл раньше:** все три приложения, уже сидящие на `@letar/zenstack-fragments`
(`aprel8008`, `archetest`, `dashboard`), form-плагин вообще не подключают — у них нет блока
`plugin formSchema` в `schema.zmodel`. Баг латентный и вылезал только там, где миксины
встречаются с генерацией форм — то есть в стеке `animatrona` (у неё form-плагин подключён).

**Причина:** `model.fields` в Langium AST содержит только поля, объявленные непосредственно в
блоке модели — поля миксина ZenStack хранит отдельно в `model.mixins`
(`Array<Reference<TypeDef>>`), не разворачивая их в `fields` заранее. `extractModelInfo`
(`libs/zenstack-form-plugin/src/model-generator.ts`) итерировала только `model.fields`.

**Фикс:** новая функция `collectAllFields(model)` разворачивает `model.mixins` рекурсивно
(миксин может сам иметь `mixins`) и отдаёт плоский список полей в том же порядке, что попадает
в `schema.prisma` (поля миксинов, затем собственные поля модели). Подробности — CHANGELOG
`libs/zenstack-form-plugin` v4.0.1.

**Следствие:** модель, по которой строятся формы через `@letar/forms`, теперь можно выносить
через `type`-миксин без потери полей — способ 1 полностью применим и к form-плагину.
Проверено повторным прогоном контрольного опыта после фикса (2026-09-08): сгенерированный
`Tracker.form.ts` через миксин и через прямое объявление — **побайтово идентичны**.

⚠️ **Оговорка про `dist/` — только для запусков в обход Nx.** Плагин подключается в
`schema.zmodel` путём к артефакту сборки, а `dist/` не коммитится:

```zmodel
plugin formSchema { provider = "../../libs/zenstack-form-plugin/dist/index.js" }
```

Через штатную команду это не проблема: у `zenstack:generate` **14 приложений** объявляют
`dependsOn: [{ projects: ['@letar/zenstack-form-plugin'], target: 'build' }]`, поэтому
`nx zenstack:generate <app>` сначала пересобирает плагин, и в графе задач видно два таргета
вместо одного. Правку исходников плагина `nx affected` тоже видит — приложения-потребители
попадают в затронутые.

Ловушка срабатывает, только если запускать генерацию **мимо Nx** — прямым бинарником
(`node_modules/.bin/zenstack generate`), как это приходится делать в изолированном
`git worktree` или на отладочном стенде. Тогда `dist/*.js` остаётся старым, причём `tsc`
обновляет `.d.ts` отдельно от `.js`: свежие `.d.ts` рядом с позавчерашними `.js` выглядят как
«собрано» и вводят в заблуждение (поймано ровно так 2026-09-08 при проверке фикса v4.0.1).
Проверка «фикс реально в артефакте» — грепом по `dist`, не по `src`:

```bash
grep -c collectAllFields libs/zenstack-form-plugin/dist/model-generator.js
```

В свежем клоне и в `git worktree` `dist/` отсутствует вовсе, и генерация мимо Nx падает
непонятной Windows ESM-ошибкой («Received protocol 'c:'»).

⚠️ **Заводишь новому приложению `zenstack:generate` — скопируй и этот `dependsOn`.** Без него
приложение окажется единственным, где ловушка живая и при штатном запуске.

## ⚠️ Ловушка: Nx не знает про зависимость от ФРАГМЕНТА (в отличие от плагина)

Различие проверено прямым замером `nx show projects --affected --files=...` (2026-09-08):

| Что правим                                        | Кого Nx считает затронутым                                     |
| ------------------------------------------------- | -------------------------------------------------------------- |
| `libs/zenstack-form-plugin/src/*.ts` (плагин)     | `@letar/zenstack-form-plugin` **+ приложения-потребители** ✅  |
| `libs/zenstack-fragments/src/*.zmodel` (фрагмент) | только `@letar/zenstack-fragments`, приложений в списке нет ⛔ |

Разница в том, что плагин связан с приложениями явным `dependsOn` у `zenstack:generate`, а
фрагмент подключается **файловым путём** внутри `schema.zmodel` — ни TS-алиаса, ни таргета, за
которые граф мог бы зацепиться:

- ни одно приложение-потребитель не объявляет `@letar/zenstack-fragments` в
  `implicitDependencies` (проверено на `aprel8008`/`archetest`/`dashboard`/`domwellbes`);
- у таргета `zenstack:generate` в `inputs` перечислен только `{projectRoot}/schema.zmodel` —
  ни доменные файлы `schema/`, ни фрагмент из `libs/` туда не входят.

Практически: **правка общего фрагмента не помечает потребителей как affected**, и `nx affected`
их не перегенерирует (для плагина, повторим, это неверно — там связь есть). Регенерацию каждого потребителя после правки фрагмента нужно запускать
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
