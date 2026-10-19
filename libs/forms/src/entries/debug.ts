/**
 * `@letar/forms/debug` — интерактивное дерево значений формы (`@uiw/react-json-view`). В ядро не входит:
 * `Form.DebugValues` и проп `debug` рисуют простой `<pre>`.
 *
 * @example
 * ```tsx
 * import { FormDebugJsonView } from '@letar/forms/debug'
 *
 * <AppForm initialValue={data} onSubmit={save}>
 *   <AppForm.Field.String name="title" />
 *   <FormDebugJsonView />
 * </AppForm>
 * ```
 */
export { FormDebugJsonView, type FormDebugJsonViewProps } from '../lib/declarative/form-debug-json-view'
