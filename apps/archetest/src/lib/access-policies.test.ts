// @vitest-environment node
/**
 * Политики доступа User / ClientPsychologistLink / PsychologistNote / PsychologistMessage.
 *
 * ⚠️ Ходит в НАСТОЯЩУЮ dev-БД, а не в мок `@/lib/db`: проверяется не наш код, а то, как движок
 * политик ZenStack применяет `@deny`/`@@allow` — мок проверял бы сам себя и был бы всегда зелёным.
 *
 * ⚠️ Без `DATABASE_URL` набор пропускается целиком (в выводе vitest — `skipped`): зелёный прогон
 * без этой строки НЕ означает, что политики проверены.
 */
import { loadEnvCascade } from '@letar/env-load'
import { parsePostgresUrl } from '@letar/pg-url'
import { ZenStackClient } from '@zenstackhq/orm'
import { PolicyPlugin } from '@zenstackhq/plugin-policy'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { schema } from '@/generated/schema'

loadEnvCascade()

const databaseUrl = process.env.DATABASE_URL

// Суффикс на прогон: email уникален, параллельный spec-файл не должен делить строку
// (.claude/docs/hardcoded-unique-lookup-key-test-race.md)
const suffix = Math.random().toString(36).slice(2, 10)

describe.skipIf(!databaseUrl)('политики доступа кабинета психолога', () => {
  const orm = new ZenStackClient(schema, {
    dialect: new PostgresDialect({ pool: new Pool(parsePostgresUrl(databaseUrl!)) }) as never,
  })
  const enhanced = orm.$use(new PolicyPlugin())

  let clientId: string
  let psyId: string
  let strangerId: string
  let adminId: string
  let linkId: string

  const as = (id: string, roles: ('USER' | 'ADMIN' | 'PSYCHOLOGIST')[]) => enhanced.$setAuth({ id, roles } as never)
  const asClient = () => as(clientId, ['USER'])
  const asPsy = () => as(psyId, ['USER', 'PSYCHOLOGIST'])

  beforeAll(async () => {
    const mk = (tag: string, roles: ('USER' | 'ADMIN' | 'PSYCHOLOGIST')[]) =>
      orm.user.create({ data: { email: `pol-${tag}-${suffix}@example.test`, roles } })
    clientId = (await mk('client', ['USER'])).id
    psyId = (await mk('psy', ['USER', 'PSYCHOLOGIST'])).id
    strangerId = (await mk('stranger', ['USER'])).id
    adminId = (await mk('admin', ['USER', 'ADMIN'])).id
    linkId = (
      await asClient().clientPsychologistLink.create({ data: { clientId, psychologistId: psyId } })
    ).id
  })

  afterAll(async () => {
    // Связи, заметки и сообщения уходят каскадом
    await orm.user.deleteMany({ where: { id: { in: [clientId, psyId, strangerId, adminId] } } })
    await orm.$disconnect()
  })

  describe('User', () => {
    it('пользователь не меняет себе roles', async () => {
      await expect(asClient().user.update({ where: { id: clientId }, data: { roles: ['USER', 'ADMIN'] } }))
        .rejects.toThrow()
      expect((await orm.user.findUniqueOrThrow({ where: { id: clientId } })).roles).toEqual(['USER'])
    })

    it('и не меняет externalId / emailVerified', async () => {
      await expect(asClient().user.update({ where: { id: clientId }, data: { externalId: 'x' } })).rejects.toThrow()
      await expect(asClient().user.update({ where: { id: clientId }, data: { emailVerified: true } })).rejects.toThrow()
    })

    it('обычные поля себе менять можно, админ роли — тоже', async () => {
      await asClient().user.update({ where: { id: clientId }, data: { name: 'Имя', disclaimerAccepted: true } })
      const admin = as(adminId, ['USER', 'ADMIN'])
      await admin.user.update({ where: { id: strangerId }, data: { roles: ['USER'] } })
    })
  })

  describe('ClientPsychologistLink', () => {
    it('нельзя создать связь с самим собой', async () => {
      await expect(
        asClient().clientPsychologistLink.create({ data: { clientId, psychologistId: clientId } }),
      ).rejects.toThrow()
    })

    it('стороны связи неизменяемы', async () => {
      await expect(
        asClient().clientPsychologistLink.update({ where: { id: linkId }, data: { psychologistId: strangerId } }),
      ).rejects.toThrow()
      await expect(
        asPsy().clientPsychologistLink.update({ where: { id: linkId }, data: { clientId: strangerId } }),
      ).rejects.toThrow()
    })

    it('стороны связи неизменяемы и через relation connect', async () => {
      await expect(
        asClient().clientPsychologistLink.update({
          where: { id: linkId },
          data: { psychologist: { connect: { id: strangerId } } },
        }),
      ).rejects.toThrow()
      await expect(
        asPsy().clientPsychologistLink.update({
          where: { id: linkId },
          data: { client: { connect: { id: strangerId } } },
        }),
      ).rejects.toThrow()
      const link = await orm.clientPsychologistLink.findUniqueOrThrow({ where: { id: linkId } })
      expect([link.clientId, link.psychologistId]).toEqual([clientId, psyId])
    })

    it('психолог меняет только displayName', async () => {
      await asPsy().clientPsychologistLink.update({ where: { id: linkId }, data: { displayName: 'Иван' } })
      await expect(asPsy().clientPsychologistLink.update({ where: { id: linkId }, data: { revokedAt: new Date() } }))
        .rejects.toThrow()
    })

    it('клиент не меняет displayName, но отзывает и восстанавливает связь', async () => {
      await expect(asClient().clientPsychologistLink.update({ where: { id: linkId }, data: { displayName: 'Я' } }))
        .rejects.toThrow()
      await asClient().clientPsychologistLink.update({
        where: { id: linkId },
        data: { status: 'REVOKED', revokedAt: new Date() },
      })
      await asClient().clientPsychologistLink.update({
        where: { id: linkId },
        data: { status: 'ACTIVE', revokedAt: null },
      })
    })

    describe('после отзыва клиентом', () => {
      beforeAll(async () => {
        await asClient().clientPsychologistLink.update({
          where: { id: linkId },
          data: { status: 'REVOKED', revokedAt: new Date() },
        })
      })
      afterAll(async () => {
        await asClient().clientPsychologistLink.update({
          where: { id: linkId },
          data: { status: 'ACTIVE', revokedAt: null },
        })
      })

      it('психолог не может вернуть ACTIVE', async () => {
        await expect(asPsy().clientPsychologistLink.update({ where: { id: linkId }, data: { status: 'ACTIVE' } }))
          .rejects.toThrow()
        expect((await orm.clientPsychologistLink.findUniqueOrThrow({ where: { id: linkId } })).status).toBe('REVOKED')
      })

      it('не пишет сообщение', async () => {
        await expect(asPsy().psychologistMessage.create({ data: { linkId, body: 'привет' } })).rejects.toThrow()
      })

      it('не пишет и не читает заметки', async () => {
        await expect(asPsy().psychologistNote.create({ data: { linkId, content: 'заметка' } })).rejects.toThrow()
        const note = await orm.psychologistNote.create({ data: { linkId, content: 'старая' } })
        expect(await asPsy().psychologistNote.findMany({ where: { linkId } })).toEqual([])
        await expect(asPsy().psychologistNote.update({ where: { id: note.id }, data: { content: 'x' } }))
          .rejects.toThrow()
      })
    })
  })

  describe('при активной связи', () => {
    it('психолог пишет сообщение и ведёт заметки', async () => {
      await asPsy().psychologistMessage.create({ data: { linkId, body: 'привет' } })
      const note = await asPsy().psychologistNote.create({ data: { linkId, content: 'заметка' } })
      await asPsy().psychologistNote.update({ where: { id: note.id }, data: { content: 'правка' } })
      expect(await asPsy().psychologistNote.findMany({ where: { id: note.id } })).toHaveLength(1)
      await asPsy().psychologistNote.delete({ where: { id: note.id } })
    })

    it('заметку нельзя перенести на другую связь', async () => {
      const note = await asPsy().psychologistNote.create({ data: { linkId, content: 'n' } })
      await expect(asPsy().psychologistNote.update({ where: { id: note.id }, data: { linkId: 'other' } }))
        .rejects.toThrow()
    })

    it('заметку нельзя перенести на другую связь через relation connect', async () => {
      const other = await orm.clientPsychologistLink.create({ data: { clientId: strangerId, psychologistId: psyId } })
      const note = await asPsy().psychologistNote.create({ data: { linkId, content: 'c' } })
      await expect(
        asPsy().psychologistNote.update({ where: { id: note.id }, data: { link: { connect: { id: other.id } } } }),
      ).rejects.toThrow()
      expect((await orm.psychologistNote.findUniqueOrThrow({ where: { id: note.id } })).linkId).toBe(linkId)
    })

    it('психолог обновляет lastSeenAt, клиент — нет', async () => {
      await asPsy().clientPsychologistLink.update({ where: { id: linkId }, data: { lastSeenAt: new Date() } })
      await expect(
        asClient().clientPsychologistLink.update({ where: { id: linkId }, data: { lastSeenAt: new Date() } }),
      )
        .rejects.toThrow()
    })
  })
})
