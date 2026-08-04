# Path traversal при работе с загруженными файлами

## Суть уязвимости

Наивная проверка пути к файлу выглядит безопасной, но не защищает от path traversal:

```typescript
// ❌ Не защищает
const target = path.join(root, userInput)
if (!target.startsWith(root)) {
  throw new Error('Forbidden')
}
```

Две причины, почему это ломается:

1. **`path.join`/`path.resolve` сами схлопывают `..`.** Строка вида `a/../../b` после `join`
   превращается в путь, лежащий на два уровня выше `root`, — а `startsWith(root)` проверяет уже
   нормализованный результат, а не исходный ввод. Проверка не срабатывает, потому что смотрит не
   туда: к моменту проверки traversal уже произошёл внутри самой функции построения пути.
2. **`startsWith(prefix)` — сравнение строк, а не путей.** `root = '/app/uploads'` пропустит
   `/app/uploads-secret/passwd`, потому что строка начинается с нужного префикса, хотя это другой
   каталог.

Единственная надёжная защита — нормализовать итоговый путь через `path.resolve()` и сравнить его
с корнем через `path.relative()`, проверяя, что результат не начинается с `..` и не является
абсолютным путём.

## Готовое решение — `resolveUploadPath`

`@letar/image-upload/server` экспортирует готовую функцию:

```typescript
export type ResolveFailure = 'traversal' | 'invalid'
export type ResolveResult = { ok: true; absPath: string } | { ok: false; reason: ResolveFailure }

function resolveUploadPath(root: string, segments: readonly string[]): ResolveResult
```

- `root` — корень, за пределы которого нельзя выходить (обычно `path.join(process.cwd(), 'uploads')`).
- `segments` — массив сегментов пути из пользовательского ввода (сегменты URL, части относительного
  пути и т.п.). Собираются через `path.resolve(rootAbs, ...segments)` — если сегмент сам окажется
  абсолютным путём (`/etc/passwd`, `C:\Windows`), `resolve` спрыгнет туда, и это поймает проверка
  ниже.
- Возвращает `{ ok: true, absPath }` при успехе или `{ ok: false, reason }`, где `reason` различает
  «путь ведёт за пределы корня» (`'traversal'`) и «мусор во входных данных, например нулевой байт»
  (`'invalid'`).

Пример вызова:

```typescript
import { resolveUploadPath } from '@letar/image-upload/server'

const resolved = resolveUploadPath(uploadsRoot, [userId, fileName])
if (!resolved.ok) {
  throw new Error(resolved.reason === 'traversal' ? 'Forbidden' : 'Bad request')
}

// только теперь можно трогать файловую систему
await fs.rename(resolved.absPath, destPath)
```

Функция чистая (не трогает файловую систему) — её удобно юнит-тестировать без фикстур на диске.

## Когда применять

Любой код, который берёт путь к файлу (для чтения, записи, переименования или удаления) из данных,
пришедших от клиента:

- Server Action с полем-путём (`z.string()`), даже если оно называется невинно — `fileName`,
  `coverPath`, `slug`.
- API route, где сегмент пути идёт из `params` или query.
- Обработка form-data, где имя файла на диске строится из данных запроса.

Правило простое: **сначала `resolveUploadPath`, только потом любая fs-операция**. Если результат
`{ ok: false }` — операция не выполняется вообще, а не «выполняется с исходным небезопасным путём
как fallback».

## Смежная ловушка — расширение файла из `originalName`

Даже если путь назначения безопасен (жёстко закодирован или уже прогнан через
`resolveUploadPath`), генерация **имени** файла из пользовательского ввода — отдельный источник
traversal:

```typescript
// ❌ Опасно: originalName может быть "../../evil.js" или содержать "/"
const ext = originalName.split('.').pop()
const fileName = `${cuid()}.${ext}`
```

Если `originalName` целиком (а не только расширение) идёт в путь без очистки от `/` и `\`,
получившееся «имя файла» на самом деле может оказаться относительным путём, уводящим запись за
пределы каталога назначения. Это встречалось в `apps/grandslamcup/src/lib/upload/save-file.ts` до
фикса 2026-08-04. Решение — либо явно проверять расширение по allowlist, либо прогонять итоговое
имя через `resolveUploadPath` наравне с путями, пришедшими напрямую от клиента.

## Прецеденты

- `apps/mandala/src/app/api/og-image/route.ts` + тест `__tests__/route.spec.ts`.
- `apps/grandslamcup/src/app/my/poems/_actions/album.action.ts` (`moveAlbumCover`) + тест
  `_actions/__tests__/album.action.spec.ts`.

## Тестовый паттерн

Юнит-тест на `resolveUploadPath` (или на функцию, которая его использует) должен покрывать:

1. **Положительный контроль** — реальный существующий файл вне `uploads/` (например, во временном
   каталоге теста). Без этого отказ по traversal нельзя отличить от «файла и так не существует»:
   тест на несуществующий файл прошёл бы одинаково при рабочей и при сломанной защите.
2. **Несколько уровней `../`** — `['..', '..', 'etc', 'passwd']` и одиночный `..`.
3. **Абсолютный путь** — с поправкой на Windows: если traversal-строка собирается через
   `.split('/')`, ведущий слэш unix-пути (`/etc/passwd`) съедается сплитом и превращается в
   относительный сегмент `etc/passwd`, который может ошибочно пройти проверку. На Windows для
   теста абсолютного пути нужно использовать путь с буквой диска (`C:\\Windows\\System32`), а не
   unix-style `/etc/passwd` — иначе тест проверяет не то, что должен.
