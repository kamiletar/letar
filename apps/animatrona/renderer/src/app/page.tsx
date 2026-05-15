import { redirect } from 'next/navigation'

/**
 * Главная страница — редирект на библиотеку
 */
export default function HomePage() {
  redirect('/library')
}
