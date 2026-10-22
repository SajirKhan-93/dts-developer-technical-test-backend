import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'

import { startServer } from './start-server.js'
import { config } from '../../config.js'
import { createServer } from '../../server.js'
import { migrate } from '../../plugins/database/helpers/migrate.js'

vi.mock('../../server.js', () => ({ createServer: vi.fn() }))
vi.mock('../../plugins/database/helpers/migrate.js', () => ({
  migrate: vi.fn()
}))

describe('startServer', () => {
  let server

  beforeEach(() => {
    server = {
      start: vi.fn().mockResolvedValue(undefined),
      logger: { info: vi.fn() }
    }
    createServer.mockResolvedValue(server)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('creates, starts and returns the server', async () => {
    await expect(startServer()).resolves.toBe(server)

    expect(server.start).toHaveBeenCalled()
    expect(server.logger.info).toHaveBeenCalledWith(
      'Server started successfully'
    )
    expect(server.logger.info).toHaveBeenCalledWith(
      'Access your backend on http://localhost:3001'
    )
  })

  test('does not touch the database schema unless asked to', async () => {
    await startServer()

    expect(migrate).not.toHaveBeenCalled()
  })

  test('applies the changelog before creating the server when asked to', async () => {
    const original = config.get.bind(config)
    vi.spyOn(config, 'get').mockImplementation((key) =>
      key === 'postgres.migrateOnStart' ? true : original(key)
    )
    const order = []
    migrate.mockImplementation(async () => order.push('migrate'))
    createServer.mockImplementation(async () => {
      order.push('createServer')
      return server
    })

    await startServer()

    expect(order).toEqual(['migrate', 'createServer'])
  })

  test('reports migration progress through the logger', async () => {
    const original = config.get.bind(config)
    vi.spyOn(config, 'get').mockImplementation((key) =>
      key === 'postgres.migrateOnStart' ? true : original(key)
    )

    await startServer()

    const { log } = migrate.mock.calls[0][0]
    expect(log).toBeTypeOf('function')
    expect(() => log('Applied 1-001.sql')).not.toThrow()
  })
})
