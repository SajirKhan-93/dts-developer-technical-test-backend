import { describe, test, expect } from 'vitest'

import { BaseError } from './base-error.js'
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ServiceUnavailableError
} from './index.js'

describe('BaseError', () => {
  test('defaults to a 500 with an internal error code', () => {
    const error = new BaseError('boom')

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('BaseError')
    expect(error.statusCode).toBe(500)
    expect(error.code).toBe('INTERNAL_ERROR')
    expect(error.field).toBeNull()
  })

  test('serialises to code, message and field only', () => {
    expect(new BaseError('bad', 400, 'BAD', 'title').toJSON()).toEqual({
      code: 'BAD',
      message: 'bad',
      field: 'title'
    })
  })
})

describe('HTTP errors', () => {
  test.each([
    [BadRequestError, 400, 'BAD_REQUEST', 'Bad request'],
    [NotFoundError, 404, 'NOT_FOUND', 'Resource not found'],
    [ConflictError, 409, 'CONFLICT', 'Resource conflict'],
    [ServiceUnavailableError, 503, 'SERVICE_UNAVAILABLE', 'Service unavailable']
  ])(
    '%o has its own status, code and message',
    (ErrorClass, status, code, message) => {
      const error = new ErrorClass()

      expect(error).toBeInstanceOf(BaseError)
      expect(error.statusCode).toBe(status)
      expect(error.code).toBe(code)
      expect(error.message).toBe(message)
    }
  )

  test('accept a custom message, code and field', () => {
    const error = new ConflictError('exists', 'TASK_TITLE_DUPLICATE', 'title')

    expect(error.toJSON()).toEqual({
      code: 'TASK_TITLE_DUPLICATE',
      message: 'exists',
      field: 'title'
    })
  })
})
