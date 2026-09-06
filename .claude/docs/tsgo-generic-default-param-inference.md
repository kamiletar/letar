# tsgo не выводит generic-параметр `TArgs` из callback-функции с default-значением параметра без явной аннотации типа

## Симптом

Generic-функции `createHandler<TArgs extends unknown[], TResult>` и
`createHandlerWithEvent<TArgs extends unknown[], TResult>`
(`apps/animatrona/main/utils/ipc-handler-factory.ts`) под `tsgo` (`typescript-go`, таргет
`typecheck:main`) выводят `TArgs` как `unknown[]`, если хотя бы один параметр
callback-функции имеет default-значение без явной аннотации типа:

```typescript
// ❌ tsgo выводит TArgs как unknown[] — вызов handler(days) внутри createHandler падает
createHandler('stats:getDailyHistory', (days = 30) => getDailyHistory(days))
```

Обычный `tsc` инференс параметра из default-значения (`days = 30` → `number`) здесь не
срабатывает специфично для generic-контекста вывода кортежного типа `TArgs` — баг/расхождение
именно `tsgo`, не общий TypeScript. Найдено 2026-09-06 при переписывании
`apps/animatrona/main/tsconfig.json` под реальную структуру исходников (коммит `1e4f892d`) в
8 местах: `stats.handlers.ts`, `ipfs.handlers.ts`, `logs.handlers.ts`, `ffmpeg.handlers.ts`
(×1), `fs.handlers.ts` (×2), `subtitle.handlers.ts`, `vmaf.handlers.ts`.

## Первый обход (отклонён) — явная аннотация типа + eslint-disable

```typescript
// eslint-disable-next-line @typescript-eslint/no-inferrable-types -- без явной аннотации tsgo выводит TArgs createHandler как unknown
createHandler('stats:getDailyHistory', (days: number = 30) => getDailyHistory(days))
```

Явная аннотация `days: number = 30` действительно чинит вывод `TArgs`, но входит в конфликт с
`@typescript-eslint/no-inferrable-types` (аннотация дублирует тип, тривиально выводимый из
литерала) — на каждый сайт нужен `eslint-disable-next-line` с пояснением. Рабочий, но шумный
вариант: 8 мест — 8 disable-комментариев.

## Итоговый фикс — убрать default-значение параметра, вернуть `?? default` в теле

Первопричина именно в _default-значении параметра_, а не в отсутствии аннотации самой по себе.
Замена сигнатуры на `T | undefined` (без `=`) и перенос дефолта в тело функции через `??` чинит
вывод `TArgs` **без** конфликта с `no-inferrable-types` (правило не срабатывает — нет
default-значения, которое аннотация могла бы «тривиально дублировать»):

```typescript
// ✅ tsgo корректно выводит TArgs как [number | undefined], без eslint-disable
createHandler('stats:getDailyHistory', (days: number | undefined) => getDailyHistory(days ?? 30))
```

Рантайм-поведение идентично исходному: канал `ipcMain.handle` в `createHandler` зовёт
`handler(...args)`, где `args` — реальные аргументы вызова из renderer; при вызове без
аргумента `days` внутри handler'а всё равно `undefined`, что с default-параметром (`= 30`),
что без него — разницы в поведении по отношению к caller'у нет, разница только компайл-тайм.

Применено ко всем 8 сайтам (коммит после `1e4f892d`), disable-комментарии удалены полностью.

### Ловушка при переносе: required-параметр после optional нельзя писать как `T | undefined`

В `vmaf.handlers.ts` `preferCpu` идёт после `options?: Partial<CqSearchOptions>` (опционального).
`preferCpu: boolean | undefined` там даёт `TS1016: A required parameter cannot follow an
optional parameter` — синтаксически это не то же самое, что `preferCpu?: boolean`. Для
параметров, следующих за уже опциональным параметром, используй `?:` (не `| undefined`) —
поведение для tsgo-инференса из этого случая (нет default-значения) идентично, ошибка не
возвращается:

```typescript
// ✅
async (event, inputPath: string, videoOptions: ..., options?: Partial<CqSearchOptions>, preferCpu?: boolean, itemId?: string) => {
  // ...
  await findOptimalCQ(inputPath, videoOptions, options, onProgress, preferCpu ?? false)
}
```

## Если встретишь снова

Тот же паттерн (`(x = default) => ...` как аргумент к generic-функции с
`TArgs extends unknown[]`) стоит проверять первым делом, если `tsgo` внезапно ругается на вызов
generic-обёртки внутри `main/` с сообщением про несовместимость `unknown[]`/несуществующий
параметр. Фикс — убрать `=` из сигнатуры параметра, аннотировать `T | undefined` (или `?:` если
после уже опционального параметра) и подставить `?? default` в первой строке использования.
