import { describe, test, expect, beforeEach, vi } from 'vitest'

import healthPlugin, { healthSimple, healthFull } from './index.js'
import { buildH, buildRequest } from '../../common/test-helpers/hapi-mocks.js'

describe('health plugin', () => {
  let h

  beforeEach(() => {
    h = buildH()
  })

  test('registers both health routes', () => {
    const server = { route: vi.fn() }

    healthPlugin.register(server, {})

    expect(server.route).toHaveBeenCalledWith([healthSimple, healthFull])
  })

  describe('GET /health', () => {
    test('has the right method and path', () => {
      expect(healthSimple.method).toBe('GET')
      expect(healthSimple.path).toBe('/health')
    })

    test('answers success without touching the database', () => {
      healthSimple.handler(buildRequest(), h)

      expect(h.response).toHaveBeenCalledWith({ message: 'success' })
      expect(h.code).toHaveBeenCalledWith(200)
    })
  })

  describe('GET /health-detailed', () => {
    test('has the right method and path', () => {
      expect(healthFull.method).toBe('GET')
      expect(healthFull.path).toBe('/health-detailed')
    })

    test('is healthy when the database answers', async () => {
      const request = buildRequest({
        prisma: { $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]) }
      })

      await healthFull.handler(request, h)

      expect(h.response).toHaveBeenCalledWith({
        status: 'healthy',
        checks: { postgres: { healthy: true } }
      })
      expect(h.code).toHaveBeenCalledWith(200)
    })

    test('is unhealthy (503) when the database query fails', async () => {
      const request = buildRequest({
        prisma: { $queryRaw: vi.fn().mockRejectedValue(new Error('down')) }
      })

      await healthFull.handler(request, h)

      expect(h.response).toHaveBeenCalledWith({
        status: 'unhealthy',
        checks: { postgres: { healthy: false } }
      })
      expect(h.code).toHaveBeenCalledWith(503)
      expect(request.server.logger.error).toHaveBeenCalled()
    })
  })
})
