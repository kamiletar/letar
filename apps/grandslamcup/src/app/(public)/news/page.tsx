/**
 * Глобальная новостная лента — публичная страница
 */

import { NewsContent } from '@/app/_components/news-content'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Новости',
  description: 'Обзоры матчей, новости и события Кубка Большого Слэма',
  alternates: { canonical: '/news' },
}

export default function NewsPage() {
  return <NewsContent />
}
