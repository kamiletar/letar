/**
 * Хеширование client secret для @better-auth/oauth-provider (1.7+). При включённом jwt()-плагине
 * (обязателен для oauthProvider, см. create-auth/index.ts) дефолтный storeClientSecret — "hashed":
 * плагин хранит SHA-256(secret) в base64url без padding (defaultHasher в исходниках плагина), НЕ
 * plaintext. Прямая Prisma-запись (seed, admin actions) — в обход собственного API плагина, поэтому
 * секрет нужно хешировать вручную тем же алгоритмом. Без этого сравнение на обмене code→token падает
 * с "invalid client_secret" (найдено 2026-08-26, второй слой того же прод-инцидента после
 * redirectUris/tokenEndpointAuthMethod).
 */
export async function hashOauthClientSecret(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return Buffer.from(digest).toString('base64url')
}
