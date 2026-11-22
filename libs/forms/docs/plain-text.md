# PlainText

`@letar/forms/plain-text` — optional поле для заметок, стихов и длинных текстов.
Данные — строка; форматирование и HTML в схеме редактора отсутствуют. Для пакета
нужны `@tiptap/react` и `@tiptap/pm` версии 3. Корневой импорт форм их не загружает.

```tsx
import { createForm } from '@letar/forms'
import { FieldPlainText, type PlainTextEditorHandle } from '@letar/forms/plain-text'
import { useRef } from 'react'

const AppForm = createForm({ extraFields: { PlainText: FieldPlainText } })
// В компоненте:
const editor = useRef<PlainTextEditorHandle>(null)
// Внутри AppForm:
<AppForm.Field.PlainText name="text" label="Текст" editorRef={editor}
  borderless minHeight="calc(100dvh - 180px)" />
```

Enter вставляет перевод строки, второй Enter — пустую строку. Пробелы, табуляция,
пустые строки в начале/конце и emoji сохраняются; CRLF нормализуется в LF.
Вставка использует только clipboard `text/plain`. HTML, картинки и форматирование
не становятся данными. Промежуточный IME/composition не публикуется в форму.

`PlainTextEditor` — тот же редактор с `value/onChange`, если управление формой не нужно.
`FieldPlainText` подключает валидацию, ошибки, blur и persistence стандартной формы.
Длина проверяется схемой формы; поле не обрезает черновик молча.

## Управление

- `editorRef`: `getText()`, `getSelection()`, `setSelection(from,to?)`, `focus()`.
- Выделение использует UTF-16 offsets строки (как обычный input), возвращает
  `{from,to,textBefore,textSelected,textAfter}`. Смещения не являются ProseMirror positions.
- `insertText(text)` заменяет выделение; вставка атомарна для undo и не добавляет пробелы.
  Для кнопки тире вызовите `insertText('—')`, затем `focus()`. `pointerdown.preventDefault()`
  у toolbar помогает не терять клавиатуру и выделение на телефоне.
- `undo()/redo()` и `canUndo()/canRedo()` управляют встроенной историей; Ctrl/Cmd+Z,
  Ctrl/Cmd+Shift+Z, Ctrl+Y и native `historyUndo/historyRedo` идут через тот же путь.
- `replaceText(text)` применяет внешнюю версию как один отменяемый шаг. Равный текст
  ничего не меняет: сохранение и повторный render сохраняют историю и курсор.
- `replaceText(text,{baseline:true})` или смена пропа `baselineKey` устанавливают новый
  исходный черновик и очищают историю. Используйте при загрузке другого документа/
  восстановлении локальной копии; обычное сохранение не должно менять этот ключ.
- `breakHistory()` отделяет следующий набор от предыдущей группы; встроенные вставки
  закрывают группу до и после. PM хранит изменения/шаги, а не полные снимки на каждый символ.
- `captureSession()` возвращает непрозрачный токен в памяти текущей страницы;
  `restoreSession(token)` переносит историю и выделение в новый экземпляр при смене
  маршрута. Не сериализуйте токен, не сохраняйте его в localStorage и отделяйте по
  пользователю/документу. Неизвестный объект отвергается. После reload старый токен недействителен.

`onHistoryChange({canUndo,canRedo,undoDepth,redoDepth})` предназначен для кнопок.
`historyDepth` по умолчанию 50 (допускается 1–100); PM временно допускает до 20
дополнительных событий перед сокращением старого стека. Новый текст не теряется.

`onTransaction` получает before/after, selectionBefore/After, origin
(`input/insert/external/undo/redo/baseline`), undoDepthBefore/After и redoDepthAfter.
Это протокол для согласования хронологии с другими полями приложения, например
названием. `onKeyboardHistory(direction)` позволяет приложению обработать общее
undo/redo; без него действует история текста. Не вызывайте и общий undo, и текстовый
undo повторно на одно событие.

При `readOnly` или `disabled` ввод и клавиатурная отмена отключены; внешний
`onKeyboardHistory` также не вызывается, чтобы не менять общую историю приложения.

Поле само не сохраняет данные на сервер и не меняет доступ. Вкладки следует скрывать
без unmount редактора, чтобы не сбрасывать историю, выделение и прокрутку.
