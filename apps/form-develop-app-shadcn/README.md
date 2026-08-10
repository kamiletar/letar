# Form Develop App (shadcn)

Песочница для визуальной проверки `@letar/forms-shadcn` — тот же принцип, что у
`apps/form-develop-app` для Chakra-скина, но на отдельном приложении: Tailwind 4 и Chakra не
уживаются в одном глобальном стиле без конфликтов (решение задокументировано в
`libs/forms/PLAN.md`, Фаза 7.3, Шаг 5).

## Версия и стек

| Параметр    | Значение                    |
| ----------- | --------------------------- |
| **Версия**  | 0.1.0                       |
| **Порт**    | 3026                        |
| **Next.js** | 16                          |
| **React**   | 19                          |
| **UI**      | Tailwind 4 + Radix (shadcn) |
| **Формы**   | @letar/forms-shadcn         |

## Быстрый старт

```bash
nx dev form-develop-app-shadcn              # Разработка
nx format form-develop-app-shadcn           # Форматирование
nx lint form-develop-app-shadcn             # oxlint → ESLint
nx typecheck:tsgo form-develop-app-shadcn   # Проверка типов
nx test form-develop-app-shadcn             # Тесты
```

## Что внутри

`src/app/page.tsx` — одна страница со всеми 17 полями `@letar/forms-shadcn`
(String/Textarea/Number/Password/Checkbox/Switch/Select/NativeSelect/Combobox/RadioGroup/
SegmentGroup/Date/Slider/Rating/Tags/PinInput/Hidden), собранными через `DemoForm`
(`src/app/_components/demo-form.tsx`) — минимальный form-root на `useForm` из
`@tanstack/react-form` + `DeclarativeFormContext`. `@letar/forms-shadcn` пока не несёт свой
`Form`/`createForm()` (это Field-компоненты, композиционная точка входа — отдельная задача),
поэтому `DemoForm` — временный локальный аналог `TestForm` из `@letar/forms-react/testing`, но
с реальным `onSubmit` вместо только рендера для тестов.

`src/app/globals.css` — shadcn CSS-переменные (`@theme inline` + `oklch`-палитра light/dark) под
Tailwind 4 — минимальный набор, который использует `shadcnUIKit` (`bg-primary`, `border-input`,
`text-destructive` и т.д.).

## Что дальше

Каркас минимален — нет БД, аутентификации. Смотри `PLAN.md` для текущих задач.
