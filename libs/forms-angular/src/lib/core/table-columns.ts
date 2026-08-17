/**
 * Резолв колонок таблицы из schema — тонкий реэкспорт framework-free `@letar/forms-core/table`,
 * общей логики с `@letar/forms`/`@letar/forms-shadcn`/`@letar/forms-vue`. Headless Angular-слой
 * не нуждается в React-обёртке (`useMemo`) — вызывается напрямую внутри `computed()`/эффекта.
 */
export { resolveTableColumns } from '@letar/forms-core/table'
