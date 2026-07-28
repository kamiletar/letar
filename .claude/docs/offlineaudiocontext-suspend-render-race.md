# OfflineAudioContext: гонки при детерминированном рендере

Контекст: `apps/synth/src/lib/audio/render.ts` — рендер патча в WAV через `OfflineAudioContext`
(в отличие от живой записи `MediaRecorder`, здесь звук считается не в реальном времени, а «на
максимальной скорости», числами). Здесь встретились два неочевидных источника молчаливого
поломанного вывода — оба воспроизводятся один раз, стоит проверять при похожем коде в будущем.

## 1. Дедлок `suspend()` / `startRendering()`

`OfflineAudioContext.suspend(t)` возвращает promise, который разрешается только когда рендер
**реально дойдёт** до момента `t` во время прогонки — а прогонка запускается исключительно
`startRendering()`. До первого вызова `startRendering()` время внутри офлайн-контекста не течёт
вообще, что бы вы ни делали в JS.

```ts
// ❌ Дедлок — await навсегда, потому что рендер ещё не запущен
await ctx.suspend(2).then(() => {
  engine.noteOff(note, release)
  ctx.resume()
})
return ctx.startRendering()
```

```ts
// ✅ suspend() планируется без ожидания, startRendering() запускается сразу же,
// и только потом дожидаемся promise от suspend()
const suspended = ctx.suspend(2).then(() => {
  engine.noteOff(note, release)
  return ctx.resume()
})
const rendered = ctx.startRendering()
await suspended
return rendered
```

Для нескольких точек паузы (например, серия ударов драм-кита с разным временем) можно
запланировать несколько `suspend()` до `startRendering()` — планировщик выстроит их по времени;
собираем promise-ы в массив и ждём `Promise.all(...)` после единственного `startRendering()`.

## 2. Тишина в AudioWorklet-движках при офлайн-рендере

Если движок управляется через `AudioWorkletNode.port.postMessage(...)` (как FM-движок в synth —
сообщения `'patch'`/`'noteOn'`/`'noteOff'`), сообщения летят в отдельный аудио-поток асинхронно.
`OfflineAudioContext` рендерит без пауз реального времени — иногда весь рендер успевает
завершиться раньше, чем воркслет получит и применит входящие сообщения. Результат — валидный
WAV-файл (правильный RIFF-заголовок, правильный размер), но с полной цифровой тишиной внутри
(`maxAbsSample === 0`). Никакой ошибки/исключения при этом не бросается — баг молчаливый,
находится только проверкой реальных сэмплов на ненулевые значения.

Обходной путь: явно подождать один макротаск между отправкой сообщений движку и вызовом
`startRendering()`, чтобы сообщения гарантированно дошли:

```ts
engine.updatePatch(patch.engine)
engine.noteOn(note, velocity)
await new Promise((resolve) => setTimeout(resolve, 50))
// ...только теперь suspend()/startRendering()
```

Движки без воркслета (прямое управление узлами через `createOscillator`/`createGain`/...) этой
проблеме не подвержены — она специфична именно для postMessage-моста в отдельный поток.

## Как проверять, что рендер реально сработал

`nx build`/`lint`/`typecheck` не ловят ни один из этих багов — оба воспроизводятся только в
рантайме браузера. Проверка на «выглядит done» недостаточна: доставайте реальные байты из
получившегося blob/файла и убеждайтесь, что PCM-сэмплы не все нулевые:

```ts
const buf = await (await fetch(url)).arrayBuffer()
const samples = new Int16Array(buf, 44) // 44 байта — стандартный WAV-заголовок
const maxAbs = Math.max(...[...samples].map(Math.abs))
// maxAbs === 0 → тишина, даже если файл валидный WAV
```
