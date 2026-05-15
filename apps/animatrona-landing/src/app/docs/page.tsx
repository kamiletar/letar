import { redirect } from 'next/navigation'

/**
 * Редирект /docs → /docs/quick-start
 */
export default function DocsPage() {
  redirect('/docs/quick-start')
}
