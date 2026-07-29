# PLAN_TESTING — synth

> Тестирование браузерного звукового движка — особенности: Web Audio нельзя тестировать в jsdom; нужен реальный Chrome (Playwright) или OfflineAudioContext.

## Стратегия

| Слой               | Инструмент                                                                 | Особенности                                                                                |
| ------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Unit**           | Vitest + jsdom                                                             | Только чистая логика: конвертер DX7 SysEx ↔ модель патча, shareable-URL, парсинг MIDI-байт |
| **Audio snapshot** | Vitest + OfflineAudioContext (Node через jest-environment-node или custom) | Рендер патча → проверка длины/RMS/не-тишины                                                |
| **E2E**            | Playwright (Chrome обязателен — Web MIDI/Audio требует реальный движок)    | Витрина `/gallery`, открытие патча по URL, воспроизведение (мок Web MIDI)                  |
| **Ручное**         | SMK-37 PRO + Chrome                                                        | MIDI-вход, SysEx залить/прочитать (Фаза 1.5)                                               |

---

## Фаза 1 — Браузерный звук

### Unit (Vitest)

- [ ] `patch-schema.test.ts` — Zod-валидация модели патча (все 3 типа)
- [ ] `dx7-sysex.test.ts` — конвертер модель ↔ DX7 SysEx round-trip + checksum (155 байт)
- [ ] `patch-url.test.ts` — кодирование/декодирование shareable-URL (#hash)
- [ ] `midi-parse.test.ts` — разбор NoteOn/NoteOff/CC MIDI-байт

### Audio unit (OfflineAudioContext)

- [ ] `subtractive-engine.test.ts` — рендер 1 сек ноты → RMS > 0, длина ≥ 44100 сэмплов
- [ ] `fm-engine.test.ts` — FM алгоритм 1: carrier + modulator → сложный тембр (проверка нетривиального спектра)

### E2E (Playwright, Chrome)

- [ ] `gallery.spec.ts` — открытие `/gallery`, список патчей, клик на патч
- [ ] `patch-url.spec.ts` — открытие URL с `#hash` → автозагрузка патча
- [ ] `playback.spec.ts` — нажатие виртуальной клавиши → AudioContext стартовал (проверка `audioCtx.state === 'running'`)

---

## Фаза 2 — MCP-сервер (ментор + DAW)

### Unit (Vitest)

- [x] `mcp/chord-pattern.spec.ts` — генератор аккордов: интервалы всех 7 типов, block/arpeggio-up/arpeggio-down, дефолты
- [x] `lib/mentor/schema.spec.ts` — Zod-валидация всех 5 вариантов `MentorEventSchema` + `MentorStateReportSchema`
- [x] `lib/mentor/event-bus.spec.ts` — pub/sub: доставка, unsubscribe, несколько подписчиков
- [ ] Не покрыто тестами: API-роуты (`/api/mentor/*`) — проверены только вручную curl'ом (см. `PLAN_COMPLETED.md`),
      MCP `server.ts` (registerTool/resource) — проверен вручную прямым JSON-RPC по stdio, не автоматизированным тестом

### Ручное

- [ ] Реальный Claude Desktop → `highlight_param`/`play_demo` → золотая подсветка в открытой вкладке студии

---

## Конфигурация

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    // Аудио-тесты в отдельном пуле с node-окружением
    poolOptions: {
      threads: { singleThread: true },
    },
  },
})
```

> ⚠️ Web MIDI API недоступен в тестовом окружении — мокировать через `vi.stubGlobal('navigator.requestMIDIAccess', ...)`.

> ⚠️ Playwright: обязателен `chromium` (только он поддерживает Web Audio + Web MIDI). Запуск: `nx e2e synth-e2e -- --project=chromium`.
