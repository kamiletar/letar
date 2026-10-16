import { redirect } from 'next/navigation'

/** Старые ссылки регистрации продолжают единый вход вместе с исходными OIDC-параметрами. */
export default async function SignUpPage(
  { searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> },
) {
  const params = await searchParams
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) { value.forEach((item) => query.append(key, item)) }
    else if (value !== undefined) { query.set(key, value) }
  }
  redirect(`/sign-in${query.size ? `?${query}` : ''}`)
}
