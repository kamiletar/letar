# NVENC и выдача видео в браузер: AV1 → HEVC → H.264

**Коротко:** видео, закодированное заранее на видеокарте NVIDIA, выгодно отдавать тремя файлами:
AV1 10 бит, HEVC Main 10 и H.264 High 8 бит. Браузер выбирает первый, который его устройство
декодирует **аппаратно** (`mediaCapabilities.decodingInfo` → `powerEfficient`). У `ffmpeg` с
NVENC есть три тихие ловушки в параметрах, а у серверного `libx264` без `-pix_fmt` — одна
громкая: из 10-битного исходника выходит H.264, который Chrome не показывает. Проверено
2026-09-16: RTX 5080 Laptop, драйвер 616.92, NVENC API 13.1, Chromium 152.

## Ступени

| Ступень | Кодирование                                 | `codecs` (1080p30) | Кому                                   |
| ------- | ------------------------------------------- | ------------------ | -------------------------------------- |
| 1       | `av1_nvenc`, `-highbitdepth 1`              | `av01.0.08M.10`    | устройства с аппаратным AV1            |
| 2       | `hevc_nvenc`, `-pix_fmt p010le -tag:v hvc1` | `hvc1.2.4.L120.B0` | Safari, многие Android, Windows с HEVC |
| 3       | `h264_nvenc`, `-pix_fmt yuv420p`            | `avc1.640028`      | все остальные — запасная, есть всегда  |

Строку `codecs` брать из `ffprobe` конкретного файла (уровень зависит от размера и частоты
кадров), а не хардкодом. Все файлы — с `-movflags +faststart`, иначе перемотка ждёт загрузки
конца файла.

## Выбор в браузере

```ts
// Первая ступень, которую устройство декодирует аппаратно; иначе H.264
for (const source of [av1, hevc]) {
  const info = await navigator.mediaCapabilities.decodingInfo({
    type: 'file',
    video: { contentType: `video/mp4; codecs="${source.codecs}"`, width, height, bitrate, framerate },
  })
  if (info.supported && info.powerEfficient) {
    return source
  }
}
return h264
```

- `powerEfficient` у Chromium означает аппаратный декодер. Одного `supported` мало: программный
  AV1 на слабом телефоне «поддерживается», но греет его и роняет кадры.
- Без JavaScript — `<source>` в том же порядке. Браузер возьмёт первый, который умеет, но
  программный декодер от аппаратного не отличит.
- Замер в Chromium 152 на машине с RTX 5080: у всех трёх ступеней `supported`, `smooth`,
  `powerEfficient` = true, `VideoDecoder.isConfigSupported({ hardwareAcceleration:
  'prefer-hardware' })` = true, все три играют. Ветку «нет аппаратного AV1» на такой машине не
  воспроизвести — нужен реальный старый телефон.

## Ловушки `ffmpeg` + NVENC

- ⚠️ **`-tf_level` принимает только 0 и 4.** На 1 `ffmpeg` падает с «Invalid temporal filtering
  level», и выглядит это как «драйвер не умеет фильтр». Значение 4 работает для `av1_nvenc` и
  `hevc_nvenc`.
- ⚠️ **`-rc-lookahead` молча урезается.** 250 превращается примерно в 51, в журнале только строка
  «Clipping lookahead depth» на уровне verbose. Писать реальное значение (48), чтобы профиль не
  обещал больше, чем делает.
- 10 бит из 8-битных кадров: `-highbitdepth 1` у `av1_nvenc` или `-pix_fmt p010le`.
- ⚠️ **HEVC без `-tag:v hvc1`** (по умолчанию `hev1`) Safari не играет, остальные браузеры —
  играют. Тест в Chromium этого не покажет.
- Замер, 20 с Full HD 30 кадров/с: `av1_nvenc` p5 — 1,6 с, `hevc_nvenc` p5 — 1,5 с, `libx265`
  medium на 24 потоках — 7,1 с. Профиль «Blackwell UHQ» Animatrona (p7, `-tune uhq`,
  `-multipass fullres`, lookahead) на AV1 10 бит — 5,0 с.

## ⚠️ Серверный `libx264` без `-pix_fmt`

`libx264` сохраняет разрядность входа. 10-битный исходник (так снимают современные телефоны)
превращается в H.264 **High 10** (`yuv420p10le`), а его Chromium не декодирует вовсе —
[chromium-video-codec-limits](/.claude/docs/chromium-video-codec-limits.md). Кодирование при этом
проходит без ошибок. Лечится `-pix_fmt yuv420p` (для HDR-исходника ещё и тонмаппинг). Касалось
`infra/media-server` на 2026-09-16 — [media-server](/.claude/docs/media-server.md).

AV1 на сервере без видеокарты не кодировать: программный кодек в разы медленнее, а сервер общий.

## ⚠️ Местный `ffmpeg` не прочитал AV1 от NVENC — файл при этом целый

Сборка `ffmpeg` без dav1d декодирует AV1 через libaom, и на файле от `av1_nvenc` выдаёт «No
sequence header». Chromium тот же файл играет. Проверять AV1-результат нужно декодером dav1d или
браузером, а не выводить «кодировщик сломан».
