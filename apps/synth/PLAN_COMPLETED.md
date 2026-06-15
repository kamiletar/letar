# PLAN_COMPLETED — synth

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
