import { redirect } from 'next/navigation'

/**
 * Редирект со старой страницы /auth/login на новую /sign-in
 */
export default function LegacyLoginPage() {
  redirect('/sign-in')
}
