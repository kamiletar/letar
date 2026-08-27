# Захардкоженный unique-ключ поиска внутри функции — гонка между файлами vitest

Функция/сервис, который внутри себя ищет запись по **захардкоженному значению `@unique`-поля**
(ключ шаблона, `slug`, `code` и т.п. — не по параметру вызова, а по константе, импортированной из
`constants.ts`), заставляет параллельные тестовые файлы делить один и тот же ряд БД. Найдено на
`materializeProjectStages` (`src/lib/projects/stage-materialization.ts`) — функция искала
`StageTemplate` по `STAGE_TEMPLATE_KEY = 'IZHS_STANDARD'` (константа в
`src/lib/projects/constants.ts`), а `StageTemplate.key` — `@unique` в схеме.

## Причина

Vitest параллелит **файлы**, а не тесты внутри файла, по воркерам — все они бьют в одну и ту же
dev-БД (см. [unit-testing.md](/.claude/docs/unit-testing.md)). Когда искомый ключ — константа, а
не параметр, у каждого тестового файла нет способа завести себе изолированную запись под этим
ключом: `@unique` не даёт создать вторую строку с тем же значением, значит оба файла вынуждены
**upsert-ить и читать один и тот же production-keyed ряд**. `stage-materialization.spec.ts` и
`project-service.spec.ts` оба тестировали materialization поверх ключа `IZHS_STANDARD` — PUBLISHED-
версия шаблона, созданная одним файлом для своего теста, ненадолго «утекала» в тест другого файла,
запущенного соседним воркером в то же окно времени.

Это тот же класс проблемы, что и в
[vitest-shared-singleton-row-race.md](/.claude/docs/vitest-shared-singleton-row-race.md) (общая
dev-БД, гонка между файлами, не внутри одного), но другой механизм на входе: там — единственная
singleton-строка настроек, которую _все_ тесты обязаны читать по построению (`id: "default"` —
одна строка всего приложения); здесь — обычная многострочная таблица, но **функция сама сузила
себе выбор строки до одной**, захардкодив значение unique-поля лукапа. Симптом и лечение похожи,
причина — нет.

## Симптом

Флаки не воспроизводится детерминированно. Изолированный запуск одного spec-файла (или даже
`describe`) — всегда зелёный. Падает только под полным прогоном (`nx test <app>`), и не каждый
раз — зависит от того, успел ли соседний воркер пересоздать/пересмотреть PUBLISHED-версию в узком
окне между `findFirst` по шаблону и чтением его версии внутри тестируемой функции. Не ловится ни
`typecheck`, ни `lint` — чисто рантайм-гонка на реальной БД.

## Решение

Сделать искомое значение unique-ключа **опциональным параметром** функции, с дефолтом на
production-константу — сигнатура не меняется для реальных вызывающих (server actions, seed), а
тесты получают возможность подставить свой уникально-сгенерированный ключ:

```typescript
export interface MaterializeProjectStagesInput {
  projectId: string
  contractRevisionId: string
  /// По умолчанию — production `STAGE_TEMPLATE_KEY` (IZHS_STANDARD). Параметризовано ради
  /// тестовой изоляции: `StageTemplate.key` уникален, и без параметра тесты были бы вынуждены
  /// делить один и тот же production-ключ (и PUBLISHED-версию на нём) с параллельно бегущими
  /// файлами тестов — реальная гонка, не гипотетическая.
  templateKey?: string
}

const template = await prisma.stageTemplate.findFirst({
  where: { key: input.templateKey ?? STAGE_TEMPLATE_KEY },
})
```

В спеках — каждый тест создаёт собственный шаблон с уникальным ключом вместо шаринга
production-ключа:

```typescript
async function createPublishedVersion() {
  const templateKey = `test-stage-template-${Date.now()}-${Math.random()}`
  const template = await prisma.stageTemplate.create({ data: { key: templateKey, name: '...' } })
  // ...публикация версии на этом template...
  return { templateKey, templateId: template.id, versionId: version.id }
}

it('...', async () => {
  const { templateKey } = await createPublishedVersion()
  await materializeProjectStages({ projectId, contractRevisionId, templateKey })
})
```

Фикс — коммит `536edde` в submodule domwellbes.

## Когда применимо

Любая функция/сервис, у которой внутри — `findFirst`/`findUnique` по значению `@unique`-поля,
взятому из константы/конфига, а не переданному вызывающим кодом. Не ограничено `StageTemplate.key`
или `domwellbes` — тот же паттерн ударит по любому «единственному активному конфигу», найденному
по жёстко зашитому `code`/`slug`/`name`.

## Чеклист для ревью

- [ ] Функция ищет запись через `where: { <uniqueField>: <ИМПОРТИРОВАННАЯ_КОНСТАНТА> }`?
- [ ] Поле в `where` — `@unique` (или `@@unique` по нему) в `schema.zmodel`?
- [ ] Есть или планируется интеграционный тест этой функции — и он не единственный тест,
      обращающийся к этой же таблице?
- [ ] Если да на все три — заводи опциональный параметр с дефолтом на константу, а не полагайся
      на то, что тесты «просто не будут пересекаться по времени».

## Ссылки

- [vitest-shared-singleton-row-race.md](/.claude/docs/vitest-shared-singleton-row-race.md) —
  соседний класс: shared-строка настроек, а не захардкоженный lookup-ключ.
- [unit-testing.md](/.claude/docs/unit-testing.md) — общие правила интеграционных тестов на
  реальной dev-БД (без моков), почему параллелизм файлов вообще создаёт эти окна гонки.
