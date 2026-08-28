# @letar/file-scan

Антивирусный скан загружаемых файлов: интерфейс `FileScanner` + реализация поверх clamd
(`ClamAvScanner`) + dev-заглушка (`FakeCleanScanner`) + резолвер выбора сканера по окружению
(`resolveFileScanner`).

Вынесена из двух независимо продублированных реализаций одного и того же паттерна:
`apps/domwellbes/src/lib/private-files/{types,scanner-clamav,scanner-fake,scanner-resolver}.ts`
и `apps/dsperevod/src/lib/file-scan/{types,scanner-clamav,scanner-fake,scanner-resolver}.ts`
(2026-08-28). `PrivateFileStorage`/`ReceivePrivateFileInput` и остальная state-machine-специфика
domwellbes остались в приложении — общая часть только сам сканер.

## Правило

**Не настроен — значит не пропускаем.** Любая неудача сканера — это `SCAN_FAILED`, никогда не
`CLEAN`. Резолвер намеренно не смотрит на `NODE_ENV` (`next build`/`next start` всегда
выставляют `production`, в том числе на staging) — решение принимается только по наличию
`CLAMAV_HOST`.

## Установка

```typescript
import { resolveFileScanner } from '@letar/file-scan'

const scanner = resolveFileScanner()
const result = await scanner.scan(bytes)
```

## API

- `resolveFileScanner(): FileScanner` — ленивый singleton-резолвер. Порядок выбора:
  1. `CLAMAV_HOST` задан → `ClamAvScanner` (порт — `CLAMAV_PORT`, по умолчанию `3310`).
  2. `ALLOW_FAKE_FILE_SCANNER === 'true'` (строгое сравнение) → `FakeCleanScanner`, только для
     dev/test.
  3. Иначе → внутренняя `UnavailableScanner`, всегда отдаёт
     `{ status: 'SCAN_FAILED', resultCode: 'SCANNER_NOT_CONFIGURED' }`.
- `resetFileScannerCache(): void` — только для тестов, сбрасывает закешированный инстанс.
- `ClamAvScanner` — клиент протокола clamd (`INSTREAM`/`VERSION`) поверх `node:net`.
- `FakeCleanScanner` / `FakeFixedResultScanner` — заглушки для dev и тестов.
- Типы: `FileScanner`, `ScanResult`, `ClamAvScannerOptions`.

## Переменные окружения

| Переменная                | Значение                                      |
| ------------------------- | --------------------------------------------- |
| `CLAMAV_HOST`             | Хост clamd (контейнер `letar-clamav`)         |
| `CLAMAV_PORT`             | Порт clamd, по умолчанию `3310`               |
| `ALLOW_FAKE_FILE_SCANNER` | `'true'` включает dev-заглушку «всегда чисто» |

Подробнее про сам контейнер — `infra/clamav/README.md` в корне letar.
