# sharp: composite() над raw-буферами тихо добавляет alpha-канал

⚠️ Применимо к любому pixel-level image manipulation через `sharp` (composite raw-буферов,
ручной «inpainting»/градиентная заливка, генерация текстур) — не специфично для одного
приложения. Найдено 2026-08-18 при разовой правке мокап-картинки для
`poster-microtext-desktop`, но грабля общая для всех, кто работает с sharp через raw pixel
buffers (studio, animatrona и т.д.).

## Симптом

Визуальный мусор вместо ожидаемого результата — **без единой ошибки выполнения**. В конкретном
случае: плавный радужный градиент вместо однотонной заливки стены. Легко принять за баг в
логике смешивания цветов, хотя причина — рассинхронизация числа каналов между шагами пайплайна.

## Грабля

```typescript
// ❌ Было — create() просит 3 канала, но после composite() буфер уже 4-канальный
const buffer = await sharp({
  create: { width, height, channels: 3, background: { r, g, b } },
})
  .composite([
    { input: rawBuffer1, raw: { width, height: 1, channels: 3 }, left, top },
    { input: rawBuffer2, raw: { width, height: 1, channels: 3 }, left, top: top2 },
  ])
  .raw()
  .toBuffer()

// buffer.length НЕ равен width * height * 3 — sharp добавил альфа-канал при compositing,
// хотя create() был вызван с channels: 3
```

Проверка эмпирически:

```typescript
const { data, info } = await sharpInstance.raw().toBuffer({ resolveWithObject: true })
console.log(info.channels) // 4 — хотя create() просил 3
```

Дальше по пайплайну очередной шаг декларирует буфер как 3-канальный (полагаясь на то, что
просили при `create`):

```typescript
// Буфер на самом деле 4-канальный, а декларация — 3-канальная → байты съезжают,
// весь массив пикселей интерпретируется неверно
sharp(buffer, { raw: { width, height, channels: 3 } })
```

## Фикс

Вызывать `.removeAlpha()` непосредственно перед **каждым** `.raw().toBuffer()` в raw-pixel
пайплайне — не только на исходных `extract()`, но и на промежуточных
`create()` + `composite()` шагах, если далее буфер передаётся дальше как raw с явным указанием
числа каналов.

```typescript
// ✅ Стало
const buffer = await sharp({
  create: { width, height, channels: 3, background: { r, g, b } },
})
  .composite([
    { input: rawBuffer1, raw: { width, height: 1, channels: 3 }, left, top },
    { input: rawBuffer2, raw: { width, height: 1, channels: 3 }, left, top: top2 },
  ])
  .removeAlpha()
  .raw()
  .toBuffer()

// buffer.length === width * height * 3 — гарантировано
```

## Почему это легко проглядеть

`create({ channels: 3 })` выглядит как декларация формата на весь пайплайн, но это только
формат фона. `composite()` — внутренняя операция sharp, которая может добавить альфа-канал для
собственных нужд смешивания слоёв независимо от того, что было запрошено на входе. Число
каналов на выходе `.raw()` нужно либо проверять явно (`info.channels`), либо гарантировать
`.removeAlpha()` перед каждым терминальным `.raw().toBuffer()`.
