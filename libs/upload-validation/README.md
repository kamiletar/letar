# @letar/upload-validation

Утилиты для upload routes на `File`/`FormData`: валидация типа/размера и сохранение на
диск с безопасным именем файла. Не связана с `@letar/image-upload` — та отвечает за
sharp-обработку изображений и раздачу `uploads/` (`GET`), эта — за приём файла и запись
на диск (`POST`), для любого типа файла, не только изображений.

## Установка

Библиотека уже включена в монорепозиторий. Добавь `@letar/upload-validation` в
`nx.implicitDependencies` в `package.json` приложения — см. «Подключение к приложению» ниже.

## API

### `extractAndValidateFile(request, fieldName, options)`

Извлекает файл из `FormData` запроса и валидирует его. Возвращает либо
`{ file, formData }`, либо `{ error }` — готовый `NextResponse` с кодом `400`.
`formData` в успешном результате возвращается наряду с `file`, чтобы не читать тело
запроса дважды, если роуту нужны другие поля формы.

```ts
import { extractAndValidateFile } from '@letar/upload-validation'

export async function POST(request: Request) {
  const { file, error } = await extractAndValidateFile(request, 'file', {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: 'image/', // префикс — любой image/*; либо список: ['image/jpeg', 'image/png']
  })
  if (error) { return error }

  // file: File
}
```

### `extractAndValidateFiles(request, fieldName, options)`

Вариант для множественной загрузки — извлекает все значения поля через
`formData.getAll(fieldName)` и валидирует каждое по отдельности. В отличие от
`extractAndValidateFile`, один невалидный файл **не прерывает** всю операцию: он попадает
в `failures` с причиной, остальные файлы обрабатываются дальше. Значения поля, которые не
являются `File` (например пустая строка), тоже уходят в `failures`, а не бросают исключение.

```ts
import { extractAndValidateFiles } from '@letar/upload-validation'

export async function POST(request: Request) {
  const { files, failures, error } = await extractAndValidateFiles(request, 'files', {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: 'image/',
  })
  if (error) { return error }

  if (failures.length) {
    // failures: { index, name, reason }[] — вызывающий код сам решает,
    // что делать: залогировать, вернуть частичный успех клиенту и т.д.
    console.warn('Пропущены файлы:', failures)
  }

  for (const file of files) {
    // file: File — только прошедшие валидацию
  }
}
```

### `validateFile(file, options)`

То же самое, но без чтения `FormData` — когда файл уже извлечён откуда-то ещё.
Возвращает `{ valid: boolean, error?: NextResponse }`.

### `generateFilename(originalName)`

Генерирует уникальное имя файла (`timestamp-random.ext`). Расширение берётся из
`originalName`, но обязательно очищается до `[a-zA-Z0-9]` — `originalName` приходит из
multipart-заголовка под полным контролем клиента, а результат попадает в `join()` при
записи на диск. Без очистки враждебное имя (`a./etc/passwd`, `a.\..\..\windows\evil`)
уводит запись за пределы каталога `uploads/`.

⚠️ Этот класс дефекта чинили независимо трижды в разных приложениях монорепо (driving-school,
mandala, grandslamcup) до выноса сюда — регрессионный тест `save-file.spec.ts` фиксирует его
положительным контролем (прежняя уязвимая реализация обязана падать на тех же именах).

### `saveFileToDisk(file, subdir, filename)`

Сохраняет файл в `<cwd>/uploads/<subdir>/<filename>`, создавая директорию при
необходимости. Возвращает `{ path, buffer }` — `path` относительный, для хранения в БД.

### `ensureUploadDir(subdir)`, `deleteFileFromDisk(relativePath)`, `deleteOldFile(fileInfo)`

Вспомогательные функции для той же схемы хранения («файл на диске + путь в БД»).
`deleteFileFromDisk` безопасно игнорирует отсутствие файла и ошибки удаления.

## Команды

```bash
nx test upload-validation
nx lint upload-validation
nx typecheck:tsgo upload-validation
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/upload-validation` в `nx.implicitDependencies` в
`package.json` приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx;
сам импорт `@letar/upload-validation` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не
поможет — [libs.md](/.claude/rules/libs.md#подключение-к-приложению).

## Потребители

`driving-school`, `grandslamcup` — обе держали байт-в-байт одинаковую реализацию
(`src/lib/upload/{validate-file,save-file}.ts`) до выноса сюда. `aprel8008` — единственный
загружает несколько файлов одним запросом (`formData.getAll('files')`), отсюда
`extractAndValidateFiles`.
