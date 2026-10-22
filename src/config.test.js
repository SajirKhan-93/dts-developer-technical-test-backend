import { describe, test, expect } from 'vitest'
import { config } from './config.js'

describe('config', () => {
  test('has the expected server defaults', () => {
    expect(config.get('host')).toBe('0.0.0.0')
    expect(config.get('port')).toBe(3001)
    expect(config.get('serviceName')).toBe('hmcts-dev-test-backend-own')
    expect(config.get('swagger.enabled')).toBe(true)
  })

  test('has the expected database defaults', () => {
    expect(config.get('postgres')).toMatchObject({
      host: '127.0.0.1',
      port: 5432,
      database: 'hmcts_database',
      username: 'postgres',
      migrateOnStart: false,
      pool: { max: 10, connectionTimeoutMs: 5000 }
    })
  })

  test('has the expected logging defaults (off under test)', () => {
    expect(config.get('log.isEnabled')).toBe(false)
    expect(config.get('log.level')).toBe('info')
    expect(config.get('log.format')).toBe('pino-pretty')
  })

  test('rejects settings it does not know about', () => {
    expect(() => config.load({ unknownSetting: 1 })).not.toThrow()
    expect(() => config.validate({ allowed: 'strict' })).toThrow()
  })
})
