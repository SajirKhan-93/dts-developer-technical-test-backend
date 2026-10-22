import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest'

import { createServer } from './server.js'
import { createFakePrisma } from './common/test-helpers/fake-prisma.js'

vi.mock('./plugins/database/prisma.js', () => ({
  prisma: {
    plugin: {
      name: 'prisma',
      register: async (server) => {
        server.decorate('request', 'prisma', createFakePrisma())
      }
    }
  }
}))

describe('createServer', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('listens on the configured host and port', () => {
    expect(server.info.port).toBe(3001)
    expect(server.settings.host).toBe('0.0.0.0')
  })

  test('registers the health and task routes', () => {
    const routes = server
      .table()
      .map((route) => `${route.method.toUpperCase()} ${route.path}`)

    expect(routes).toEqual(
      expect.arrayContaining([
        'GET /health',
        'GET /health-detailed',
        'POST /api/v1/tasks',
        'GET /api/v1/tasks',
        'GET /api/v1/tasks/{id}',
        'PATCH /api/v1/tasks/{id}/status',
        'DELETE /api/v1/tasks/{id}',
        'POST /api/v1/tasks/check-title'
      ])
    )
  })

  test('serves the API end to end', async () => {
    const created = await server.inject({
      method: 'POST',
      url: '/api/v1/tasks',
      payload: { title: 'From server test', dueDateTime: '2026-12-01T10:00:00' }
    })
    const list = await server.inject('/api/v1/tasks')

    expect(created.statusCode).toBe(201)
    expect(list.result.map((task) => task.title)).toEqual(['From server test'])
  })

  test('answers unknown routes in the common error shape', async () => {
    const res = await server.inject('/nope')

    expect(res.statusCode).toBe(404)
    expect(res.result.errors[0].errorCode).toBe('NOT_FOUND')
  })

  test('sends security headers', async () => {
    const res = await server.inject('/health')

    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('DENY')
    expect(res.headers['strict-transport-security']).toContain(
      'max-age=31536000'
    )
  })

  test('serves swagger in development and test', async () => {
    const docs = await server.inject('/documentation')
    const spec = await server.inject('/swagger.json')

    expect(docs.statusCode).toBe(200)
    expect(Object.keys(spec.result.paths)).toContain('/api/v1/tasks')
  })
})
