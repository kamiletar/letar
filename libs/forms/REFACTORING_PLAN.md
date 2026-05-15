# План рефакторинга @letar/forms

## Статус: Рефакторинг завершён ✅

**Цель:** Устранить дублирование кода, разделить крупные файлы, улучшить maintainability.

**Режим:** Breaking changes допустимы для улучшения архитектуры.

**Текущая версия:** 0.37.0

---

## ✅ Выполненные фазы

### Фаза 1: createField factory (ВЫПОЛНЕНО)

Создана factory функция для генерации Field компонентов:

- `src/lib/declarative/form-fields/base/create-field.tsx`
- `src/lib/declarative/form-fields/base/field-wrapper.tsx`
- `src/lib/declarative/form-fields/base/index.ts`

Рефакторены 8 Field компонентов:

- FieldString (94 → 47 строк)
- FieldTextarea (87 → 35 строк)
- FieldNumber (88 → 40 строк)
- FieldDate (72 → 40 строк)
- FieldTime (64 → 32 строк)
- FieldCheckbox (95 → 49 строк)
- FieldSwitch (97 → 51 строк)
- FieldNativeSelect (94 → 50 строк)

**Результат:** -286 строк кода

### Фаза 2: Разделение types.ts (ВЫПОЛНЕНО)

Разделено 702 строки на модули:

```
src/lib/declarative/types/
├── index.ts           # Реэкспорт (7 строк)
├── meta-types.ts      # FieldTooltipMeta, UIMeta (45 строк)
├── field-types.ts     # BaseFieldProps, *FieldProps (364 строк)
├── form-types.ts      # FormProps, FormApiConfig (175 строк)
├── group-types.ts     # GroupProps, GroupListProps (60 строк)
└── button-types.ts    # SubmitButtonProps (22 строк)
```

### Фаза 3: Декомпозиция form-root.tsx (ВЫПОЛНЕНО)

Разделено 624 строки на модули:

```
src/lib/declarative/form-root/
├── index.tsx              # FormRoot, экспорты (117 строк)
├── form-simple.tsx        # FormSimple (130 строк)
├── form-with-api.tsx      # FormWithApi (169 строк)
├── form-validators.ts     # buildValidators (57 строк)
├── form-compound-types.ts # Типы compound (161 строк)
├── form-loading-state.tsx # Загрузка (16 строк)
└── use-form-features.ts   # Общий хук (175 строк)
```

**Результат:** Устранено дублирование логики persistence/offline

### Фаза 4: Context utilities (ВЫПОЛНЕНО)

Создана утилита для типобезопасных контекстов:

```
src/lib/contexts/
├── create-safe-context.tsx  # createSafeContext, createNamedGroupContext
└── index.ts                 # Экспорты
```

### Фаза 5: Категоризация Field компонентов (ВЫПОЛНЕНО)

Все 37 Field компонентов распределены по категориям:

```
src/lib/declarative/form-fields/
├── base/           # Базовые утилиты (create-field, field-wrapper, field-label, field-tooltip)
├── text/           # 7 компонентов (string, textarea, password, password-strength, editable, rich-text, masked-input)
├── number/         # 6 компонентов (number, number-input, slider, rating, currency, percentage)
├── selection/      # 10 компонентов (select, native-select, combobox, autocomplete, listbox, radio-group, radio-card, segmented-group, checkbox-card, tags)
├── boolean/        # 2 компонента (checkbox, switch)
├── datetime/       # 6 компонентов (date, time, date-range, datetime-picker, duration, schedule)
└── specialized/    # 6 компонентов (pin-input, otp-input, color-picker, file-upload, phone, address)
```

### Фаза 6: Рефакторинг остальных Field компонентов (ВЫПОЛНЕНО)

Расширена `createField` factory с поддержкой `useFieldState` для локального состояния:

```typescript
interface CreateFieldOptions<P, TValue, TState> {
  displayName: string
  useFieldState?: (props: P, resolved: ResolvedFieldProps) => TState
  render: (props: FieldRenderProps<TValue> & { fieldState: TState }) => ReactElement
}
```

**Новые утилиты:**

- `useDebounce` - общий хук для debounce (base/use-debounce.ts)

**Рефакторено 20 компонентов через createField:**

| Батч | Компоненты                                                                      | Подход                              |
| ---- | ------------------------------------------------------------------------------- | ----------------------------------- |
| 1    | FieldPassword, FieldMaskedInput                                                 | createField + useFieldState         |
| 2    | FieldNumberInput, FieldCurrency, FieldPercentage                                | createField                         |
| 3    | FieldPinInput, FieldOTPInput                                                    | createField + useFieldState         |
| 4    | FieldRadioGroup, FieldSegmentedGroup, FieldRating                               | createField                         |
| 5    | FieldDateTimePicker, FieldDuration, FieldDateRange                              | createField + useFieldState         |
| 6    | FieldTags, FieldRadioCard, FieldCheckboxCard                                    | createField + useFieldState         |
| 7    | FieldPhone, FieldEditable, FieldPasswordStrength, FieldColorPicker, FieldSlider | createField + useFieldState         |
| 8    | FieldAddress, FieldFileUpload                                                   | createField + useFieldState (async) |

**Упрощено 4 компонента с дженериками (оставлены как functions):**

