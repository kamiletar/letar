import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearEnvCache, getAppCronSecret, getAppSmtpConfig, parseEnvFile } from './app-secrets'

describe('app-secrets', () => {
  let secretsDir: string
  const originalSecretsDir = process.env.SECRETS_DIR
  const originalCronSecret = process.env.CRON_SECRET

  beforeEach(() => {
    secretsDir = mkdtempSync(path.join(tmpdir(), 'app-secrets-'))
    process.env.SECRETS_DIR = secretsDir
    clearEnvCache()
    // Файлы отсутствующих секретов логируют warn — глушим, чтобы не шуметь в выводе тестов
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    rmSync(secretsDir, { recursive: true, force: true })
    process.env.SECRETS_DIR = originalSecretsDir
    process.env.CRON_SECRET = originalCronSecret
    clearEnvCache()
    vi.restoreAllMocks()
  })

  function writeSecrets(app: string, content: string): void {
    writeFileSync(path.join(secretsDir, `${app}.env`), content)
  }

  describe('parseEnvFile', () => {
    it('читает пары ключ-значение', () => {
      writeSecrets('demo', 'FOO=bar\nBAZ=qux\n')

      expect(parseEnvFile(path.join(secretsDir, 'demo.env'))).toEqual({ FOO: 'bar', BAZ: 'qux' })
    })

    it('пропускает комментарии и пустые строки', () => {
      writeSecrets('demo', '# комментарий\n\nFOO=bar\n')

      expect(parseEnvFile(path.join(secretsDir, 'demo.env'))).toEqual({ FOO: 'bar' })
    })

    it('снимает обрамляющие кавычки обоих видов', () => {
      writeSecrets('demo', 'A="в кавычках"\nB=\'в апострофах\'\n')

      expect(parseEnvFile(path.join(secretsDir, 'demo.env'))).toEqual({
        A: 'в кавычках',
        B: 'в апострофах',
      })
    })

    it('сохраняет знак "=" внутри значения', () => {
      writeSecrets('demo', 'URL=postgres://u:p@h/db?x=1\n')

      expect(parseEnvFile(path.join(secretsDir, 'demo.env'))['URL']).toBe('postgres://u:p@h/db?x=1')
    })

    it('на отсутствующем файле возвращает пустой объект, а не бросает', () => {
      expect(parseEnvFile(path.join(secretsDir, 'нет-такого.env'))).toEqual({})
    })
  })

  describe('getAppCronSecret', () => {
    it('берёт секрет из файла приложения', () => {
      writeSecrets('studio', 'CRON_SECRET=секрет-студии\n')

      expect(getAppCronSecret('studio')).toBe('секрет-студии')
    })

    // Ядро §52: у каждого приложения секрет свой, агент обязан слать секрет адресата.
    it('разным приложениям отдаёт их собственные секреты', () => {
      writeSecrets('studio', 'CRON_SECRET=секрет-студии\n')
      writeSecrets('driving-school', 'CRON_SECRET=секрет-автошколы\n')
      process.env.CRON_SECRET = 'секрет-агента'

      expect(getAppCronSecret('studio')).toBe('секрет-студии')
      expect(getAppCronSecret('driving-school')).toBe('секрет-автошколы')
    })

    // Регрессия на первопричину: раньше здесь возвращался секрет агента (или литерал
    // 'default-cron-secret'), и приложение отвечало неотличимым 401.
    it('НЕ подставляет секрет агента, когда у приложения своего нет', () => {
      process.env.CRON_SECRET = 'секрет-агента'
      writeSecrets('studio', 'DATABASE_URL=postgres://x\n')

      expect(getAppCronSecret('studio')).toBeNull()
    })

    it('возвращает null, если файла секретов нет вовсе', () => {
      process.env.CRON_SECRET = 'секрет-агента'

      expect(getAppCronSecret('приложение-без-маунта')).toBeNull()
    })

    it('пустое значение приравнивается к отсутствию', () => {
      writeSecrets('studio', 'CRON_SECRET=\n')

      expect(getAppCronSecret('studio')).toBeNull()
    })

    it('для самого dashboard-agent берёт секрет из окружения процесса', () => {
      process.env.CRON_SECRET = 'секрет-агента'

      expect(getAppCronSecret('dashboard-agent')).toBe('секрет-агента')
    })

    it('возвращает null для dashboard-agent без CRON_SECRET в окружении', () => {
      delete process.env.CRON_SECRET

      expect(getAppCronSecret('dashboard-agent')).toBeNull()
    })
  })

  // Используется per-app канарейкой доставки email (domwellbes-email-canary.ts) — читает
  // РЕАЛЬНЫЙ SMTP-аккаунт приложения из того же смонтированного файла, что и CRON_SECRET.
  describe('getAppSmtpConfig', () => {
    it('собирает конфиг из полного SMTP-блока', () => {
      writeSecrets(
        'domwellbes',
        'SMTP_HOST=mail.letar.best\nSMTP_PORT=587\nSMTP_SECURE=false\nSMTP_USER=noreply@domwellbes.ru\nSMTP_PASSWORD=пароль\n',
      )

      expect(getAppSmtpConfig('domwellbes')).toEqual({
        host: 'mail.letar.best',
        port: 587,
        secure: false,
        user: 'noreply@domwellbes.ru',
        password: 'пароль',
      })
    })

    it('дефолтит порт 587 и secure=false при отсутствии явных значений', () => {
      writeSecrets('domwellbes', 'SMTP_HOST=mail.letar.best\nSMTP_USER=noreply@domwellbes.ru\nSMTP_PASSWORD=пароль\n')

      const config = getAppSmtpConfig('domwellbes')
      expect(config?.port).toBe(587)
      expect(config?.secure).toBe(false)
    })

    it('secure=true только при явном SMTP_SECURE=true', () => {
      writeSecrets(
        'domwellbes',
        'SMTP_HOST=mail.letar.best\nSMTP_SECURE=true\nSMTP_USER=x\nSMTP_PASSWORD=y\n',
      )

      expect(getAppSmtpConfig('domwellbes')?.secure).toBe(true)
    })

    it('возвращает null, если не хватает хотя бы одного обязательного поля', () => {
      writeSecrets('domwellbes', 'SMTP_HOST=mail.letar.best\nSMTP_USER=noreply@domwellbes.ru\n')

      expect(getAppSmtpConfig('domwellbes')).toBeNull()
    })

    it('возвращает null для несмонтированного приложения', () => {
      expect(getAppSmtpConfig('приложение-без-маунта')).toBeNull()
    })
  })
})
