# PLAN_COMPLETED — synth

## Сессия 2026-07-28 — 152-ФЗ: минимальное cookie-уведомление

Часть кросс-приложенческого аудита 152-ФЗ (root `PLAN.md`, Этап 0.8). Только Umami-аналитика, без
аккаунтов/форм. `CookieBanner` из `@letar/ui` (`consentApiUrl={null}` — localStorage-only, нет БД),
`analytics-consent.tsx` (Umami только после согласия). `/privacy` — самостоятельная страница со
ссылкой «На главную» (студия full-screen, без футера); `CookieSettingsButton` не добавлен — отозвать
согласие можно очисткой localStorage, задокументировано на самой странице.

## Сессия 2026-07-08 (продолжение 4) — Драм-движок (Фаза 1)

### Что сделано

- **`src/lib/patch/schema.ts`** — экспортированы типы `DrumPadSynth` и `DrumPad` (были только внутри `z.infer` без публичного имени).
- **`src/lib/patch/drum-defaults.ts`** (новый) — `DRUM_KIT_1` («Breakbeat Kit 1»): 12 звучащих пэдов (2 кика, 2 снейра, клэп, 2 хэта, 3 тома, перк) + 4 пустых слота (`synth: null`) под будущие сэмплы.
- **`src/lib/audio/drums.ts`** (новый) — `DrumEngine.trigger(synth, velocity)`, one-shot синтез без сэмплов:
  - `808kick`/`tom` — синус с быстрым питч-свипом сверху вниз (сила свипа = `tone`);
  - `snare` — 2 расстроенных треугольника (тело) + band-pass шум («треск»), смешиваются по `tone`;
  - `hat-closed`/`hat-open` — 6 square-осцилляторов в негармоничных соотношениях (классический приём 909) → highpass → короткая/длинная огибающая (разница только в `decay` патча);
  - `clap` — 4 близких шумовых всплеска («флэм»: 0/12/24/36 мс) через общий band-pass, сливаются в один хлопок + хвост.
