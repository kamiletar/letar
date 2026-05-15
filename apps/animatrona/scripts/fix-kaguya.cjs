/**
 * Удаляем аниме "Кагуя" для чистого пере-импорта
 * После этого нужно пересобрать приложение и импортировать заново
 */
const Database = require('better-sqlite3')
const dbPath = 'C:/Users/Kami/AppData/Roaming/@letar/animatrona/data/app.db'
const db = new Database(dbPath)

// Находим аниме
const anime = db
  .prepare(
    `
  SELECT id, name FROM Anime
  WHERE name LIKE '%Кагуя%' OR name LIKE '%Kaguya%'
`
  )
  .get()

if (!anime) {
  console.log('Аниме не найдено')
  db.close()
  process.exit(0)
}

console.log('Найдено аниме:', anime.name)
console.log('ID:', anime.id)

// Удаляем (каскадно удалятся Episode, AudioTrack и т.д.)
const result = db.prepare(`DELETE FROM Anime WHERE id = ?`).run(anime.id)
console.log('Удалено строк:', result.changes)

db.close()
console.log('\nТеперь пересобери приложение и импортируй заново!')
