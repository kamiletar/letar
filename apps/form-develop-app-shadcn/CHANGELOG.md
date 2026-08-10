# Changelog

## Unreleased (2026-08-10, продолжение)

- Демо-поле `FieldSignature` (`@letar/forms-shadcn` 0.14.0) — canvas-рисование/typed mode,
  `width={320} height={120}`.

## Unreleased (2026-08-10)

- `defaultValues.address`/`defaultValues.cityDadata` заполнены непустыми значениями (было `''`)
  — этот путь раньше не проверялся живьём и маскировал React-warning «Cannot update a component
  while rendering a different component» в `FieldAddress`/`FieldCity` (пофикшен в
  `@letar/forms-shadcn` 0.13.2). Оставлено заполненным как регрессионная демонстрация.

## 0.1.0 (2026)

- Сгенерирован каркас приложения (`nx g @letar/generators:new-app form-develop-app-shadcn`)
