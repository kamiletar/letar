export async function spawnFfmpeg(args: string[]): Promise<void> {
  const proc = Bun.spawn(['ffmpeg', ...args], { stderr: 'inherit' })
  const code = await proc.exited
  if (code !== 0) { throw new Error(`ffmpeg exited with code ${code}`) }
}
