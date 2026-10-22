import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import pg from 'pg'

import { config } from '../../../config.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const changelogDir = path.resolve(dirname, '../../../../changelog')

/**
 * Applies the SQL files in /changelog (in filename order) that have not been
 * applied yet. Each file is recorded in changelog_history so it only runs once.
 *
 * @param {Object} [options]
 * @param {(message: string) => void} [options.log] - Where progress is reported
 */
export async function migrate({ log = console.log } = {}) {
  const { host, port, database, username, password } = config.get('postgres')
  const client = new pg.Client({
    host,
    port,
    database,
    user: username,
    password
  })

  await client.connect()

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS changelog_history (
        filename   VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `)

    const applied = new Set(
      (await client.query('SELECT filename FROM changelog_history')).rows.map(
        (row) => row.filename
      )
    )

    const files = (await readdir(changelogDir))
      .filter((file) => file.endsWith('.sql'))
      .sort()

    for (const file of files) {
      if (applied.has(file)) {
        continue
      }

      const sql = await readFile(path.join(changelogDir, file), 'utf-8')
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO changelog_history (filename) VALUES ($1)',
          [file]
        )
        await client.query('COMMIT')
        log(`Applied ${file}`)
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }

    log('Database is up to date')
  } finally {
    await client.end()
  }
}

// Run directly (npm run db:migrate) rather than imported by the server
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  migrate().catch((error) => {
    console.error('Database migration failed:', error.message)
    process.exitCode = 1
  })
}
