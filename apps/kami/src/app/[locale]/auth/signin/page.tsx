import { redirect } from 'next/navigation'

/**
 * Устаревший роут — перенаправляем на новый sign-in
 */
export default function LegacySignInPage() {
  redirect('/sign-in')
}
