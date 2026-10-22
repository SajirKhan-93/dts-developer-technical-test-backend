import { describe, test, expect, beforeEach, vi } from 'vitest'

import { migrate } from './migrate.js'
import { config } from '../../../config.js'

const mocks = vi.hoisted(() => ({
  client: { connect: vi.fn(), query: vi.fn(), end: vi.fn() },
  Client: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn()
}))

vi.mock('pg', () => ({
  default: {
    Client: function (...args) {
      mocks.Client(...args)
      return mocks.client
    }
  }
}))
vi.mock('node:fs/promises', () => ({
  readdir: mocks.readdir,
  readFile: mocks.readFile
}))

const sqlRan = () =>
  mocks.client.query.mock.calls.map(([sql]) => sql.trim().split('\n')[0])

describe('migrate', () => {
  let log
  let applied

  beforeEach(() => {
    log = vi.fn()
    applied = []
    mocks.client.connect.mockResolvedValue(undefined)
    mocks.client.end.mockResolvedValue(undefined)
    mocks.client.query.mockImplementation(async (sql) =>
      sql.includes('SELECT filename')
        ? { rows: applied.map((filename) => ({ filename })) }
        : { rows: [] }
    )
    mocks.readdir.mockResolvedValue([
      '1-002-second.sql',
      'notes.txt',
      '1-001-first.sql'
    ])
    mocks.readFile.mockImplementation(
      async (file) => `-- ${file.split(/[\\/]/).pop()}`
    )
  })

  test('connects with the postgres settings and always disconnects', async () => {
    await migrate({ log })

    const { host, port, database, username, password } = config.get('postgres')
    expect(mocks.Client).toHaveBeenCalledWith({
      host,
      port,
      database,
      user: username,
      password
    })
    expect(mocks.client.connect).toHaveBeenCalled()
    expect(mocks.client.end).toHaveBeenCalled()
  })

  test('applies the .sql files in name order, each in a transaction', async () => {
    await migrate({ log })

    expect(sqlRan()).toEqual([
      'CREATE TABLE IF NOT EXISTS changelog_history (',
      'SELECT filename FROM changelog_history',
      'BEGIN',
      '-- 1-001-first.sql',
      'INSERT INTO changelog_history (filename) VALUES ($1)',
      'COMMIT',
      'BEGIN',
      '-- 1-002-second.sql',
      'INSERT INTO changelog_history (filename) VALUES ($1)',
      'COMMIT'
    ])
    expect(log).toHaveBeenCalledWith('Applied 1-001-first.sql')
    expect(log).toHaveBeenCalledWith('Applied 1-002-second.sql')
    expect(log).toHaveBeenLastCalledWith('Database is up to date')
  })

  test('records each applied file', async () => {
    await migrate({ log })

    const inserts = mocks.client.query.mock.calls.filter(([sql]) =>
      sql.startsWith('INSERT')
    )
    expect(inserts.map(([, params]) => params)).toEqual([
      ['1-001-first.sql'],
      ['1-002-second.sql']
    ])
  })

  test('skips files that were already applied', async () => {
    applied = ['1-001-first.sql']

    await migrate({ log })

    expect(log).not.toHaveBeenCalledWith('Applied 1-001-first.sql')
    expect(log).toHaveBeenCalledWith('Applied 1-002-second.sql')
  })

  test('has nothing to do when everything is applied', async () => {
    applied = ['1-001-first.sql', '1-002-second.sql']

    await migrate({ log })

    expect(sqlRan()).not.toContain('BEGIN')
    expect(log).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledWith('Database is up to date')
  })

  test('rolls back, stops and still disconnects when a file fails', async () => {
    mocks.client.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT filename')) {
        return { rows: [] }
      }
      if (sql.startsWith('-- 1-001')) {
        throw new Error('syntax error')
      }
      return { rows: [] }
    })

    await expect(migrate({ log })).rejects.toThrow('syntax error')

    expect(sqlRan()).toContain('ROLLBACK')
    expect(sqlRan()).not.toContain('-- 1-002-second.sql')
    expect(mocks.client.end).toHaveBeenCalled()
  })
})
