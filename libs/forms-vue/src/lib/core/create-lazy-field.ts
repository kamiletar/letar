import { type Component, defineAsyncComponent, h } from 'vue'

/**
 * Ленивая загрузка тяжёлого поля — Vue-аналог React `createLazyComponent`/паттерна
 * `Form.Captcha`. `defineAsyncComponent` — идиоматичный Vue-примитив для code-splitting со
 * встроенным fallback, не требующий от потребителя оборачивать поле в `<Suspense>` вручную
 * (в отличие от React `lazy()`).
 *
 * @example
 * ```ts
 * export const FieldRichText = createLazyField(
 *   () => import('./field-rich-text-impl').then((m) => m.FieldRichText),
 * )
 * ```
 */
export function createLazyField<T extends Component>(loader: () => Promise<T>, fallbackMinHeight = '150px'): T {
  return defineAsyncComponent({
    loader,
    loadingComponent: {
      name: 'LazyFieldFallback',
      render: () =>
        h('div', {
          class: 'letar-field__lazy-skeleton',
          style: `min-height:${fallbackMinHeight};border-radius:0.375rem;background:var(--letar-skeleton-bg,#e2e8f0)`,
          'aria-hidden': 'true',
        }),
    },
  }) as unknown as T
}
