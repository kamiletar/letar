import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Рабочее дерево и пакеты используются только для чтения. Все записи — в новом fixture.
const repo = process.cwd()
assert(existsSync(join(repo, 'scripts/check-intentional-pins.mjs')), 'Запускайте из корня Letar')
const outputBase = join(repo, '.claude/artifacts/infra-deps-skill-evals')
mkdirSync(outputBase, { recursive: true })
const output = mkdtempSync(join(outputBase, 'run-'))
const json = (path, data) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}
const results = []
const manifestPath = join(repo, 'package.json')
const lockPath = join(repo, 'bun.lock')
const before = [readFileSync(manifestPath), readFileSync(lockPath)]

function command(name, executable, args, cwd) {
  const child = spawnSync(executable, args, {
    cwd,
    windowsHide: true,
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, NX_DAEMON: 'false', NX_ISOLATE_PLUGINS: 'false', NX_NO_CLOUD: 'true' },
  })
  writeFileSync(join(output, `${name}.log`), `${child.stdout ?? ''}${child.stderr ?? ''}`)
  if (child.error) { throw child.error }
  return child.status
}

// Replay подтверждённого репро; actual ORM/DB здесь намеренно не вызывается.
const policy = join(output, 'policy')
mkdirSync(join(policy, 'scripts/lib'), { recursive: true })
for (const name of ['scripts/check-intentional-pins.mjs', 'scripts/lib/pins.mjs']) {
  writeFileSync(join(policy, name), readFileSync(join(repo, name)))
}
const measured = [
  { version: '3.9.8', rejected: true, role: null },
  { version: '3.10.3', rejected: false, role: 'OPERATOR' },
]
json(join(policy, 'measured-lt086.json'), measured)
const names = ['@zenstackhq/orm', '@zenstackhq/plugin-policy']
const registry = {
  pins: names.map((name) => ({
    package: name,
    field: 'dependencies',
    version: '3.9.8',
    reason: 'Кандидат разрешил запрещённую смену роли',
    doc: '.claude/docs/zenstack-post-update-null-comparison-regression.md',
    unpinWhen: 'Отказ и неизменность роли подтверждены на новой версии',
  })),
}
json(join(policy, 'scripts/intentional-pins.json'), registry)
const packageFor = (version) => ({
  private: true,
  dependencies: Object.fromEntries(names.map((name) => [name, version])),
  overrides: Object.fromEntries(names.map((name) => [name, version])),
  resolutions: Object.fromEntries(names.map((name) => [name, version])),
})
json(join(policy, 'package.json'), packageFor(measured[1].version))
assert.equal(command('policy-candidate', process.execPath, ['scripts/check-intentional-pins.mjs'], policy), 1)
assert.equal(measured[1].rejected, false)
assert.equal(measured[0].rejected && measured[0].role === null, true)
json(join(policy, 'package.json'), packageFor(measured[0].version))
assert.equal(command('policy-restored', process.execPath, ['scripts/check-intentional-pins.mjs'], policy), 0)
results.push({
  id: 1,
  passed: true,
  evidence: 'Кандидат: pin-gate 1; восстановление: pin-gate 0',
  limits: 'Replay измерений LT-086, новая БД/ORM не запускалась',
})

const require = createRequire(join(repo, 'package.json'))
const chakraRoot = dirname(require.resolve('@chakra-ui/react/package.json'))
const esm = await import(pathToFileURL(join(chakraRoot, 'dist/esm/utils/memo.js')).href)
const cjs = require(join(chakraRoot, 'dist/cjs/utils/memo.cjs'))
for (const memo of [esm.memo, cjs.memo]) {
  const cached = memo((value) => Object.keys(value).join(','))
  assert.notEqual(cached({ color: 1, fontSize: 2 }), cached({ fontSize: 2, color: 1 }))
}
// Отрицательный контроль: именно сортировка ключей скрывает различие порядка.
const cache = new Map()
const sortedMemo = (value) => {
  const key = JSON.stringify(Object.keys(value).sort())
  if (!cache.has(key)) { cache.set(key, Object.keys(value).join(',')) }
  return cache.get(key)
}
assert.equal(sortedMemo({ color: 1, fontSize: 2 }), sortedMemo({ fontSize: 2, color: 1 }))
const patch = join(output, 'patch')
mkdirSync(join(patch, 'patches'), { recursive: true })
const stale = 'patches/old-memo.patch'
const neighbor = 'patches/neighbor.patch'
writeFileSync(join(patch, stale), 'Исторический патч')
writeFileSync(join(patch, neighbor), 'Соседний патч')
const patches = { '@chakra-ui/react@3.37.0': stale, 'neighbor@1.0.0': neighbor }
json(join(patch, 'package.json'), { patchedDependencies: patches })
delete patches['@chakra-ui/react@3.37.0']
unlinkSync(join(patch, stale))
json(join(patch, 'package.json'), { patchedDependencies: patches })
assert(!existsSync(join(patch, stale)))
assert.equal(readFileSync(join(patch, neighbor), 'utf8'), 'Соседний патч')
assert.deepEqual(Object.keys(patches), ['neighbor@1.0.0'])
results.push({
  id: 2,
  passed: true,
  evidence: 'Реальные ESM/CJS memo и отрицательный контроль; удалён только fixture-патч',
  version: JSON.parse(readFileSync(join(chakraRoot, 'package.json'), 'utf8')).version,
})

