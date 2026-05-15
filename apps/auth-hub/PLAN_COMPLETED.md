# Выполненные задачи

Детальное описание всех реализованных фич auth-hub.

## Версия 0.2.1 — 2026-04-10

### Fix: продолжение OIDC flow после OAuth на /sign-in

**Проблема:** Пользователь, попадая из клиентского приложения на `auth.letar.best/sign-in?client_id=...&redirect_uri=...&response_type=code&state=...` (OIDC authorization_code flow), после успешного логина через Google/Яндекс/VK/GitHub оказывался на главной ключницы вместо возврата в клиентское приложение. Better Auth OIDC Provider сохранял query в cookie `oidc_login_prompt` и редиректил на `loginPage` со всеми параметрами, но на странице `/sign-in` ни OAuth кнопки, ни email-форма не использовали этот query для восстановления OIDC flow — передавали дефолтный `callbackURL = '/'` в Better Auth.

**Решение:**

- Создан хук `src/app/(auth)/_hooks/use-post-sign-in-callback.ts`, который проверяет наличие OIDC параметров (`client_id` + `redirect_uri` + `response_type`) в query и возвращает `/api/auth/oauth2/authorize?<исходная query>`, если это OIDC flow. После успеха Better Auth редиректит на этот внутренний URL, authorize endpoint находит свежую сессию и продолжает выдачу кода клиентскому приложению.
- `AuthOAuthButtons`, `LoginForm`, `MagicLinkForm` на `/sign-in` используют этот хук и передают результат как `callbackURL` в `signIn.social` / `signIn.oauth2` / `auth.api.signInEmail` / `auth.api.signInMagicLink`.
- `libs/auth/src/client/oauth-buttons.tsx` уже поддерживал проп `callbackUrl` — правок не потребовалось.

## Версия 0.1.0

### Реализовано

- Базовая структура приложения (Next.js 16 + Chakra UI v3)
- Роуты авторизации (login, signup)
- OAuth интеграция
- Панель администратора (каркас)
- Профиль пользователя (каркас)

---

**Последнее обновление:** 2026-04-10
