/**
 * Резолв колонок таблицы из schema — тонкий реэкспорт framework-free `@letar/forms-core/table`,
 * общей логики с `@letar/forms`/`@letar/forms-shadcn`/`@letar/forms-angular`. Все шесть имён —
 * часть публичного API `@letar/forms-vue` (реэкспортированы из `src/core.ts`), поэтому сохранены
 * поимённо, а не свёрнуты в один `export *`.
 */
export {
  camelToTitle,
  fieldInfoToColumn,
  getArrayElementFields,
  mapZodType,
  mergeColumns,
  resolveTableColumns,
} from '@letar/forms-core/table'
