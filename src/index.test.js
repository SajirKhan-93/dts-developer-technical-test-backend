import { describe, test, expect, afterEach, vi } from 'vitest'
import process from 'node:process'

const startServer = vi.hoisted(() => vi.fn())

vi.mock('./common/helpers/start-server.js', () => ({ startServer }))

describe('index', () => {
  afterEach(() => {
    process.exitCode = undefined
    vi.resetModules()
  })

  test('starts the server', async () => {
    startServer.mockResolvedValue({})

    await import('./index.js')

    expect(startServer).toHaveBeenCalled()
  })

  test('marks the process as failed on an unhandled rejection', async () => {
    startServer.mockResolvedValue({})
    const before = process.listeners('unhandledRejection')

    await import('./index.js')

    const handler = process
      .listeners('unhandledRejection')
      .find((listener) => !before.includes(listener))
    handler(new Error('unhandled'))
    expect(process.exitCode).toBe(1)

    process.off('unhandledRejection', handler)
  })
})
