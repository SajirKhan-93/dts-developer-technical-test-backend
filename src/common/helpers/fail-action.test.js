import { describe, test, expect } from 'vitest'

import { failAction } from './fail-action.js'

describe('failAction', () => {
  test('rethrows the validation error so Hapi answers with it', () => {
    const error = new Error('invalid payload')

    expect(() => failAction({}, {}, error)).toThrow(error)
  })
})
