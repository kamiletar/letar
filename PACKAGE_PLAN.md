# PACKAGE_PLAN: Задачи по зависимостям монорепо

Задачи по устранению оставшихся конфликтов версий после хоистинга зависимостей в корневой `package.json`.

**Дата:** 2026-03-02
**Контекст:** Фазы 1-3 выполнены — дублирующие/совместимые зависимости перенесены в root. Ниже — задачи по оставшимся конфликтам, каждая требует отдельного тестирования.

---

## Задача 1: @letar/email — обновить nodemailer v6 → v8

**Приоритет:** Высокий
**Сложность:** Низкая
**Файлы:** `libs/email/package.json`, `libs/email/src/provider.ts`

### Проблема

Root: `nodemailer: ^8.0.0`, проект: `^6.9.16`. Два разных мажорных — дублирование в node_modules.

### Что ломается при обновлении

- **v7:** Удалена поддержка старого AWS SES SDK (v2, v3) — только SESv2. Удалены SES-specific rate limiting и idling. **Нас не касается** — используем SMTP напрямую.
- **v8:** Код ошибки `'NoAuth'` переименован в `'ENOAUTH'`. Добавлен DNS fallback. **Нас не касается** — мы не ловим `'NoAuth'`.

### Что делать

1. Проверить `libs/email/src/provider.ts` — использует `createTransport`, `sendMail`, тип `Transporter`. Эти API стабильны v6→v8.
2. Удалить `nodemailer` и `@types/nodemailer` из `libs/email/package.json` — root предоставит v8 и `@types/nodemailer@^7`.
3. Проверить типы: `nx typecheck:tsgo driving-school` (наиболее активный пользователь email).
4. Тест: отправить email через любое приложение (driving-school или kami).

### Риск

Низкий. API `createTransport`/`sendMail` не менялся. Мы не используем SES и не ловим `'NoAuth'`.

