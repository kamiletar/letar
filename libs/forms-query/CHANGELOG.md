# Changelog

## 0.1.0

Первый выпуск. Адаптеры TanStack Query для `Field.Select` и `Field.Combobox` из `@letar/forms` и
`@letar/forms-shadcn`:

- `fromSearchQuery` — готовый `useQuery` для Combobox (`enabled` по `minChars`, `placeholderData: keepPreviousData`);
- `fromSelectedQuery` — готовый `useSelected` (`enabled` по непустому значению);
- `useQueryOptions` — результат запроса → `options` и `loading` для Select/Combobox со статичными опциями;
- `useLoaderQuery` — промис-загрузчик (`loadOptions`) с кэшем и ключом запроса;
- `useInvalidateAfter` — обёртка `onCreate`/`onUpdate`: инвалидация и рефетч до возврата опции полю;
- `@letar/forms-query/zenstack` — `useInvalidateModels` для мутаций мимо хуков ZenStack.
