# План тестирования — Form Develop App

## Статистика

| Тип  | Количество | Статус |
| ---- | ---------- | ------ |
| Unit | 34         | Готово |
| E2E  | 21 файл    | Готово |

## Запуск тестов

```bash
nx test form-develop-app                            # Unit тесты
nx e2e form-develop-app-e2e                          # Все E2E
nx e2e form-develop-app-e2e -- --project=chromium    # Только Chrome
nx e2e form-develop-app-e2e -- --grep="Schedule"     # По названию
```

## E2E тесты (21 файл)

| Файл                            | Описание                                                           |
| ------------------------------- | ------------------------------------------------------------------ |
| `example.spec.ts`               | Навигация, заголовки страниц                                       |
| `form-submit.spec.ts`           | CRUD операции с рецептами                                          |
| `fields-demo.spec.ts`           | Все типы полей (String, Number, Date, Select, Combobox, Schedule…) |
| `persistence-demo.spec.ts`      | localStorage сохранение черновиков                                 |
| `pin-input-demo.spec.ts`        | PinInput компонент                                                 |
| `slider-demo.spec.ts`           | Slider компонент                                                   |
| `rating-demo.spec.ts`           | Rating компонент                                                   |
| `file-upload-demo.spec.ts`      | FileUpload (button, dropzone, input)                               |
| `rich-text-demo.spec.ts`        | RichText (Tiptap) редактор                                         |
| `when-demo.spec.ts`             | Form.When условный рендеринг                                       |
| `steps-demo.spec.ts`            | Form.Steps мультистеп формы                                        |
| `date-range-demo.spec.ts`       | DateRange с пресетами                                              |
| `tags-demo.spec.ts`             | Tags ввод тегов                                                    |
| `autocomplete-demo.spec.ts`     | Autocomplete с подсказками                                         |
| `numeric-demo.spec.ts`          | NumberInput, Currency, Percentage                                  |
| `masked-demo.spec.ts`           | Phone, MaskedInput с масками                                       |
| `advanced-demo.spec.ts`         | Address, Duration, DateTimePicker                                  |
| `auth-demo.spec.ts`             | PasswordStrength, OTPInput                                         |
| `offline-demo.spec.ts`          | Оффлайн формы: OfflineIndicator, SyncStatus                        |
| `controlled-state-demo.spec.ts` | Controlled state, form.Subscribe, live preview                     |
| `constraints-demo.spec.ts`      | Автоматические Zod constraints (14 тестов × 3 браузера)            |

## Unit тесты библиотеки

| Файл                        | Тестов | Описание                              |
| --------------------------- | ------ | ------------------------------------- |
| `form-from-schema.spec.tsx` | 15     | FormFromSchema рендеринг и поведение  |
| `form-with-api.spec.tsx`    | 12     | FormWithApi loading/edit/create modes |
| `with-ui-meta.spec.ts`      | 31     | withUIMeta(), хелперы, вложенность    |

---

**Последнее обновление:** 2026-03-31