| Компонент                | Примечание                         |
| ------------------------ | ---------------------------------- |
| FieldSelect<T>           | Использует общий FieldError        |
| FieldListbox<T>          | Использует общий FieldError        |
| FieldAutocomplete<TData> | Использует useDebounce, FieldError |
| FieldCombobox<T, TData>  | Использует useDebounce, FieldError |

**Минимально изменены 2 очень сложных компонента:**

| Компонент     | Строк | Изменения                                  |
| ------------- | ----- | ------------------------------------------ |
| FieldSchedule | 469   | Использует FieldError, русские комментарии |
| FieldRichText | 494   | Использует FieldError, русские комментарии |

**Результат:** ~1,500 строк кода удалено, все комментарии на русском

---

## ✅ Дополнительные выполненные фазы

### Фаза 7: Русификация комментариев (ВЫПОЛНЕНО)

Переведены все JSDoc комментарии на русский:

- `types/field-types.ts` — 364 строки, все комментарии переведены
- `types/form-types.ts` — 269 строк, все комментарии переведены

**Результат:** Единообразие документации на русском языке

### Фаза 8: Cleanup (ВЫПОЛНЕНО)

- [x] Обновить README.md библиотеки
- [x] Финальный bump версии (0.37.0)

### Фаза 9: Исправление тестов (ВЫПОЛНЕНО)

Исправлены интеграционные тесты:

**Проблемы:**

- IndexedDB не доступен в jsdom окружении
- async `setIsLoading` вызывал act() warning
- Неправильный API в тестах FormGroupList (render prop вместо template)

**Решения:**

- Установлен `fake-indexeddb` для мока IndexedDB в тестах
- Добавлен `import 'fake-indexeddb/auto'` в `jest.setup.ts`
- Все интеграционные тесты переписаны с `waitFor` для async операций
- Тесты `form-group-list-integration.spec.tsx` исправлены на правильный API

**Результат:** 57 тестов, 11 test suites — все проходят

### Фаза 10: Миграция Jest → Vitest (ВЫПОЛНЕНО)

Выполнена миграция тестового фреймворка:

**Установлены зависимости:**

- `vitest` 4.0.16
- `@vitejs/plugin-react` 5.1.2
- `@vitest/coverage-v8` 4.0.16

**Созданы файлы:**

- `vitest.config.ts` — конфигурация Vitest
- `vitest.setup.ts` — setup с jest-dom и fake-indexeddb
- `tsconfig.spec.json` — TypeScript конфиг для тестов

**Миграция тестов:**

- Все `jest.fn()` → `vi.fn()`
- Все `jest.spyOn()` → `vi.spyOn()`
- Добавлен `import { vi } from 'vitest'` в 8 файлов

**Обновлён project.json:**

- Executor: `@nx/jest:jest` → `@nx/vitest:test`

**Удалены Jest файлы:**

- `jest.config.ts`
- `jest.setup.ts`

**Преимущества Vitest:**

- Скорость: на ESBuild, значительно быстрее Jest
- Нативная ESM и TypeScript поддержка
- HMR для тестов (мгновенный watch mode)
- Jest-совместимый API

**Результат:** 57 тестов, 11 test suites — все проходят

### Фаза 11: Микрооптимизации (ВЫПОЛНЕНО)

**Анализ:**

- Проведён анализ потенциала для оптимизации
- Большие файлы: FieldRichText (492), FormSteps (469), FieldSchedule (467)
- Дублирование: Field wrapper pattern в 31 файле

**Выполнено:**

1. **Вынесен TOOLBAR_CONFIG из FieldRichText:**
   - Создан `text/toolbar-config.tsx` (166 строк)
   - FieldRichText: 492 → 337 строк (-155 строк, -31.5%)

2. **Создана утилита getFieldErrors:**
   - Добавлена в `base/field-utils.ts`
   - Упрощает извлечение ошибок в ручных Field компонентах
   - Применено в: FieldRichText, FieldSchedule, FieldCascadingSelect

**Отложено (низкий ROI):**

- Унификация FieldWrapper (15 из 27 компонентов уже используют)
- useDropdownState хук (только 2 компонента могут использовать)
- Рефакторинг FormSteps (уже хорошо структурирован — 6 модулей)

**Результат:** FieldRichText -155 строк, улучшена утилизация кода

---

## Метрики

| Метрика            | До рефакторинга | После Фазы 6 | Цель       |
| ------------------ | --------------- | ------------ | ---------- |
| Версия             | 0.32.0          | 0.37.0       | —          |
| Строк кода         | 14,396          | ~12,500      | ~10,000    |
| Дублирование       | ~3,000 строк    | ~1,200 строк | ~500 строк |
| Макс. размер файла | 701 строк       | 494 строк    | ~200 строк |
| Модульность        | Низкая          | Высокая      | Высокая    |

---

## Коммиты

1. `refactor(form-components): добавить createField factory и рефакторить 8 Field компонентов`
2. `refactor(form-components): разделить types.ts на модули`
3. `refactor(form-components): декомпозиция form-root.tsx на модули`
4. `feat(form-components): добавить утилиту createSafeContext для контекстов`
5. `refactor(form-components): категоризация Field компонентов по папкам`
6. `refactor(form-components): рефакторинг всех Field компонентов через createField factory`
7. `test(form-components): исправить интеграционные тесты (IndexedDB mock, waitFor, API)`
8. `refactor(form-components): миграция Jest → Vitest`

---

**Дата создания:** 2025-12-22
**Последнее обновление:** 2025-12-23 (Фаза 7 завершена)
