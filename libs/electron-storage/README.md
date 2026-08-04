# @letar/electron-storage

Универсальное JSON-хранилище настроек в userData для Electron-приложений

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { createJsonStore } from '@letar/electron-storage'

interface Settings {
  widthCm: number
  font: string
}

const store = createJsonStore<Settings>('settings.json', { widthCm: 91.4, font: 'Arial' })

const settings = await store.load() // { widthCm: 91.4, font: 'Arial' }, если файла ещё нет
await store.save({ widthCm: 50, font: 'Verdana' })
await store.update({ widthCm: 60 }) // мёрджит поверх текущего значения
```

Объединяет паттерны, ранее продублированные по приложениям: кеш с TTL и sync/async
API (`label-printer-desktop`), merge с дефолтами и `update()` (`animatrona`), атомарная
запись tmp+rename (`kami-key-the`).

## API

### `createJsonStore<T>(filename, defaultValue, options?)`

Создаёт хранилище одного JSON-файла в `app.getPath('userData')` (переопределяется
опцией `dir`).

| Метод               | Описание                                                            |
| ------------------- | ------------------------------------------------------------------- |
| `getPath()`         | Абсолютный путь к файлу                                             |
| `exists()`          | Существует ли файл на диске                                         |
| `loadSync()`        | Синхронная загрузка — для старта приложения, до event loop          |
| `load()`            | Асинхронная загрузка                                                |
| `saveSync(data)`    | Синхронное сохранение                                               |
| `save(data)`        | Асинхронное сохранение                                              |
| `update(partial)`   | Загрузить → смёрджить partial поверх текущего → сохранить → вернуть |
| `invalidateCache()` | Сбросить кеш — следующий load/loadSync перечитает диск              |

Если файла нет или чтение/парсинг упали — возвращается `defaultValue`, ошибка логируется
(кроме отсутствия файла — это обычный случай первого запуска, не логируется).

### Опции

| Опция           | По умолчанию              | Описание                                                                         |
| --------------- | ------------------------- | -------------------------------------------------------------------------------- |
| `dir`           | `app.getPath('userData')` | Директория для файла                                                             |
| `cacheTtlMs`    | `0` (без кеша)            | TTL кеша в мс — повторные load/loadSync в этот срок не трогают диск              |
| `mergeDefaults` | `false`                   | `{ ...defaultValue, ...parsed }` вместо замены — для эволюции интерфейса         |
| `logger`        | `console`                 | Логгер ошибок (`{ error(...args) }`)                                             |
| `atomic`        | `false`                   | Запись через `${filename}.tmp` + rename — без частично записанного JSON при сбое |

## Команды

```bash
nx test electron-storage
nx lint electron-storage
nx typecheck:tsgo electron-storage
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/electron-storage` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/electron-storage` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
