import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createNodeExecutor, type DeployEngineExecutor } from './executor.js'

describe('createNodeExecutor', () => {
  let root: string
  let executor: DeployEngineExecutor

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'deploy-engine-'))
    executor = createNodeExecutor(root)
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('readFile возвращает null для несуществующего файла', async () => {
    await expect(executor.readFile('nope.txt')).resolves.toBeNull()
    await expect(executor.fileExists('nope.txt')).resolves.toBe(false)
  })

  it('writeFile создаёт недостающие директории, readFile/fileExists видят результат', async () => {
    await executor.writeFile('nested/dir/file.json', '{"ok":true}')

    await expect(executor.fileExists('nested/dir/file.json')).resolves.toBe(true)
    await expect(executor.readFile('nested/dir/file.json')).resolves.toBe('{"ok":true}')
  })

  it('runCommand возвращает stdout и exitCode 0 для успешной команды', async () => {
    const result = await executor.runCommand(process.execPath, ['-e', 'process.stdout.write("hi")'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe('hi')
  })

  it('runCommand возвращает ненулевой exitCode без throw при падении команды', async () => {
    const result = await executor.runCommand(process.execPath, ['-e', 'process.exit(7)'])

    expect(result.exitCode).toBe(7)
  })
})