- **`src/app/_components/studio/drum-pads.tsx`** (новый) — сетка 4×4 в MPC-раскладке (индекс 0 — левый нижний), мышь + QWERTY (Z X C V / A S D F / Q W E R / 1 2 3 4), подсветка при ударе, пустые пэды визуально приглушены и не кликабельны.
- **`src/app/_components/studio/drum-panel.tsx`** (новый) — редактор выбранного пэда: кнопки выбора типа звука + 4 ручки (pitch/decay/tone/level), кнопка «Очистить» (сброс в `synth: null`).
- **`src/app/_components/studio/studio-client.tsx`** — третий пункт переключателя движков (SUB/FM/**DRUM**), ленивое создание `DrumEngine` при первом переходе (как у FM), входящие MIDI-ноты 36–51 маппятся на пэды 0–15 (`DRUM_MIDI_BASE`), клавиатура/пэды в нижней части студии переключаются по типу движка.
- Проверено сборкой в превью: рендер сетки пэдов и панели, клик по пэду (`pointerdown`) не бросает исключений, `nx lint synth` + `nx typecheck:tsgo synth` чисто. Реальное прослушивание звука — не проверялось (сэндбокс превью без аудиовыхода) — за пользователем при первом запуске.

### Технические детали

- Маппинг MIDI-нот на пэды (36–51) — рабочее предположение по аналогии с GM/большинством контроллеров; точный маппинг пэдов самого SMK-37 не задокументирован (см. Фазу 1.5) и настраивается в MidiSuite самим устройством, поэтому может не совпадать «из коробки».
- Драм-голоса не имеют note-off — все триггеры one-shot, `handleNoteOff` в режиме `drumkit` — no-op.
- Загрузка сэмплов в пустые пэды и публикация драм-китов в `/gallery` — не сделаны, оставлены в PLAN.md как открытые пункты.

### Коммит

_(зафиксировать после этой записи)_

---

## Сессия 2026-07-08 (продолжение 3) — Диагностика: SMK-37 не отвечает на dump request

### Что сделано

- Ручная проверка на реальном SMK-37 PRO (владелец): «Отправить в железо» работает (success), «Прочитать из железа» — без ответа.
- Добавлен временный диагностический `console.log` во `MidiInputManager._onMessage` (логировал вообще любое входящее MIDI-сообщение, не только SysEx) — повторная проверка **с зажатой кнопкой PATCH** тоже не показала ни одного входящего сообщения.
- **Исследование:** проверена документация сообщества `jonathaslacerda/smk-37-pro-docs` (README + `sysex/SYSEX.md`) через `context-mode` — там задокументированы только заводские банки пресетов (`.syx`-файлы для загрузки), протокол запроса-ответа (dump request/reply) нигде не описан и не подтверждён.
- **Вывод (зафиксирован в PLAN.md, Фаза 1.5):** прошивка SMK-37 PRO реализует только одностороннее SysEx (приём патчей), не полный DX7-редакторский протокол с dump request. Это аппаратное/прошивочное ограничение, не баг нашего кода.
- Диагностический `console.log` убран после подтверждения; код `onSysex`/`encodeVoiceDumpRequest`/кнопка «Прочитать из железа» **оставлен рабочим** — пригодится для другого DX7-совместимого железа. В кнопку добавлен `title`-тултип с объяснением ограничения именно для SMK-37.
- `nx lint synth` + `nx typecheck:tsgo synth` чисто.

### Технические детали

- Решение принято владельцем осознанно (не гоняться за channel sweep — низкая вероятность успеха при полном молчании устройства даже с зажатой PATCH).
- Экспорт/импорт `.syx` и bulk-запрос (32 голоса) остаются в бэклоге Фазы 1.5 — они не зависят от dump request (файловый экспорт работает независимо от отклика устройства).

### Коммит

_(зафиксировать после этой записи)_

---

## Сессия 2026-07-08 (продолжение 2) — Приём SysEx-дампа с железа (инфраструктура)

### Что сделано

- **`src/lib/patch/dx7-sysex.ts`** — `encodeVoiceDumpRequest(channel = 0)`: короткий SysEx-фрейм запроса дампа текущего голоса (voice edit buffer), `F0 43 2n 00 F7`.
- **`src/lib/audio/midi-input.ts`** — `MidiCallbacks.onSysex?` — `MidiInputManager` теперь распознаёт входящие сообщения со статус-байтом `0xF0` и отдаёт их коллбэком целиком (Web MIDI в браузере уже реассемблирует SysEx в одно событие, буферизация не нужна).
- **`src/app/_components/studio/studio-client.tsx`** — `handleRequestFromHardware` шлёт дамп-запрос; `handleSysex` декодирует ответ через `decodeSingleVoiceSysex` и обновляет текущий FM-патч (имя + engine, живой AudioWorklet тоже получает апдейт). Кнопка «Прочитать из железа» рядом с «Отправить в железо» в FM-панели, статус (…ждём ответ / ✓ прочитан / ✗ ошибка) с авто-сбросом.
- Проверено сборкой в превью (без реального устройства): рендер FM-панели, отсутствие ошибок в консоли, `nx lint synth` + `nx typecheck:tsgo synth` чисто.

### Технические детали

- Приём не различает единственный запрошенный дамп от произвольного левого SysEx на шине — `decodeSingleVoiceSysex` бросает исключение на не-single-voice фреймах, `handleSysex` тихо его глотает (не каждый входящий SysEx — наш ответ).
- Bulk-дамп (32 голоса) по-прежнему не запрашивается с этой кнопки — только currently-edited voice; экспорт/импорт `.syx` и bulk-запрос остаются в бэклоге Фазы 1.5.

### Коммит

_(зафиксировать после этой записи)_

---

## Сессия 2026-07-08 (продолжение) — Отправка патча на железо по SysEx

### Что сделано

- **`src/lib/audio/midi-input.ts`** — `MidiInputManager` дополнен `getOutputs()` и `send(bytes: Uint8Array)` (берёт первый доступный MIDI output и шлёт сырые байты через `MIDIOutput.send()`).
- **`src/app/_components/studio/studio-client.tsx`** — `handleSendToHardware`: кодирует текущий FM-патч через `encodeSingleVoiceSysex` и отправляет на подключённое MIDI-устройство; кнопка «Отправить в железо» + статус (✓/✗, авто-сброс через 2с) показывается в FM-режиме только когда MIDI подключён.
- Проверено сборкой в превью (без реального устройства — песочница не видит USB): рендер FM-панели, отсутствие кнопки без MIDI, отсутствие ошибок в консоли.
- **Ручная проверка на реальном SMK-37 — за пользователем** (Web MIDI SysEx недоступен в сэндбоксе превью).

### Технические детали

- Патч отправляется на **первый** найденный MIDI output — если к устройству одновременно привязан вход и выход с разными id, для мультивыходных сетапов потребуется выбор конкретного output (не актуально для одиночного SMK-37).
- Приём ответного SysEx (dump request/reply) не реализован — `_onMessage` пока не различает статус `0xF0`, входящие SysEx-сообщения молча игнорируются. Следующий шаг «прочитать патч с железа» требует это доделать.

### Коммит

_(зафиксировать после этой записи)_

---

## Сессия 2026-07-08 — DX7 SysEx-конвертер (Фаза 1.5, начало)

### Что сделано

- **Исследование:** формат SysEx SMK-37 PRO подтверждён побайтово как стандартный Yamaha DX7 — сверено с реальными заводскими пресетами устройства (`jonathaslacerda/smk-37-pro-docs`, Apache-2.0) и авторитетной документацией (`asb2m10/dexed/Documentation/sysex-format.txt`). Заголовки, checksum, unpacked single-voice (155 байт) и packed bulk (128 байт/голос × 32) раскладки совпадают точно.
- **Найдено:** кнопки/пэды/фейдеры SMK-37 не имеют фиксированной CC-карты — переназначаются в фирменном MidiSuite, хранятся в одном из 4 device-side пресетов (заводской дефолт: клавиши канал 1, пэды канал 10). Подтверждает архитектурное решение «device-agnostic MIDI» вместо жёсткого маппинга.
- **Найдено (важный техдолг):** наш `fm-processor.js` реализует только 5 собственных алгоритмов-приближений вместо всех 32 настоящих топологий DX7 (точные графы модуляции + per-алгоритм feedback найдены в `Dexed/Source/AlgoDisplay.cpp`, но не перенесены). Согласовано с владельцем: сначала SysEx-инфраструктура, точность алгоритмов — отдельным шагом.
- **`src/lib/patch/dx7-sysex.ts`** (новый) — `encodeSingleVoiceSysex`/`decodeSingleVoiceSysex` (155-параметровый unpacked single-voice dump, F0 43 0n 00 01 1B...F7) и `decodeBulkDump` (32-голосый packed bulk dump, F0 43 0n 09 20 00...F7). Общий checksum-helper (masked two's complement). Известные лоссовые поля (keyboard scaling, rate scaling, amp mod sensitivity, oscillator detune/key sync, LFO sync, pitch mod sensitivity, transpose) задокументированы прямо в коде — используются DX7-дефолты при кодировании, отбрасываются при декодировании.
- **`src/lib/patch/__fixtures__/`** (новый) — реальный банк пресетов SMK-37 (`smk37-pro-presets-1.syx`, Apache-2.0, атрибуция в README) как эталонная тестовая fixture.
- **`src/lib/patch/dx7-sysex.spec.ts`** (новый) — round-trip тесты на `FM_BASS`/`FM_GLASS_BELLS` + разбор реального заводского банка (32 голоса, включая точное имя последнего голоса `E.GUITAR 1`, проверенное побайтово по hex-дампу).
- **`apps/synth/tsconfig.spec.json`** (новый) + reference из `tsconfig.json` — первые тесты в synth потребовали тиражирования fix'а для vitest+vite8/oxc (см. `.claude/docs/unit-testing.md`).

### Технические детали

- Наш `operators[0..5]` = DX7 `OP1..OP6`; в байтовом потоке DX7 хранит операторы в обратном порядке (OP6 первым) — конвертер учитывает это при кодировании/декодировании.
- Feedback в реальном DX7 — один глобальный параметр (не per-оператор, как в нашей схеме); используется/восстанавливается только на `operators[0]`, что соответствует тому, как `fm-processor.js` фактически применяет feedback (только к op0).
- Ratio↔coarse/fine — стандартное линейное приближение (`ratio = coarse' × (1 + fine/100)`), используемое большинством DX7-клонов; не 100% идентично оригинальной нелинейной таблице Yamaha, но достаточно для музыкального использования.
- Поле `algorithm` — сквозной проход байта без валидации/маппинга топологии (осознанное упрощение, см. техдолг в PLAN.md).

### Коммит

_(зафиксировать после этой записи)_

---

## Сессия 2026-07-07 — Фикс сборки (@letar/ui) + первое живое MIDI-подключение SMK-37

### Что сделано

- **Фикс билда:** `@letar/ui` не был подключён по всем трём обязательным точкам shared-либы (`.claude/rules/libs.md`) — добавлены `paths`/`references` в `apps/synth/tsconfig.json`, `@letar/ui` в `implicitDependencies` (`package.json`), `transpilePackages` в `next.config.js`.
- **Диагностика реального железа SMK-37 PRO:**
  1. Устройство сначала не определялось `requestMIDIAccess` (пустой список входов) — в Диспетчере устройств Windows висело как `USB DFU` (режим прошивки). Переподключение по USB без зажатых клавиш вернуло его в рабочий MIDI-режим.
  2. После подключения MIDI пропал звук — причина не в коде: SMK-37 одновременно является USB-аудиоинтерфейсом, и Windows переключила устройство воспроизведения по умолчанию на него. Решение — вернуть системный вывод звука на колонки/наушники (или слушать через 3.5мм выход самого SMK-37).
- Убран временный debug-console.log, добавленный для диагностики (`handleMidiConnect`).

### Итог

Первое подтверждённое живое подключение: клавиши/пэды реального SMK-37 PRO играют браузерный субтрактивный движок (Reese-бас) end-to-end.

### Коммит

_(зафиксировать после `nx format/lint/typecheck`)_

---

## Сессия 2026-06-15 — FM AudioWorklet (Фаза 1, продолжение)

### Что сделано

- **`public/worklets/fm-processor.js`** (новый) — `AudioWorkletProcessor` с 6 операторами, 5 алгоритмами (DX7-стиль), DX7-совместимой EG (4 rate + 4 level), feedback на op0, 8-голосая полифония с voice stealing по возрасту. Топологический порядок вычислений обеспечивает правильную модуляцию без zero-delay петель. `Math.tanh` ограничивает клиппинг при глубокой модуляции.
- **`src/lib/audio/fm.ts`** (новый) — `FmEngine`: `static async create(ctx, destination)` регистрирует воркслет и создаёт `AudioWorkletNode`; `noteOn/noteOff/allNotesOff/updatePatch/dispose`. Patch отправляется через `port.postMessage({ type: 'patch', patch })` перед нотами.
- **`src/lib/patch/fm-defaults.ts`** (новый) — два дефолтных FM-патча: `FM_GLASS_BELLS` (алгоритм 2, два 3-оп стека [5→4→3]+[2→1→0], ratio=14 у модуляторов — стеклянный металлик) и `FM_BASS` (алгоритм 1, цепочка 5→4→3→2→1→0, feedback=3 у несущей — FM-гровл).
- **`src/app/_components/studio/fm-panel.tsx`** (новый) — `FmPanel`: выбор алгоритма (5 кнопок с диаграммой потока), 6 `OpCard` в сетке 2×3 (ratio, level, feedback, EG-ручки A/D/S/R), несущие выделены золотым.
- **`src/app/_components/studio/studio-client.tsx`** обновлён: добавлен `engineType: 'subtractive' | 'fm'`, `fmEngineRef`, `masterGainRef`, `handleSwitchEngine` с ленивым созданием `FmEngine` (при первом переключении на FM), `handleFmEngineChange` синхронно отправляет патч в воркслет, переключатель SUB/FM в шапке.

### Технические детали

- `rateToSec(r)`: rate 99 → 1 мс, rate 0 → 10 с (квадратичная шкала, аппроксимирует DX7).
- EG стадии: 0=Attack → 1=Decay1 → 2=Decay2/sustain (держит L3) → 3=Release → 4=Idle.
- Feedback: использует `feedbackPrev` (выход op0 прошлого сэмпла) — избегает zero-delay.
- `Math.tanh(out)` на выходе голоса — мягкое ограничение без жёсткого клиппинга.
- FM движок lazy: создаётся только при первом нажатии кнопки FM, а не при старте аудио.
- Voice stealing: самый старый голос (по `startTime` — монотонный счётчик сэмплов).

### Коммит

`36bb167` — feat(synth): FM AudioWorklet — 6 операторов, 5 алгоритмов, DX7-EG, переключение движков

---

## Сессия 2026-06-15 — Реверберация / FX-шина (Фаза 1, продолжение)

### Что сделано

- **`src/lib/patch/schema.ts`** — добавлен `FxSchema` (`reverb: { wet, decay }`) и поле `fx: FxSchema` в `SubtractiveEngineSchema`. Экспортирован тип `FxParams`.
- **`src/lib/audio/reverb.ts`** (новый файл) — `buildReverbIR(ctx, decay)`: синтетический IR через `OfflineAudioContext`; экспоненциально затухающий шум с разными фазами L/R для стереоширины; возвращает `AudioBuffer`.
- **`src/app/_components/studio/studio-client.tsx`** — мастер-шина в `handleStart`: `masterGain → dryGain → destination` + `masterGain → convolver → reverbWet → destination`; IR строится асинхронно (dry-звук доступен мгновенно); два `useEffect` реагируют на изменение `fx.reverb.wet` (мгновенно) и `fx.reverb.decay` (пересоздаёт IR); CC 91 (GM reverb send) → wet.
- **`src/app/_components/studio/param-panel.tsx`** — секция «FX — Reverb» с двумя ручками: wet (0–100%) + decay (0.1–8 с).
- **`src/lib/patch/hints.ts`** — ментор-подсказки для `fx.reverb.wet` и `fx.reverb.decay` с физическими метафорами (зал, хвост варгана).
- **`src/lib/patch/defaults.ts`** — `REESE_BASS` получил `fx: { reverb: { wet: 0.18, decay: 2.2 } }`.

### Технические детали

- IR-буфер: `OfflineAudioContext(2, ceil(sampleRate * decay), sampleRate)` — стерео, 2 разных зерна L/R дают ~0.003 с фазовый сдвиг.
- Огибающая: `Math.exp(-t * (5 / clampedDecay))` — более гладкое затухание чем линейное.
- Decay-эффект в useEffect: не запускается при старте (convolverRef === null), только при изменении decay пользователем.
- Wet gain: мгновенное обновление через `GainNode.gain.value` без создания нового IR.

### Коммит

`cdc188d` — feat(synth): реверберация — ConvolverNode FX-шина + секция Reverb в UI

---

## Сессия 2026-06-15 — Web MIDI вход (Фаза 1, продолжение)

### Что сделано

- **`src/lib/audio/midi-input.ts`** — `MidiInputManager`: `requestMIDIAccess({ sysex: true })`, разбор сообщений (note on/off, CC 0xB0), детектирование «Note On с velocity=0» как note off, сдвиг октавы `±24` полутона (±2 октавы), автоприкрепление слушателей при изменении состояния устройства (`onstatechange`), `dispose()` снимает все слушатели.
- **`src/app/_components/studio/midi-status.tsx`** — строка статуса: цветная точка (зелёная/красная/серая), имя устройства + производитель, кнопка «Подключить MIDI» / «Повторить» при ошибке, кнопки сдвига октавы `−`/`+`.
- **`studio-client.tsx`** обновлён: `midiRef` (`MidiInputManager`), состояния `midiDevices/midiError/octaveShift`; автоподключение MIDI при старте аудио (`void handleMidiConnect()`); `handleCC` с `applyCC()` — иммутабельное обновление патча по CC-номеру.
- **CC-маппинг 8 энкодеров** (стандарт GM + диапазон 70–77): CC 7→amp.gain, CC 70→osc1.detune, CC 71→filter.resonance, CC 72→amp.release, CC 73→amp.attack, CC 74→filter.cutoff, CC 75→filter.envAmount, CC 76→lfo.rate, CC 77→lfo.depth. Точный маппинг SMK-37 PRO уточняется в Фазе 1.5.

### Технические детали

- `navigator.requestMIDIAccess` не требует user gesture (в отличие от AudioContext) — можно вызывать при старте.
- Октава-сдвиг применяется в `_onMessage` до передачи в коллбэк; диапазон ноты зажат `[0, 127]`.
- `applyCC` возвращает новый объект `SubtractivePatch` (иммутабельно) только для известных CC, иначе возвращает оригинал.
- В браузере превью (sandbox) MIDI недоступен — ошибка «Permission not granted» ожидаема; в реальном Chrome выйдет диалог разрешения.

### Коммит

`b656b94` — feat(synth): Web MIDI вход — устройство-агностичный ввод нот и CC

---

## Сессия 2026-06-15 — Фаза 1: Субтрактивный движок + студийный UI

### Что сделано

- **`src/lib/patch/schema.ts`** — Keystone Zod v4 схемы: `SubtractiveEngineSchema`, `FmEngineSchema`, `DrumkitEngineSchema`, `PatchSchema = z.discriminatedUnion('type', [...])`. Экспорты типов `Patch`, `SubtractivePatch`, `FmPatch`, `DrumkitPatch`, `SubtractiveEngineParams`.
- **`src/lib/patch/hints.ts`** — `HINTS` (const record): физические метафоры на русском для каждой ручки (варган, дарбука, диджериду как мостики к теории).
- **`src/lib/patch/defaults.ts`** — `REESE_BASS`: 2 пилы (osc1 detune=0, osc2 detune=+7¢), LP-фильтр cutoff=0.35, LFO rate=0.35 дышит cutoff-ом с depth=0.18.
- **`src/lib/audio/midi.ts`** — `midiToFreq`, `cutoffNormToFreq` (лог. шкала 20·1000ⁿ), `midiNoteName`, `isBlackKey`.
- **`src/lib/audio/context.ts`** — singleton `AudioContext`, `getAudioContext()`, `resumeContext()`.
- **`src/lib/audio/subtractive.ts`** — `SubtractiveEngine` (8-голосая полифония, voice stealing по возрасту): `noteOn/noteOff/allNotesOff/dispose`; граф сигнала: osc1+osc2 → BiquadFilter → GainNode (amp) → destination; ADSR через `linearRampToValueAtTime`/`setTargetAtTime`; LFO аддитивно к `filter.frequency`/`osc.detune`/`gainAmp.gain`.
- **`src/app/_components/studio/knob.tsx`** — SVG кноб 270° (7→5 часов), drag 150px = 0→1; `Tooltip.Root/Trigger(asChild)/Positioner/Content` + `<Portal>` — ментор-тултипы.
- **`src/app/_components/studio/keyboard.tsx`** — 2 октавы C2–B3 (MIDI 36–59), белые+чёрные клавиши позиционированы через `BLACK_OFFSET * WHITE_KEY_W * 7 * octaveIndex`; QWERTY-маппинг A–;; `setPointerCapture` для drag-across.
- **`src/app/_components/studio/param-panel.tsx`** — 5 секций (OSC1, OSC2, Filter, Amp, LFO); нативные `<button>` со стилями через `btnStyle()` (запрет `as=`); `patchEngine()` для иммутабельных обновлений.
- **`src/app/_components/studio/studio-client.tsx`** — оверлей «Нажми чтобы услышать» до первого клика; `patchRef` против stale-замыканий в аудио-коллбэках.
- **`src/app/page.tsx`** — прямой импорт `StudioClient` (без `dynamic(ssr:false)` — запрещено в Server Components Next.js 16).

### Фиксы в процессе

- `Tooltip` как namespace (`.Root/.Trigger/.Positioner/.Content`) — не JSX-компонент напрямую.
- `as="button"` → нативный `<button>` (запрет `as=` в правилах монорепо).
- `ssr: false` в Server Component → убран `dynamic()`.
- Позиция чёрных клавиш 2-й октавы: формула `WHITE_KEY_W * NUM_OCTAVES * octaveIndex` → исправлено на `WHITE_KEY_W * 7 * octaveIndex`.

### Коммит

`290f41b` — feat(synth): Фаза 1 — субтрактивный движок + студийный UI

---

## Сессия 2026-06-15 — Открытие и планирование (пред-Фаза 0)

Кодовой реализации ещё нет. Это была сессия глубокого открытия (discovery) и проектирования «под ключ»: собран профиль владельца, проведено веб-исследование, написан детальный план и подготовлен холодный хэндофф исполняющему агенту.

### Что сделано

- **Исследование (веб):** подтверждены спеки M-VAVE SMK-37 PRO (встроенный 6-операторный FM-движок класса DX7, 3.5мм выход + режим USB-аудиоинтерфейса, загрузка патчей по SysEx), формат DX7-SysEx (155 байт single / 4104 bulk), Web MIDI (Chrome/Edge, sysex, нет Safari/iOS), FL Studio MIDI Scripting (Python), FM в AudioWorklet (webdx7 / dexed / dx7-synth-js).
- **Решения зафиксированы:** имя `synth` (публичный app в letar, **не** submodule); код open-source, музыка приватна по умолчанию; FM — свой 6-оп AudioWorklet (не WASM-Dexed: GPL + учебная цель); browser-first; MIDI устройство-агностичен; хранилище local-first (IndexedDB) + публикуемые JSON в `patches/`.
- **Профиль владельца уточнён** (важная правка: **НЕ** цветовой синестет — слышит пространство/«сцену» и «правду/фальшь»; телесное и сюжетное восприятие). Вкусы, инструменты, референсы, звуковые приоритеты (раскатистый бас №1) — сведены в PLAN.
- **Эстетика:** «звук → геометрия/пространство», визуал = реактивный спин-граф; лого — Звезда Давида из двух невозможных треугольников Пенроуза (нарисован концепт-набросок); палитра Малевич/Климт/Ван Гог/Босх; принцип «визуал рождает сюжет».
- **Фазы 0–6 расписаны:** браузерное ядро (3 движка FM/субтрактив/драм) → мост к железу (SysEx) → FL Studio → MCP → композиция → VJ/перформанс → голос/спокен-ворд. Учтены: драм-пэды, 3D/surround-звук, VJ-режим, вокальный тракт с компрессором (против сценической паники).

### Созданные артефакты

- `apps/synth/PLAN.md` — детальный план.
- `apps/synth/claude.md` — контекст «читать первым» для исполняющего агента.
- `apps/synth/.gitignore` (исключает `private/`).
- Папки: `patches/` (README), `tracks/` (README), `private/{tracks,patches,about}/` (gitignored).
- `apps/synth/private/about/story.md` — растущий черновик артист-байо (приватно; пополняется при каждом новом рассказе владельца).

### Открыто / для исполняющего агента

- Свободный порт 3xxx (выбрать при скаффолде).
- **Keystone:** JSON-схема модели патча (`type: 'fm' | 'subtractive' | 'drumkit'`) — спроектировать и утвердить с владельцем **до кода Фазы 1**.
- Остаток Фазы 0: `nx g @nx/next:application`, тема, providers, `.claude/commands/synth.md` (скилл с ролью ментора + правило дневника), `JOURNAL.md` / `PLAN_TESTING.md` / `CHANGELOG.md` / `LICENSE`.
- Хэндофф-промпт для первого запуска агента подготовлен (агент создаёт `/synth` в Фазе 0). Скилл `/synth` пока НЕ существует.

### Термины, введённые в разговоре (для будущего `JOURNAL.md`)

тембр · ADSR · оператор/несущая/модулятор · cutoff/резонанс · velocity · transient · реверберация/пространство · Reese-бас · спатиализация (HRTF). Дневник стартует в Фазе 1, когда появятся первые звуки.
