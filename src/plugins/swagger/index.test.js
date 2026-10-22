import { describe, test, expect, vi } from 'vitest'

import swaggerPlugin from './index.js'

vi.mock('@hapi/inert', () => ({ default: { name: 'inert' } }))
vi.mock('@hapi/vision', () => ({ default: { name: 'vision' } }))
vi.mock('hapi-swagger', () => ({ default: { name: 'hapi-swagger' } }))

describe('swagger plugin', () => {
  test('registers inert, vision and hapi-swagger', async () => {
    const server = { register: vi.fn() }

    await swaggerPlugin.register(server)

    const [plugins] = server.register.mock.calls[0]
    expect(plugins[0].name).toBe('inert')
    expect(plugins[1].name).toBe('vision')
    expect(plugins[2].plugin.name).toBe('hapi-swagger')
  })

  test('serves the docs at /documentation and the spec at /swagger.json', async () => {
    const server = { register: vi.fn() }

    await swaggerPlugin.register(server)

    const { options } = server.register.mock.calls[0][0][2]
    expect(options.documentationPath).toBe('/documentation')
    expect(options.jsonPath).toBe('/swagger.json')
    expect(options.info.title).toBe('HMCTS Task Manager - Backend API')
    expect(options.tags.map((tag) => tag.name)).toEqual(['tasks', 'health'])
  })
})
