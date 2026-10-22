import { describe, test, expect } from 'vitest'

import { createLogger } from './logger.js'
import { loggerOptions } from './logger-options.js'
import { requestLogger } from './request-logger.js'

describe('logging', () => {
  test('loggerOptions follow the log config (disabled under test)', () => {
    expect(loggerOptions.enabled).toBe(false)
    expect(loggerOptions.level).toBe('info')
    expect(loggerOptions.ignorePaths).toEqual(['/health', '/health-detailed'])
    expect(loggerOptions.redact).toEqual({
      paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers'],
      remove: true
    })
  })

  test('createLogger always returns the same pino logger', () => {
    const logger = createLogger()

    expect(createLogger()).toBe(logger)
    expect(logger.info).toBeTypeOf('function')
    expect(logger.error).toBeTypeOf('function')
  })

  test('requestLogger is the hapi-pino plugin with the shared options', () => {
    expect(requestLogger.plugin).toBeDefined()
    expect(requestLogger.options).toBe(loggerOptions)
  })
})