**Источники:** [nodemailer CHANGELOG](https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md), [nodemailer releases](https://github.com/nodemailer/nodemailer/releases)

---

## Задача 2: label-printer-desktop — обновить electron v39 → v40

**Приоритет:** Средний
**Сложность:** Средняя
**Файлы:** `apps/label-printer-desktop/package.json`, `apps/label-printer-desktop/main/preload.ts`

### Проблема

Root: `electron: ^40.6.1`, проект: `^39.2.7`. Разные мажорные = разный native ABI. Нативные модули (serialport, canvas) собраны под v39 — при резолве v40 из root будут крэши.

### Что ломается при обновлении

- **Clipboard API deprecated** в renderer — нужно через preload + contextBridge. У нас `preload.ts` уже использует contextBridge, нужно проверить clipboard usage.
- **Chromium:** 142 → 144, **Node.js:** v22 → v24, **V8:** 14.2 → 14.4. Требуется пересборка нативных модулей.
- **macOS dSYM:** `.zip` → `.tar.xz` — не актуально (мы не билдим под macOS).

### Что делать

1. Удалить `"electron": "^39.2.7"` из `apps/label-printer-desktop/package.json`.
2. Обновить `electron-rebuild` в скрипте postinstall (если есть) с `-v 41.0.0`.
3. `bun install` → `electron-rebuild -f -w serialport,canvas,better-sqlite3`.
4. `nx dev label-printer-desktop` — проверить запуск.
5. Тест: печать этикетки через serialport, парсинг PDF, генерация изображений canvas.
6. Проверить clipboard usage в preload.ts — если есть прямой доступ, мигрировать на contextBridge.

### Риск

Средний. Нативные модули (serialport, canvas) — главная точка отказа. Нужна ручная проверка печати.

**Источники:** [Electron 40.0.0](https://www.electronjs.org/blog/electron-40-0), [Breaking Changes](https://www.electronjs.org/docs/latest/breaking-changes)

---

## Задача 3: label-printer-desktop — обновить pdfjs-dist v4 → v5

**Приоритет:** Низкий
**Сложность:** Средняя
**Файлы:** `apps/label-printer-desktop/package.json`, `libs/label-printer-core/src/parsers/pdf-parser.ts`

### Проблема

Root: `pdfjs-dist: ^5.5.207`, проект: `^4.10.38`. Мажорное обновление — возможны изменения API.

### Что ломается при обновлении

- Новые обязательные CSS-переменные для text/annotation layers (**не актуально** — мы рендерим в canvas, не в DOM).
- Удалены некоторые старые exceptions.
- Лимиты на размер canvas (**может затронуть** — мы рендерим страницы PDF в canvas для сканирования DataMatrix).

### Используемый API (pdf-parser.ts)

```typescript
import type { GlobalWorkerOptions, PDFDocumentProxy } from 'pdfjs-dist'
const pdfjs = await import('pdfjs-dist')
pdfjs.GlobalWorkerOptions.workerSrc = ''
const loadingTask = pdfjs.getDocument({ data: pdfBuffer, ... })
const pdfDoc = await loadingTask.promise
```

API `getDocument`, `GlobalWorkerOptions`, `PDFDocumentProxy` — стабильный, маловероятно что поменялся.

### Что делать

1. Удалить `pdfjs-dist` из `apps/label-printer-desktop/package.json`.
2. Проверить типы: `nx typecheck:tsgo label-printer-desktop`.
3. Тест: загрузить PDF с DataMatrix кодами → проверить что парсинг работает.
4. Если canvas limits ломают рендеринг больших PDF — добавить `maxCanvasPixels` опцию.

### Риск

Средний. `getDocument`/`PDFDocumentProxy` стабильны, но canvas limits могут сломать рендеринг крупных PDF.

**Источники:** [pdf.js releases](https://github.com/mozilla/pdf.js/releases), [pdfjs-dist npm](https://www.npmjs.com/package/pdfjs-dist)

---

## Задача 4: label-printer-desktop — canvas из optional в regular dep

**Приоритет:** Низкий
**Сложность:** Низкая
**Файлы:** `package.json` (root), `apps/label-printer-desktop/package.json`

### Проблема

Root: `canvas: ^3.2.1` в `optionalDependencies`. Проект: `^3.1.0` в `dependencies`. Версии совместимы (^3.1 включает 3.2), но root держит canvas как optional — при ошибке сборки нативного модуля пакет молча пропускается. Для label-printer-desktop canvas обязателен.

### Варианты решения

**A. Перенести canvas в root dependencies (рекомендуется)**

- `package.json`: переместить из `optionalDependencies` в `dependencies`.
- Удалить из `apps/label-printer-desktop/package.json`.
- Плюс: единый источник. Минус: может ломать `bun install` на машинах без build-tools для canvas (CI, чистые серверы).

**B. Оставить как есть**

- Canvas остаётся optional в root и hard dep в проекте.
- Workspace resolution гарантирует установку для label-printer-desktop.
- Плюс: безопасно. Минус: дублирование.

### Риск

Вариант A: может ломать CI. Вариант B: нулевой.

---

## Задача 5: dashboard-agent — обновить node-cron v3 → v4

**Приоритет:** Низкий
**Сложность:** Низкая
**Файлы:** `apps/dashboard-agent/package.json`, `apps/dashboard-agent/src/lib/cron.ts`

### Проблема

Root: `node-cron: ^4.2.1`, проект: `^3.0.3`. Но даже после обновления **node-cron должен остаться в project package.json** из-за Docker изоляции (Dockerfile копирует только project package.json).

### Используемый API (cron.ts)

```typescript
import * as cron from 'node-cron'
const scheduledTasks = new Map<string, cron.ScheduledTask>()
const task = cron.schedule(job.schedule, async () => { ... })
```

### Что ломается при обновлении

v4 оптимизировал внутренний механизм планирования (вместо проверки каждую секунду — предвычисление). API `cron.schedule()` и `ScheduledTask` сохранён, но могут быть мелкие отличия в типах.

### Что делать

1. Обновить `node-cron` в `apps/dashboard-agent/package.json` до `^4.2.1`.
2. Обновить `@types/node-cron` если нужно (проверить совместимость типов v4).
3. Проверить что `cron.schedule()` и `ScheduledTask` работают.
4. `nx build dashboard-agent` → тест запуска.
5. **Оставить** в project package.json (Docker!), но теперь версия совпадает с root.

### Риск

Низкий. API `schedule()`/`ScheduledTask` не менялся. Обновление больше ради единообразия версий.

**Источники:** [node-cron npm](https://www.npmjs.com/package/node-cron), [migration guide](https://nodecron.com/migrating-from-v3)

---

## Задача 6: dashboard-agent — архитектура Docker-зависимостей

**Приоритет:** Низкий (nice-to-have)
**Сложность:** Высокая
**Файлы:** `apps/dashboard-agent/Dockerfile.production`, `apps/dashboard-agent/package.json`

### Проблема

Dashboard-agent вынужден дублировать ВСЕ 8 runtime зависимостей в своём package.json, потому что Dockerfile копирует только его и делает `bun install` изолированно. Это архитектурное ограничение — зависимости всегда будут расходиться с root.

### Варианты решения

**A. Multi-stage build с root package.json**
Копировать root `package.json` + `bun.lock` + `apps/dashboard-agent/package.json` в Docker. Bun workspace resolution сам подтянет нужное. Минус: image будет содержать все root deps.

**B. Генерировать merged package.json при сборке**
Скрипт `prebuild` берёт root + project deps и мержит в один файл для Docker. Минус: сложно поддерживать.

**C. Оставить как есть (рекомендуется)**
Дублирование 8 пакетов — приемлемая цена за простоту Docker-сборки. Периодически синхронизировать версии вручную.

### Риск

Вариант C: нулевой. Вариант A/B: может сломать Docker builds.

---

## Сводка

| #   | Задача                                 | Приоритет | Сложность | Зависимость |
| --- | -------------------------------------- | --------- | --------- | ----------- |
| 1   | @letar/email: nodemailer v6→v8         | Высокий   | Низкая    | —           |
| 2   | label-printer: electron v39→v40        | Средний   | Средняя   | —           |
| 3   | label-printer: pdfjs-dist v4→v5        | Низкий    | Средняя   | после #2    |
| 4   | label-printer: canvas optional→regular | Низкий    | Низкая    | —           |
| 5   | dashboard-agent: node-cron v3→v4       | Низкий    | Низкая    | —           |
| 6   | dashboard-agent: Docker архитектура    | Низкий    | Высокая   | —           |

**Рекомендуемый порядок:** 1 → 5 → 4 → 2 → 3. Задача 6 — по желанию.
