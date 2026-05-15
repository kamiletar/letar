import type { Metadata } from 'next'
import { RecentlyViewedList } from './_components/recently-viewed-list'

export const metadata: Metadata = {
  title: 'Недавно просмотренные — Премиум РосСтиль',
}

export default function RecentlyViewedPage() {
  return <RecentlyViewedList />
}
