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

## Связь фрагмент → приложение в графе Nx (ловушка закрыта 2026-09-08)

⚠️ **До 2026-09-08 здесь была живая ловушка:** правка общего фрагмента не помечала потребителей
как affected. Плагин форм связан с приложениями явным `dependsOn` у `zenstack:generate`, а
фрагмент подключается **файловым путём** внутри `schema.zmodel` — ни TS-алиаса, ни таргета, за
которые граф мог бы зацепиться. Замер до починки:

```
nx show projects --affected --files=libs/zenstack-fragments/src/better-auth.zmodel
→ ["@letar/zenstack-fragments"]   # приложений в списке нет
```

Закрыто двумя правками у каждого потребителя:

1. `@letar/zenstack-fragments` в `nx.implicitDependencies` его `package.json` — это и есть
   ребро графа. Симлинк в `node_modules` и запись в `dependencies` тут **не нужны**: фрагмент
   не импортируется из TS, только файловым путём из `.zmodel`, поэтому оговорка про `TS2307` в
   [libs.md § Подключение к приложению](/.claude/rules/libs.md) на него не распространяется.
2. Путь к фрагменту в `inputs` у `zenstack:generate`:
   `{workspaceRoot}/libs/zenstack-fragments/src/*.zmodel`. При `cache: false` на хеш это не
   влияет — `inputs` здесь единственное место, где связь читаема человеком.

Замер после:

```
nx show projects --affected --files=libs/zenstack-fragments/src/better-auth.zmodel
→ ["@letar/zenstack-fragments","animatrona","animatrona-renderer","animatrona-main",
   "animatrona-e2e","domwellbes","domwellbes-e2e","aprel8008","archetest","archetest-e2e",
   "dashboard"]
```

### ⚠️ Что осталось: гранулярность проектная, не файловая

`implicitDependencies` — ребро «проект → проект», поэтому Nx **не различает, какой именно
фрагмент правили**: изменение `animatrona.zmodel` помечает affected и `domwellbes`/`aprel8008`/
`archetest`/`dashboard` (потребителей `better-auth.zmodel`), и наоборот — оба замера выше
возвращают один и тот же список. Это over-approximation: она безопасна (потребитель не может
быть пропущен), но шумна — лишние приложения попадают в `nx affected`, а значит и в деплой по
affected.

Файловая точность потребовала бы своего Nx-плагина с `createDependencies`, разбирающего
`import` внутри `.zmodel`. Не сделано намеренно: два фрагмента и шесть потребителей плагин не
окупают.

⚠️ **Заводишь нового потребителя фрагмента — добавь обе записи.** Без них ловушка вернётся
точечно, ровно на этом приложении, и снаружи это выглядит как «у остальных ведь работает».

### Гейт (§163, 2026-09-08) — предупреждение выше теперь исполняемое

Ручная дисциплина не удержалась даже одну сессию: `apps/animatrona-ipfs-player` завели
параллельно **в ту же сессию**, где закрывался §162 (коммит `f3728417`), оно импортирует
фрагмент — и пришло без обеих записей. Ловушка была живая с первой минуты нового приложения.

`bun scripts/check-all.mjs --only=zenstack-generate-inputs`
(`scripts/check-zenstack-generate-inputs.mjs`, `severity: gate`) проверяет для каждого
приложения с таргетом `zenstack:generate` три независимых признака:

1. **Фрагмент.** Разбирает все `.zmodel`-файлы приложения (корневой и доменные — импорты не
   транзитивны, см. `apps/domwellbes/schema/auth.zmodel`); если хоть один `import` резолвится в
   `libs/zenstack-fragments/`, требует обе записи из раздела выше.
2. **Доменные файлы.** Если у приложения есть `.zmodel` не в корне (имя каталога не
   захардкожено — определяется по факту наличия файла) — требует, чтобы `inputs` покрывал этот
   каталог глобом. Ловит и регрессию по «Смежное, поправленное заодно» ниже, не только фрагмент.
3. **`inputs` отсутствует полностью** — отдельная находка сама по себе.

Признак детерминированный (парсинг `import`/`inputs`, не эвристика), поэтому уровень `gate`, а
не `warn` — новый потребитель без обеих записей роняет `check-all.mjs` сразу, а не через
следующий аудит. В CI покрытие частичное (`ci: partial`) — приватные submodule там не
выкачиваются, их `schema.zmodel`/`project.json` не проверены.

### Смежное, поправленное заодно

- `inputs` у `zenstack:generate` перечисляли только `{projectRoot}/schema.zmodel`, поэтому у
  семи приложений с многофайловой схемой доменные файлы не входили в inputs вовсе. Добавлены
  `{projectRoot}/schema/**/*.zmodel` (`animatrona`, `animatrona-tracker`, `domwellbes`,
  `grandslamcup`, `kami`) и `{projectRoot}/models/**/*.zmodel` (`aboi`, `driving-school` —
  у них каталог называется иначе, глоб по `schema/` их не покрывает).
- Пять приложений (`animatrona`, `aprel8008`, `driving-school`, `form-develop-app`,
  `label-printer-desktop`) не имели `inputs` у этого таргета вообще — приведены к общему виду.
- `animatrona` и `label-printer-desktop` не объявляли `cache: false`. Фактически таргет и так
  не кешировался (ни `cache: true` у проекта, ни `targetDefaults` для `zenstack:generate` нет),
  так что это явная запись уже действовавшего поведения, а не смена. Теперь `cache: false` стоит
  у всех 20.

⚠️ **Общую часть `zenstack:generate` в `targetDefaults` выносить нельзя** — проверено
2026-09-08. `dependsOn` на `@letar/zenstack-form-plugin` продублирован у 14 приложений не по
недосмотру: ровно эти 14 подключают плагин в своём `schema.zmodel`, а пять оставшихся
(`aprel8008`, `archetest`, `auth-hub`, `dashboard`, `time`) — нет. `targetDefaults` навязал
бы им сборку плагина. `inputs` и `outputs` тоже неоднородны (разные каталоги схемы, у
`driving-school` вывод вообще в `libs/driving-school-db`), а проектный `inputs` дефолт из
`targetDefaults` не дополняет, а **перекрывает** — общего остаётся только `cache: false` и
`metadata`, ради чего заводить дефолт не стоит.

## Порядок работы при правке общего фрагмента

Общий фрагмент — это N приложений с **раздельными БД и раздельными историями миграций**.
Изменение поля во фрагменте = изменение схемы у каждого потребителя, каждому нужна своя миграция.

1. Правишь `libs/<lib>/src/<fragment>.zmodel`
2. Для **каждого** потребителя (`nx show projects --affected --files=<путь к фрагменту>`
   с 2026-09-08 их показывает — с оговоркой про проектную гранулярность выше; точный список
   импортёров — грепом по `import`):
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
| `libs/zenstack-fragments/src/animatrona.zmodel` (`Tracker`/`CachedRelease`)                             | `animatrona`, `animatrona-ipfs-player`              | 2 (остров)  |

Список сверять грепом, а не по таблице:

```bash
grep -rn --include=*.zmodel "zenstack-fragments" apps/
```

⚠️ Импортёров может быть больше, чем приложений: `domwellbes` импортирует `better-auth` дважды —
в корневом `schema.zmodel` и в `schema/auth.zmodel` (импорты не транзитивны, см. выше).
