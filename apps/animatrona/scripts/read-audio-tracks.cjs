const Database = require('better-sqlite3')
const dbPath = 'C:/Users/Kami/AppData/Roaming/@letar/animatrona/data/app.db'
const db = new Database(dbPath, { readonly: true })

// Структура ImportQueueItem
const pragma = db.prepare(`PRAGMA table_info(ImportQueueItem)`).all()
console.log('=== ImportQueueItem columns ===')
console.log(pragma.map((p) => p.name).join(', '))

const queueItems = db
  .prepare(
    `
  SELECT id, status, error, addedAt
  FROM ImportQueueItem
  ORDER BY addedAt DESC
  LIMIT 3
`,
  )
  .all()
console.log('\n=== ImportQueueItem ===')
queueItems.forEach((q) => {
  console.log(`${q.status}: ${q.id.slice(0, 8)}... ${q.error || ''}`)
})

const episode = db
  .prepare(
    `
  SELECT e.id, e.number, e.name, a.name as animeName
  FROM Episode e
  JOIN Anime a ON e.animeId = a.id
  ORDER BY e.createdAt DESC
  LIMIT 1
`,
  )
  .get()

console.log('\n=== Последний эпизод ===')
console.log(JSON.stringify(episode, null, 2))

if (episode) {
  const audioTracks = db
    .prepare(
      `
    SELECT id, streamIndex, language, title, codec, channels, bitrate, dubGroup, transcodedCid, isDefault, createdAt, updatedAt
    FROM AudioTrack
    WHERE episodeId = ?
    ORDER BY streamIndex
  `,
    )
    .all(episode.id)

  console.log('\n=== Аудиодорожки ===')
  audioTracks.forEach((track, i) => {
    console.log(`\n[${i}] ${track.language} - ${track.dubGroup || '(no dubGroup)'}`)
    console.log(`    codec: ${track.codec}, channels: ${track.channels}`)
    console.log(`    transcodedCid: ${track.transcodedCid || 'NULL ⚠️'}`)
    console.log(`    streamIndex: ${track.streamIndex}, isDefault: ${track.isDefault}`)
    console.log(`    created: ${track.createdAt}, updated: ${track.updatedAt}`)
  })
}
db.close()
