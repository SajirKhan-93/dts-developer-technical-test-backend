import { describe, test, expect } from 'vitest'

import {
  buildSuccessResponse,
  buildValidationErrorResponse
} from './response-builder.js'
import { buildH } from '../test-helpers/hapi-mocks.js'

describe('response-builder', () => {
  test('buildValidationErrorResponse wraps the errors in validationErrors', () => {
    const h = buildH()
    const errors = [{ field: 'title', errorCode: 'TASK_TITLE_REQUIRED' }]

    buildValidationErrorResponse(h, 400, errors)

    expect(h.response).toHaveBeenCalledWith({ validationErrors: errors })
    expect(h.code).toHaveBeenCalledWith(400)
  })

  test('buildSuccessResponse defaults to 200', () => {
    const h = buildH()

    buildSuccessResponse(h, { ok: true })

    expect(h.response).toHaveBeenCalledWith({ ok: true })
    expect(h.code).toHaveBeenCalledWith(200)
  })

  test('buildSuccessResponse accepts another status', () => {
    const h = buildH()

    buildSuccessResponse(h, { id: 1 }, 201)

    expect(h.code).toHaveBeenCalledWith(201)
  })
})
