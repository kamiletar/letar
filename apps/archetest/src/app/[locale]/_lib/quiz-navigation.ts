/** Авторизация общая для локалей; якорь указывает экран возврата внутри полного теста. */
export function getQuizSignInHref(locale: string, screen: 'guidance' | 'results'): string {
  const callbackURL = `${locale === 'ru' ? '/' : '/en'}#quiz-${screen}`
  return `/sign-in?callbackURL=${encodeURIComponent(callbackURL)}`
}
