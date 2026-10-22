import { describe, test, expect, beforeEach, vi } from 'vitest'

import { prisma } from './prisma.js'

const mocks = vi.hoisted(() => ({
  pool: { on: vi.fn(), end: vi.fn() },
  Pool: vi.fn(),
  client: { $queryRaw: vi.fn(), $disconnect: vi.fn() },
  PrismaClient: vi.fn(),
  PrismaPg: vi.fn()
}))

vi.mock('pg', () => ({
  default: {
    Pool: function (...args) {
      mocks.Pool(...args)
      return mocks.pool
    }
  }
}))
vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: function (...args) {
    mocks.PrismaPg(...args)
    return { adapter: true }
  }
}))
vi.mock('@prisma/client', () => ({
  PrismaClient: function (...args) {
    mocks.PrismaClient(...args)
    return mocks.client
  }
}))

const options = {
  host: 'db.example',
  port: 5433,
  database: 'tasks',
  username: 'app',
  password: 'secret',
  pool: { max: 4, connectionTimeoutMs: 1500 }
}

const buildServer = () => ({
  logger: { info: vi.fn(), error: vi.fn() },
  decorate: vi.fn(),
  events: { on: vi.fn() }
})

describe('prisma plugin', () => {
  beforeEach(() => {
    mocks.client.$queryRaw.mockResolvedValue([{ '?column?': 1 }])
    mocks.client.$disconnect.mockResolvedValue(undefined)
    mocks.pool.end.mockResolvedValue(undefined)
  })

  test('is a named plugin', () => {
    expect(prisma.plugin.name).toBe('prisma')
    expect(prisma.plugin.version).toBe('1.0.0')
  })

  test('opens a pool from the postgres settings', async () => {
    await prisma.plugin.register(buildServer(), options)

    expect(mocks.Pool).toHaveBeenCalledWith({
      host: 'db.example',
      port: 5433,
      database: 'tasks',
      user: 'app',
      password: 'secret',
      max: 4,
      connectionTimeoutMillis: 1500
    })
    expect(mocks.PrismaPg).toHaveBeenCalledWith(mocks.pool)
    expect(mocks.PrismaClient.mock.calls[0][0]).toMatchObject({
      adapter: { adapter: true },
      log: ['error']
    })
  })

  test('tests the connection and exposes the client to handlers', async () => {
    const server = buildServer()

    await prisma.plugin.register(server, options)

    expect(mocks.client.$queryRaw).toHaveBeenCalled()
    expect(server.decorate).toHaveBeenCalledWith(
      'request',
      'prisma',
      mocks.client
    )
    expect(server.decorate).toHaveBeenCalledWith(
      'server',
      'prisma',
      mocks.client
    )
  })

  test('logs idle pool errors', async () => {
    const server = buildServer()
    await prisma.plugin.register(server, options)

    const [event, listener] = mocks.pool.on.mock.calls[0]
    listener(new Error('idle'), { processID: 42 })

    expect(event).toBe('error')
    expect(server.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 42 }),
      'Unexpected error on idle Prisma PostgreSQL client'
    )
  })

  test('cleans up and rethrows when the database cannot be reached', async () => {
    const server = buildServer()
    mocks.client.$queryRaw.mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(prisma.plugin.register(server, options)).rejects.toThrow(
      'ECONNREFUSED'
    )

    expect(mocks.client.$disconnect).toHaveBeenCalled()
    expect(mocks.pool.end).toHaveBeenCalled()
    expect(server.decorate).not.toHaveBeenCalled()
  })

  test('disconnects when the server stops', async () => {
    const server = buildServer()
    await prisma.plugin.register(server, options)

    const [event, onStop] = server.events.on.mock.calls[0]
    await onStop()

    expect(event).toBe('stop')
    expect(mocks.client.$disconnect).toHaveBeenCalled()
    expect(mocks.pool.end).toHaveBeenCalled()
  })

  test('logs an error if disconnecting fails', async () => {
    const server = buildServer()
    await prisma.plugin.register(server, options)
    mocks.client.$disconnect.mockRejectedValue(new Error('boom'))

    await server.events.on.mock.calls[0][1]()

    expect(server.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'Error disconnecting Prisma'
    )
  })
})
