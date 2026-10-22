import { describe, test, expect } from 'vitest'

import { validationFailAction } from './validation-fail-action.js'
import { buildH } from '../test-helpers/hapi-mocks.js'

describe('validationFailAction', () => {
  test('returns every Joi detail as { field, errorCode } with a 400 and takes over', () => {
    const h = buildH()
    const error = {
      details: [
        { path: ['title'], message: 'TASK_TITLE_REQUIRED' },
        { path: ['nested', 'field'], message: 'SOME_CODE' }
      ]
    }

    validationFailAction({}, h, error)

    expect(h.response).toHaveBeenCalledWith({
      validationErrors: [
        { field: 'title', errorCode: 'TASK_TITLE_REQUIRED' },
        { field: 'nested.field', errorCode: 'SOME_CODE' }
      ]
    })
    expect(h.code).toHaveBeenCalledWith(400)
    expect(h.takeover).toHaveBeenCalled()
  })

  test('falls back to the label when there is no path', () => {
    const h = buildH()

    validationFailAction({}, h, {
      details: [{ path: [], message: 'X', context: { label: 'value' } }]
    })

    expect(h.response.mock.calls[0][0].validationErrors[0].field).toBe('value')
  })

  test('uses "unknown" when a detail has neither a path nor a label', () => {
    const h = buildH()

    validationFailAction({}, h, { details: [{ message: 'X' }] })

    expect(h.response.mock.calls[0][0].validationErrors[0].field).toBe(
      'unknown'
    )
  })

  test('reports a generic error when Joi gave no details', () => {
    const h = buildH()

    validationFailAction({}, h, new Error('bad'))

    expect(h.response).toHaveBeenCalledWith({
      validationErrors: [{ field: 'unknown', errorCode: 'VALIDATION_ERROR' }]
    })
  })
})
