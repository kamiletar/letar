'use client'

import type { ReactNode } from 'react'

/**
 * Пропсы для DemoPageLayout
 */
export interface DemoPageLayoutProps {
  /** Заголовок демо-страницы */
  title: string
  /** Описание / пояснение к демо */
  description?: string
  /** Максимальная ширина контейнера (по умолчанию 640px, Tailwind max-w-2xl) */
  maxWClassName?: string
  /** Содержимое страницы (обычно DemoForm) */
  children: ReactNode
}

/**
 * DemoPageLayout — общий layout для демо-страниц form-develop-app-shadcn.
 *
 * Аналог `DemoPageLayout` из `apps/form-develop-app/src/app/_components` (Chakra-версия), но на
 * Tailwind — Chakra и Tailwind 4 не уживаются в одном глобальном стиле этого приложения
 * (см. `apps/form-develop-app-shadcn/PLAN.md`).
 */
export function DemoPageLayout({ title, description, maxWClassName = 'max-w-2xl', children }: DemoPageLayoutProps) {
  return (
    <main className={`mx-auto ${maxWClassName} px-6 py-16`}>
      <a href="/" className="text-muted-foreground text-sm hover:underline">
        ← Все демо
      </a>
      <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
      {description && <p className="text-muted-foreground mt-2 text-sm">{description}</p>}
      <div className="mt-8">{children}</div>
    </main>
  )
}

/**
 * Пропсы для SubmittedDataPreview
 */
export interface SubmittedDataPreviewProps<T = unknown> {
  /** Данные для отображения (null = не показывать) */
  data: T | null
  /** Заголовок блока (по умолчанию "Submitted Data:") */
  title?: string
  /** data-testid для E2E тестов */
  testId?: string
}

/**
 * SubmittedDataPreview — блок отображения отправленных данных формы после успешного submit.
 * Рендерится только если data !== null. Аналог Chakra-версии из `form-develop-app`.
 */
export function SubmittedDataPreview<T = unknown>({
  data,
  title = 'Submitted Data:',
  testId = 'submitted-data',
}: SubmittedDataPreviewProps<T>) {
  if (data === null) {
    return null
  }

  return (
    <div
      className="mt-6 rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20"
      data-testid={testId}
    >
      <h2 className="text-sm font-semibold">{title}</h2>
      <pre className="mt-2 overflow-x-auto text-xs whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
