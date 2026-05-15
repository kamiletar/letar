# ImotForm

Расширенный Form компонент для IMOT на базе `@letar/forms`.

## Возможности

- **7 Select компонентов** для всех ENUM'ов приложения
- **3 Combobox компонента** для асинхронного поиска моделей
- **Единый namespace API** для всех полей формы

## Использование

```tsx
import { ImotForm } from '@/imot-form'
;<ImotForm initialValue={data} schema={Schema} onSubmit={handleSubmit}>
  {/* Обычные поля */}
  <ImotForm.Field.String name="name" label="Имя" />
  <ImotForm.Field.Textarea name="notes" label="Заметки" />

  {/* Select для ENUM'ов */}
  <ImotForm.Select.Gender name="gender" label="Пол" />
  <ImotForm.Select.ColorType name="colorType" label="Цветотип" />
  <ImotForm.Select.Archetype name="archetype" label="Архетип" />
  <ImotForm.Select.TransformationStage name="stage" label="Этап" />
  <ImotForm.Select.SessionStatus name="status" label="Статус сессии" />
  <ImotForm.Select.ChakraType name="chakra" label="Чакра" />
  <ImotForm.Select.UserRole name="role" label="Роль" />

  {/* Combobox для поиска моделей */}
  <ImotForm.Combobox.Client name="clientId" label="Клиент" />
  <ImotForm.Combobox.Session name="sessionId" label="Сессия" />
  <ImotForm.Combobox.Plan name="planId" label="План трансформации" />

  {/* Кнопки */}
  <ImotForm.Button.Submit>Сохранить</ImotForm.Button.Submit>
</ImotForm>
```

## Select компоненты

| Компонент                             | ENUM                | Значения                                             |
| ------------------------------------- | ------------------- | ---------------------------------------------------- |
| `ImotForm.Select.Gender`              | Gender              | MALE, FEMALE, OTHER                                  |
| `ImotForm.Select.UserRole`            | UserRole            | CLIENT, SPECIALIST, ADMIN                            |
| `ImotForm.Select.SessionStatus`       | SessionStatus       | SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED         |
| `ImotForm.Select.TransformationStage` | TransformationStage | DIAGNOSTICS, INTEGRATION, STRATEGY, PRACTICE, RESULT |
| `ImotForm.Select.ColorType`           | ColorType           | SPRING, SUMMER, AUTUMN, WINTER                       |
| `ImotForm.Select.Archetype`           | Archetype           | 12 архетипов личности                                |
| `ImotForm.Select.ChakraType`          | ChakraType          | 7 чакр энергетической системы                        |

## Combobox компоненты

| Компонент                   | Модель             | Фильтр         |
| --------------------------- | ------------------ | -------------- |
| `ImotForm.Combobox.Client`  | Client             | `specialistId` |
| `ImotForm.Combobox.Session` | Session            | `clientId`     |
| `ImotForm.Combobox.Plan`    | TransformationPlan | `clientId`     |

## Labels

Все русские метки экспортируются из модуля:

```tsx
import {
  archetypeLabels,
  chakraTypeLabels,
  colorTypeLabels,
  genderLabels,
  sessionStatusLabels,
  transformationStageLabels,
  userRoleLabels,
} from '@/imot-form'

// Использование
const label = genderLabels['MALE'] // 'Мужской'
```

## Структура

```
imot-form/
├── index.ts                    # Экспорты
├── imot-form.tsx               # createForm() с расширениями
├── labels.ts                   # Русские метки для ENUM'ов
├── selects/                    # Select компоненты
│   ├── index.ts
│   ├── select-gender.tsx
│   ├── select-user-role.tsx
│   ├── select-session-status.tsx
│   ├── select-transformation-stage.tsx
│   ├── select-color-type.tsx
│   ├── select-archetype.tsx
│   └── select-chakra-type.tsx
├── comboboxes/                 # Combobox компоненты
│   ├── index.ts
│   ├── combobox-client.tsx
│   ├── combobox-session.tsx
│   └── combobox-plan.tsx
└── README.md
```
