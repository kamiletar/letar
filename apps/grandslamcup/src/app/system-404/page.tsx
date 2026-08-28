import { notFound } from 'next/navigation'

/**
 * Технический маршрут — сюда `proxy.ts` делает rewrite для любого запроса с неизвестным
 * `citySlug`. В отличие от `(public)/[citySlug]/layout.tsx`, этот путь не лежит под
 * `(public)/loading.tsx` (Suspense-граница), поэтому `notFound()` здесь отдаёт настоящий 404,
 * а не 200 со стримингом. См. .claude/docs/nextjs-streaming-soft-404-loading-boundary.md
 */
export default function SystemNotFoundPage() {
  notFound()
}
