import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const report = read('../docs/question-review/prepared-batches-review-2026-10-16.json')
const bank = read('../prisma/questions-dump.json')
assert.equal(report.items.length, 79)
assert.equal(report.empiricalValidation, false)
assert.equal(report.interviewsConducted, false)
assert.equal(bank.length, report.bankAfter)
assert.equal(hash(bank.slice(0, report.bankBefore)), report.originalBankSha256, 'Изменён исходный банк')
let count = 0
for (const [path, expectedHash] of Object.entries(report.revisedHashes)) {
  const batch = read(`../prisma/question-batches/${path}.json`)
  assert.equal(hash(batch), expectedHash, `Пакет ${path} изменился после ревью`)
  const originals = report.items.filter((item) => item.source === path).map((item) => item.before)
  assert.equal(hash(originals), report.sourceHashes[path], `Неверный исходный хеш ${path}`)
  for (const question of batch) {
    const matches = bank.filter((q) => q.scenario === question.scenario)
    assert.equal(matches.length, 1, `Вопрос ${path} должен присутствовать в банке ровно один раз`)
    assert.equal(matches[0].scenarioEn, question.scenarioEn)
    assert.deepEqual(JSON.parse(matches[0].options), question.options)
    assert.equal(matches[0].active, true)
    count++
  }
}
assert.equal(count, 83)
console.log(`Подготовленные пакеты: ${report.items.length} исходных пунктов проверены, ${count} включены; исходный банк сохранён.`)
