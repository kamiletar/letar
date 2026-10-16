import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

// Проверка одноразового редакторского аудита; не меняет файлы и не обращается к БД.
const bank = JSON.parse(readFileSync(new URL('../prisma/questions-dump.json', import.meta.url), 'utf8'))
const report = JSON.parse(readFileSync(new URL('../docs/question-review/literary-audit-2026-10-16.json', import.meta.url), 'utf8'))
const byId = new Map(bank.map((question) => [question.id, question]))
assert.equal(bank.length, report.totalQuestions, 'Состав банка изменился после аудита')

const unchanged = bank.map((question) => ({
  ...question,
  scenario: '',
  options: JSON.parse(question.options).map((option) => ({ ...option, text: '' })),
}))
assert.equal(
  createHash('sha256').update(JSON.stringify(unchanged)).digest('hex'),
  report.unchangedDataSha256,
  'Изменились данные вне русского текста: состав, порядок, баллы или английские тексты',
)

const reviewed = new Set(report.reviewedQuestionIds)
assert.equal(reviewed.size, report.reviewedQuestionIds.length, 'Повтор ID в покрытии')
for (const id of reviewed) { assert.ok(byId.has(id), `Нет вопроса ${id}`) }
const fields = new Set()
const originalTexts = bank.map((question) => ({
  id: question.id,
  scenario: question.scenario,
  options: JSON.parse(question.options).map((option) => option.text),
}))
const originalTextsById = new Map(originalTexts.map((question) => [question.id, question]))
for (const edit of report.changes) {
  assert.ok(reviewed.has(edit.questionId), `Правка непроверенного вопроса ${edit.questionId}`)
  const question = byId.get(edit.questionId)
  assert.equal(question.sortOrder, edit.sortOrder)
  const key = `${edit.questionId}:${edit.field}`
  assert.ok(!fields.has(key), `Повторная правка одного поля: ${key}`)
  fields.add(key)
  const optionMatch = /^options\[(\d+)\]\.text$/.exec(edit.field)
  assert.ok(edit.field === 'scenario' || optionMatch, `Недопустимое поле ${edit.field}`)
  const text = edit.field === 'scenario' ? question.scenario : JSON.parse(question.options)[Number(optionMatch[1])]?.text
  assert.equal(text, edit.after, `Текст не совпадает с журналом: ${key}`)
  assert.notEqual(edit.before, edit.after)
  assert.ok(edit.reason, `Нет причины правки: ${key}`)
  const original = originalTextsById.get(edit.questionId)
  if (edit.field === 'scenario') { original.scenario = edit.before }
  else { original.options[Number(optionMatch[1])] = edit.before }
}

assert.equal(
  createHash('sha256').update(JSON.stringify(originalTexts)).digest('hex'),
  report.originalRussianSha256,
  'Есть незаписанные в журнал правки или неверные исходные тексты',
)

if (process.argv.includes('--require-complete') || report.status === 'complete') {
  assert.equal(report.status, 'complete', 'Аудит ещё выполняется')
  assert.equal(reviewed.size, bank.length, 'Вычитан не весь банк')
}

console.log(`Аудит ${report.status}: ${reviewed.size}/${bank.length} вопросов, ${report.changes.length} правок. Баллы, порядок и EN сохранены.`)
