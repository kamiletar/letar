/**
 * Провижининг канареечных аккаунтов для `login-canary.ts` (PLAN.md §71, часть 3.3).
 *
 * Одноразовая (per-app) операция — вызывается вручную через `POST /api/admin/login-canary-setup`
 * после того, как учётные данные добавлены в реестр `apps/dashboard/.env.docker.enc`
 * (`LOGIN_CANARY_<APP>_EMAIL`/`_PASSWORD`, см. `login-canary.ts`). Не запускается по расписанию.
 *
 * Регистрирует аккаунт через собственный REST better-auth приложения (не прямой INSERT в БД —
 * так пароль хешируется тем же алгоритмом, что и у настоящих пользователей приложения, включая
 * bcrypt в driving-school), затем напрямую в БД снимает требование верификации email — иначе
 * канарейка будет получать EMAIL_NOT_VERIFIED вместо реальной проверки входа.
 *
 * Идемпотентна: повторный вызов на уже существующий аккаунт не считается ошибкой.
 */

import { Client } from 'pg'
import { getAppUrl } from './app-registry'
import { getDbConfig } from './database'

export interface LoginCanarySetupResult {
  app: string
  signUpOk: boolean
  signUpStatus: number | null
  /** `true`, если sign-up вернул "уже существует" — не ошибка, аккаунт просто был создан раньше. */
  alreadyExisted: boolean
  emailVerifiedSet: boolean
  error: string | null
}

/** Коды/подстроки ответа better-auth, означающие "аккаунт с этим email уже есть". */
function looksLikeAlreadyExists(status: number, body: string): boolean {
  if (status !== 422 && status !== 400) {
    return false
  }
  return /already exists|USER_ALREADY_EXISTS|EMAIL_TAKEN/i.test(body)
}

async function signUpCanaryAccount(
  app: string,
  email: string,
  password: string,
): Promise<{ ok: boolean; status: number | null; alreadyExisted: boolean; error: string | null }> {
  try {
    const response = await fetch(getAppUrl(app, '/api/auth/sign-up/email'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: 'Login Canary' }),
    })

    const body = await response.text()

    if (response.ok) {
      return { ok: true, status: response.status, alreadyExisted: false, error: null }
    }

    if (looksLikeAlreadyExists(response.status, body)) {
      return { ok: true, status: response.status, alreadyExisted: true, error: null }
    }

    return {
      ok: false,
      status: response.status,
      alreadyExisted: false,
      error: `HTTP ${response.status} ${response.statusText}: ${body.slice(0, 300)}`,
    }
  } catch (error) {
    return {
      ok: false,
      status: null,
      alreadyExisted: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Снимает `emailVerified` (better-auth хранит эту булеву колонку в модели `user`, имя таблицы —
 * `"user"` в кавычках у Postgres, т.к. `user` — зарезервированное слово).
 */
async function markEmailVerified(app: string, email: string): Promise<boolean> {
  const config = getDbConfig(app)
  if (!config) {
    return false
  }

  const client = new Client({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    connectionTimeoutMillis: 5000,
  })

  try {
    await client.connect()
    await client.query('UPDATE "user" SET "emailVerified" = true WHERE email = $1', [email])
    return true
  } finally {
    await client.end()
  }
}

export async function setupLoginCanaryAccount(
  app: string,
  email: string,
  password: string,
): Promise<LoginCanarySetupResult> {
  const signUp = await signUpCanaryAccount(app, email, password)

  if (!signUp.ok) {
    return {
      app,
      signUpOk: false,
      signUpStatus: signUp.status,
      alreadyExisted: false,
      emailVerifiedSet: false,
      error: signUp.error,
    }
  }

  try {
    const emailVerifiedSet = await markEmailVerified(app, email)
    return {
      app,
      signUpOk: true,
      signUpStatus: signUp.status,
      alreadyExisted: signUp.alreadyExisted,
      emailVerifiedSet,
      error: emailVerifiedSet ? null : `Нет конфигурации БД для "${app}" — emailVerified не выставлен`,
    }
  } catch (error) {
    return {
      app,
      signUpOk: true,
      signUpStatus: signUp.status,
      alreadyExisted: signUp.alreadyExisted,
      emailVerifiedSet: false,
      error: error instanceof Error ? error.message : 'Unknown error при обновлении emailVerified',
    }
  }
}