const workspace = join(output, 'workspace')
mkdirSync(workspace)
json(join(workspace, 'nx.json'), { plugins: [], useInferencePlugins: false, neverConnectToCloud: true })
json(join(workspace, 'package.json'), { name: 'deps-skill-fixture', private: true })
writeFileSync(
  join(workspace, 'build.mjs'),
  "import { appendFileSync, writeFileSync } from 'node:fs'; const task=process.argv[2]; if(task==='storage:db:template')writeFileSync('db-marker','executed'); appendFileSync('runs.jsonl',JSON.stringify({task,status:'success'})+'\\n');\n",
)
for (const name of ['alpha', 'beta', 'gamma', 'storage']) {
  const target = name === 'storage' ? 'db:template' : 'build'
  json(join(workspace, 'apps', name, 'project.json'), {
    name,
    targets: {
      [target]: {
        executor: 'nx:run-commands',
        cache: false,
        ...(name === 'alpha' ? { dependsOn: ['storage:db:template'] } : {}),
        options: { command: `node build.mjs ${name}:${target}`, cwd: '{workspaceRoot}' },
      },
    },
  })
}
const nx = resolve(repo, 'node_modules/nx/dist/bin/nx.js')
const node = Bun.which('node')
assert(node)
const nxRun = (label, args) => assert.equal(command(label, node, [nx, ...args], workspace), 0, `См. ${label}.log`)
nxRun('build-initial-graph', ['run-many', '-t', 'build', '--exclude=storage', '--graph=initial.json'])
const graph = JSON.parse(readFileSync(join(workspace, 'initial.json'), 'utf8'))
const taskGraph = graph.tasks
assert(taskGraph.tasks['storage:db:template'], 'exclude не должен скрыть транзитивный prerequisite')
nxRun('build-before-interruption', ['run', 'beta:build'])
const prior = [{ task: 'beta:build', status: 'success' }, { task: 'gamma:build', status: 'started' }]
json(join(workspace, 'prior.json'), prior)
const reachesDb = (id, seen = new Set()) => {
  if (id === 'storage:db:template') { return true }
  if (seen.has(id)) { return false }
  seen.add(id)
  return (taskGraph.dependencies[id] ?? []).some((dep) => reachesDb(typeof dep === 'string' ? dep : dep.id, seen))
}
const builds = Object.values(taskGraph.tasks).filter((task) => task.target.target === 'build')
const successful = new Set(prior.filter((item) => item.status === 'success').map((item) => item.task))
const excluded = builds.filter((task) => reachesDb(task.id)).map((task) => task.id)
const retry = builds.filter((task) => !successful.has(task.id) && !reachesDb(task.id)).map((task) =>
  task.target.project
)
assert.deepEqual(excluded, ['alpha:build'])
assert.deepEqual(retry, ['gamma'])
nxRun('build-retry-graph', ['run-many', '-t', 'build', `--projects=${retry.join(',')}`, '--graph=retry.json'])
const retryGraph = JSON.parse(readFileSync(join(workspace, 'retry.json'), 'utf8'))
assert(!retryGraph.tasks.tasks['storage:db:template'])
nxRun('build-retry', ['run-many', '-t', 'build', `--projects=${retry.join(',')}`])
const runs = readFileSync(join(workspace, 'runs.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line))
assert.deepEqual(runs.map((item) => item.task), ['beta:build', 'gamma:build'])
assert(!existsSync(join(workspace, 'db-marker')))
results.push({
  id: 3,
  passed: true,
  successful: runs.map((item) => item.task),
  unverified: excluded,
  fullGateGreen: false,
})

assert.deepEqual(readFileSync(manifestPath), before[0])
assert.deepEqual(readFileSync(lockPath), before[1])
json(join(output, 'results.json'), {
  mode: 'Текущий агент: изолированный dry-run, без независимой LLM-оценки',
  results,
})
console.log(JSON.stringify({ output, results }, null, 2))
