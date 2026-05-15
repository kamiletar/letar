# План разработки auth-hub

## Текущий статус: v0.3.0 — Account chooser для OIDC SSO

### Выполнено (v0.3.0)

- [x] Account chooser (как у Google) для всех trusted OIDC clients
  - `skipConsent: false` для archetest/time/grandslamcup/kami/animatrona-tracker/dashboard
  - `/oauth/consent` переделана: server component + `AccountChooser` client component
  - 3 действия: «Продолжить как X», «Войти под другим аккаунтом», «Отмена»
  - Смена аккаунта: `signOut` + redirect на `/sign-in?<OIDC params>` → `usePostSignInCallback` продолжает OIDC flow

## Предыдущие версии

### Выполнено (v0.1.0)

- [x] Настройка Better Auth с OAuth провайдерами (Google, GitHub, VK, Яндекс)
- [x] Вход по email/password с авто-регистрацией
- [x] Magic Link вход
- [x] OIDC Provider для клиентских приложений (archetest, time, grandslamcup)
- [x] SMTP отправка писем (верификация, magic link)
- [x] Главная страница с профилем пользователя и кнопкой выхода

### Выполнено (v0.1.1)

- [x] Привязка дополнительных способов входа к аккаунту (OAuth linking)

### Выполнено (v0.2.0)

- [x] Страница настроек профиля `/profile/settings` — редактирование имени
- [x] Управление ролями в админ-панели (ADMIN/USER toggle)
- [x] Объединённая страница профиля `/profile` — карточка + навигация + выход
- [x] Навигация «← Профиль» на всех подстраницах
- [x] Исправлена установка пароля для OAuth-пользователей (auth.api.setPassword)
- [x] Зарегистрированы kami и animatrona-tracker как OIDC trusted clients
- [x] Миграция kami — OIDC + кнопка «Войти через Ключницу» + accountLinking
- [x] Миграция animatrona-tracker — OIDC + кнопка «Войти через Ключницу» + accountLinking
- [x] Кнопка «Аккаунт в Ключнице» в user-меню: archetest, time, grandslamcup, kami, animatrona-tracker

- [x] Миграция dashboard — OIDC + только кнопка Ключницы + роли USER/VIEWER/ADMIN
- [x] SSO между приложениями — вариант B (silent re-auth) через trusted OIDC clients

### Не планируется (собственная авторизация)

- driving-school, imot, premium-rosstil — standalone Better Auth, миграция на OIDC не нужна
