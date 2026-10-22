import { describe, test, expect, vi } from 'vitest'

import { boomToErrorResponse } from './boom-to-error-response.js'
import { buildH } from '../test-helpers/hapi-mocks.js'

const boomRequest = (statusCode, message = 'framework message') => ({
  response: {
    isBoom: true,
    output: { statusCode, payload: { message } }
  },
  logger: { error: vi.fn() }
})

describe('boomToErrorResponse', () => {
  test('lets normal responses through', () => {
    const h = { ...buildH(), continue: Symbol('continue') }

    const result = boomToErrorResponse({ response: { isBoom: false } }, h)

    expect(result).toBe(h.continue)
    expect(h.response).not.toHaveBeenCalled()
  })

  test.each([
    [400, 'BAD_REQUEST'],
    [404, 'NOT_FOUND'],
    [405, 'METHOD_NOT_ALLOWED'],
    [413, 'PAYLOAD_TOO_LARGE'],
    [415, 'UNSUPPORTED_MEDIA_TYPE'],
    [418, 'REQUEST_FAILED']
  ])('turns a %i into the common error shape with %s', (status, errorCode) => {
    const h = buildH()

    boomToErrorResponse(boomRequest(status, 'nope'), h)

    expect(h.response).toHaveBeenCalledWith({
      errors: [{ errorCode, message: 'nope', field: null }]
    })
    expect(h.code).toHaveBeenCalledWith(status)
  })

  test('hides the message of server errors and logs them', () => {
    const h = buildH()
    const request = boomRequest(500, 'stack trace here')

    boomToErrorResponse(request, h)

    expect(h.response).toHaveBeenCalledWith({
      errors: [
        {
          errorCode: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          field: null
        }
      ]
    })
    expect(h.code).toHaveBeenCalledWith(500)
    expect(request.logger.error).toHaveBeenCalled()
  })

  test('does not fail when there is no request logger', () => {
    const h = buildH()
    const request = boomRequest(503)
    delete request.logger

    expect(() => boomToErrorResponse(request, h)).not.toThrow()
  })
})
