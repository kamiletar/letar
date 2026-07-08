# Fixtures — реальные SysEx-данные с железа

`smk37-pro-presets-1.syx` — заводской пресет-банк M-VAVE SMK-37 PRO (32 голоса, стандартный DX7 bulk dump).

Источник: [jonathaslacerda/smk-37-pro-docs](https://github.com/jonathaslacerda/smk-37-pro-docs/blob/main/sysex/SMK37-Pro-Presets-1.syx), лицензия Apache-2.0.

Используется в `dx7-sysex.spec.ts` как эталонный round-trip тест: если наш декодер не может разобрать реальные данные с железа — это баг конвертера, а не абстрактный юнит-тест.

Голос №32 (последний в банке) называется `E.GUITAR 1` (Electric Guitar) — проверено побайтово по hex-дампу файла.
