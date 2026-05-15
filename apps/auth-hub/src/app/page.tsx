import { redirect } from 'next/navigation'

/**
 * Главная страница — редирект на профиль
 */
export default function HomePage() {
  redirect('/profile')
}
