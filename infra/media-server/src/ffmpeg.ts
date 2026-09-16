export async function spawnFfmpeg(args: string[]): Promise<void> {
  const proc = Bun.spawn(['ffmpeg', ...args], { stderr: 'inherit' })
  const code = await proc.exited
  if (code !== 0) { throw new Error(`ffmpeg exited with code ${code}`) }
}

/** Запускает ffprobe с JSON-выводом и возвращает разобранный результат */
export async function runFfprobe(args: string[]): Promise<unknown> {
  const proc = Bun.spawn(['ffprobe', '-v', 'error', '-of', 'json', ...args], { stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  if (code !== 0) { throw new Error(`ffprobe exited with code ${code}: ${stderr.trim()}`) }
  return JSON.parse(stdout)
}
